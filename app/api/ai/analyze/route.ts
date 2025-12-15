import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  ultrasoundType?: string;
  clinicalHistory?: string;
  imageContext?: string;
  imagePaths?: string[];
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
  if (nf && nf.length >= 160) {
    const prefix = nf.slice(0, 160);
    if (prefix && ni.startsWith(prefix)) return "";
  }
  return next;
}

function redactIdentifiers(text: string) {
  return (
    text
      // Korean RRN like YYMMDD-XXXXXXX
      .replace(/\b\d{6}-\d{7}\b/g, "[REDACTED]")
      // Long digit sequences (chart numbers, phone numbers, etc.)
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
  if (!apiKey) return new NextResponse("Missing OPENAI_API_KEY", { status: 500 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON body", { status: 400 });
  }

  const ultrasoundType = String(body.ultrasoundType ?? "").trim();
  const clinicalHistory = redactIdentifiers(String(body.clinicalHistory ?? "").trim());
  const imageContext = redactIdentifiers(String(body.imageContext ?? "").trim());
  const imagePaths = Array.isArray(body.imagePaths) ? body.imagePaths.map((p) => String(p).trim()).filter(Boolean) : [];

  if (!ultrasoundType) return new NextResponse("ultrasoundType is required", { status: 400 });
  if (!imagePaths.length) return new NextResponse("imagePaths is required", { status: 400 });
  if (imagePaths.length > 12) return new NextResponse("Too many images (max 12).", { status: 400 });

  const signedUrls: Array<{ filename: string; url: string }> = [];
  for (const path of imagePaths) {
    const { data, error } = await supabase.storage.from("ultrasound-images").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      return new NextResponse(error?.message || "Failed to sign image URL", { status: 400 });
    }
    signedUrls.push({ filename: path.split("/").slice(-1)[0] || "image.jpg", url: data.signedUrl });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const system = [
    "You are a board-certified radiologist.",
    "Analyze the provided ultrasound images in the context of the ultrasound type and clinical history.",
    "Write professional radiology-style Findings and a concise Impression consistent with the images and clinical history.",
    "Also provide Recommendations/plan based on the Impression (follow-up, additional imaging, referral, etc.).",
    "Impression must NOT repeat the Findings; it should be a brief conclusion (1–3 sentences).",
    "Use professional medical terminology and plain sentences.",
    "Do NOT add patient identifiers.",
    "Return ONLY valid JSON with keys: findings, impression, recommendations."
  ].join("\n");

  const userText = [
    `Ultrasound type:\n${ultrasoundType}`,
    clinicalHistory ? `Clinical history:\n${clinicalHistory}` : "",
    imageContext ? `Image context:\n${imageContext}` : "",
    "Task:\n- Review the images.\n- Draft Findings, Impression, and Recommendations.\n"
  ]
    .filter(Boolean)
    .join("\n\n");

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: userText }];

  for (const img of signedUrls) {
    content.push({ type: "text", text: `Image filename: ${img.filename}` });
    content.push({ type: "image_url", image_url: { url: img.url } });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content }
      ]
    })
  });

  if (!res.ok) return new NextResponse((await res.text()) || "OpenAI request failed", { status: 502 });

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(raw) as { findings?: unknown; impression?: unknown; recommendations?: unknown };

    const findings = String(parsed.findings ?? "").trim();
    const impressionRaw = String(parsed.impression ?? "").trim();
    const impression = cleanImpression(impressionRaw, findings);
    const recommendations = String(parsed.recommendations ?? "").trim();

    return NextResponse.json({ findings, impression, recommendations });
  } catch {
    return new NextResponse("OpenAI returned non-JSON output", { status: 502 });
  }
}
