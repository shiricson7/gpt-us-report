import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  ultrasoundType?: string;
  clinicalHistory?: string;
  findings?: string;
  impression?: string;
};

function normalizeComparable(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim()
    .toLowerCase();
}

function extractAfterLastHeader(text: string, header: string) {
  const re = new RegExp(`\\b${header}\\b\\s*[:\\-–—]?\\s*`, "gi");
  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = re.exec(text))) last = match;
  if (!last) return text;
  return text.slice((last.index ?? 0) + last[0].length).trim();
}

function cleanImpression(impression: string, findings: string) {
  let next = impression.replace(/\r\n/g, "\n").trim();
  if (!next) return "";

  next = extractAfterLastHeader(next, "impression");
  next = next.replace(/^\s*findings\s*[:\\-–—]?\s*/i, "").trim();

  const nf = normalizeComparable(findings);
  const ni = normalizeComparable(next);
  if (!ni) return "";

  if (nf && ni === nf) return "";

  if (nf && nf.length >= 140) {
    const prefix = nf.slice(0, 140);
    if (prefix && ni.startsWith(prefix)) return "";
  }

  return next;
}

function redactIdentifiers(text: string) {
  return (
    text
      .replace(/\b\d{6}-\d{7}\b/g, "[REDACTED]")
      .replace(/\b\d{8,}\b/g, "[REDACTED]")
  );
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new NextResponse("Missing OPENAI_API_KEY", { status: 500 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const ultrasoundType = String(body.ultrasoundType ?? "").trim();
  const clinicalHistory = redactIdentifiers(String(body.clinicalHistory ?? "").trim());
  const findings = redactIdentifiers(String(body.findings ?? "").trim());
  const impression = String(body.impression ?? "").trim();
  if (!findings) {
    return new NextResponse("findings is required", { status: 400 });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const system = [
    "You are a board-certified radiologist.",
    "Rewrite the provided ultrasound Findings into a polished radiology-style report.",
    "Also produce a concise Impression consistent with the Findings and Clinical history.",
    "Impression must NOT repeat the Findings; it should be a brief conclusion (1–3 sentences).",
    "Use professional medical terminology and plain sentences.",
    "Do NOT use special symbols or bullets (no '-', '*', '•', '#', ':', ';').",
    "Do NOT add patient identifiers.",
    "Return ONLY valid JSON with keys: findings, impression."
  ].join("\n");

  const userPrompt = [
    ultrasoundType ? `Ultrasound type\n${ultrasoundType}` : "",
    clinicalHistory ? `Clinical history\n${clinicalHistory}` : "",
    `Findings draft\n${findings}`
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    return new NextResponse(text || "OpenAI request failed", { status: 502 });
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(content) as { findings?: string; impression?: string };
    const nextFindings = String(parsed.findings ?? findings).trim() || findings;
    const rawImpression = String(parsed.impression ?? "").trim();
    const nextImpression = cleanImpression(rawImpression, nextFindings) || impression;

    return NextResponse.json({ findings: nextFindings, impression: nextImpression });
  } catch {
    return new NextResponse("OpenAI returned non-JSON output", { status: 502 });
  }
}
