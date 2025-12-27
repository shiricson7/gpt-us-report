import { buildGuardianGuide } from "@/lib/guardianGuide";

export type GuardianSummary = {
  summary: string;
  keyPoints: string[];
  nextSteps: string[];
  reassurance: string[];
};

type GuardianSummaryFallback = {
  summary: GuardianSummary;
  source: "fallback";
};

type GuardianSummaryResult = {
  summary: GuardianSummary;
  source: "ai" | "fallback";
};

const defaultNextSteps = [
  "추가 검사나 치료 계획은 담당의와 상의해 주세요.",
  "증상이 계속되거나 걱정되는 점이 있으면 진료실에 알려 주세요."
];

function redactIdentifiers(text: string) {
  return text
    .replace(/\b\d{6}-\d{7}\b/g, "[REDACTED]")
    .replace(/\b\d{8,}\b/g, "[REDACTED]");
}

function cleanText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n+/g, "\n").trim();
}

function cleanLine(value: string) {
  return value.replace(/^[\s*-•\d.)]+/g, "").replace(/\s+/g, " ").trim();
}

function normalizeList(value: unknown, fallback: string[], maxItems: number) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n+/) : [];
  const cleaned = raw.map((item) => cleanLine(String(item))).filter(Boolean);
  const list = cleaned.length ? cleaned : fallback;
  return list.slice(0, maxItems);
}

function normalizeSummary(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = cleanText(value);
  return cleaned || fallback;
}

function buildFallbackSummary(findings?: string | null, impression?: string | null): GuardianSummaryFallback {
  const guide = buildGuardianGuide(findings, impression);
  const nextSteps =
    guide.terms.length > 0
      ? guide.terms.map((term) => `${term.title}: ${term.description}`)
      : defaultNextSteps;

  return {
    summary: {
      summary: guide.intro,
      keyPoints: guide.highlights.slice(0, 4),
      nextSteps: nextSteps.slice(0, 3),
      reassurance: guide.reassurance.slice(0, 3)
    },
    source: "fallback"
  };
}

export async function buildGuardianSummary(
  findings?: string | null,
  impression?: string | null
): Promise<GuardianSummaryResult> {
  const cleanFindings = cleanText(redactIdentifiers(String(findings ?? "")));
  const cleanImpression = cleanText(redactIdentifiers(String(impression ?? "")));
  const fallback = buildFallbackSummary(cleanFindings, cleanImpression);

  if (!cleanFindings && !cleanImpression) {
    return fallback;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallback;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const system = [
    "너는 소아 영상의학과 전문의이며 보호자에게 쉬운 설명을 제공한다.",
    "Findings와 Impression에 근거해 보호자용 안내문을 작성한다.",
    "가능하면 전부 한글로 작성하고, 쉬운 단어와 짧은 문장을 사용한다.",
    "새로운 진단이나 추측을 추가하지 않는다.",
    "내용은 A4 한 장 분량으로 간결하게 유지한다.",
    "JSON 외의 다른 형식으로 출력하지 않는다.",
    "JSON 키는 summary, keyPoints, nextSteps, reassurance만 허용한다.",
    "summary는 2~3문장으로 작성한다.",
    "keyPoints는 3~4개 항목으로 작성한다.",
    "nextSteps는 2~3개 항목으로 작성한다.",
    "reassurance는 2개 항목으로 작성한다.",
    "각 항목에는 글머리표나 숫자를 넣지 않는다."
  ].join("\n");

  const userPrompt = [
    cleanFindings ? `Findings\n${cleanFindings}` : "",
    cleanImpression ? `Impression\n${cleanImpression}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
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
      return fallback;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content) as Partial<GuardianSummary>;

    const summary = normalizeSummary(parsed.summary, fallback.summary.summary);
    const keyPoints = normalizeList(parsed.keyPoints, fallback.summary.keyPoints, 4);
    const nextSteps = normalizeList(parsed.nextSteps, fallback.summary.nextSteps, 3);
    const reassurance = normalizeList(parsed.reassurance, fallback.summary.reassurance, 3);

    return {
      summary: { summary, keyPoints, nextSteps, reassurance },
      source: "ai"
    };
  } catch {
    return fallback;
  }
}
