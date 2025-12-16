import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  clinicalInfo?: string;
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
  const re = new RegExp(`\\b${header}\\b\\s*[:\\-\\s]*`, "gi");
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
  next = next.replace(/^\\s*findings\\s*[:\\-\\s]*/i, "").trim();

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

function diagnosisOnly(text: string) {
  const joined = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(", ")
    .trim();
  return joined.replace(/[.。]+$/g, "").trim();
}

function redactIdentifiers(text: string) {
  return (
    text
      .replace(/\b\d{6}-\d{7}\b/g, "[REDACTED]")
      .replace(/\b\d{8,}\b/g, "[REDACTED]")
  );
}

function formatReportText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\. +/g, ".\n")
    .replace(/。\s+/g, "。\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

  const clinicalInfo = redactIdentifiers(String(body.clinicalInfo ?? "").trim());
  const imageContext = redactIdentifiers(String(body.imageContext ?? "").trim());
  const imagePaths = Array.isArray(body.imagePaths) ? body.imagePaths.map((p) => String(p).trim()).filter(Boolean) : [];

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
    "You are a board-certified radiologist specialized in thyroid ultrasound.",
    "Analyze the provided thyroid ultrasound images and classify visible thyroid nodules using K-TIRADS (Korean Thyroid Imaging Reporting and Data System).",
    "If laterality is not clear, use side='unknown'. If a lesion is in the isthmus, use side='isthmus'.",
    "For each nodule, estimate size in mm when possible and extract features: composition, echogenicity, shape, margin, echogenic foci.",
    "Assign kTirads category as an integer 1-5 (use 1 when no nodule is seen for that side).",
    "Generate hospital-grade draft Findings and a short Impression.",
    "Impression must be diagnosis names only (no explanation), very short, preferably 1 line.",
    "Separate multiple diagnoses with commas. Do NOT write full sentences.",
    "Impression must not repeat Findings.",
    "Formatting requirement: after every '.' end the sentence and start a new line. Use blank lines to separate paragraphs when helpful.",
    "Do not include any patient identifiers.",
    "Return ONLY valid JSON with keys: imageAssignments, nodules, findings, impression.",
    "imageAssignments is an array of { filename, side } where side is one of left|right|isthmus|unknown.",
    "nodules is an array where each item includes: side, location, sizeMm, composition, echogenicity, shape, margin, echogenicFoci, kTirads, rationale, confidence."
  ].join("\n");

  const userText = [
    clinicalInfo ? `Clinical information:\n${clinicalInfo}` : "",
    imageContext ? `Image context:\n${imageContext}` : "",
    "Task:\n- Detect thyroid nodules if present.\n- Classify with K-TIRADS.\n- Provide structured output.\n"
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
    const parsed = JSON.parse(raw) as {
      imageAssignments?: unknown;
      nodules?: unknown;
      findings?: unknown;
      impression?: unknown;
    };

    const findings = formatReportText(String(parsed.findings ?? ""));
    const impressionRaw = String(parsed.impression ?? "").trim();
    const impression = diagnosisOnly(cleanImpression(impressionRaw, findings));

    const imageAssignments = Array.isArray(parsed.imageAssignments)
      ? (parsed.imageAssignments as Array<{ filename?: unknown; side?: unknown }>).map((a) => ({
          filename: String(a.filename ?? "").trim(),
          side: String(a.side ?? "").trim()
        }))
      : [];

    const nodules = Array.isArray(parsed.nodules) ? parsed.nodules : [];

    return NextResponse.json({
      imageAssignments,
      nodules,
      findings,
      impression
    });
  } catch {
    return new NextResponse("OpenAI returned non-JSON output", { status: 502 });
  }
}


