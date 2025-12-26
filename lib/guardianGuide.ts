export type GuardianGuideTerm = {
  title: string;
  description: string;
};

export type GuardianGuide = {
  intro: string;
  highlights: string[];
  terms: GuardianGuideTerm[];
  reassurance: string[];
};

type GuideRule = {
  id: string;
  patterns: RegExp[];
  text: string;
};

type TermGuide = {
  id: string;
  patterns: RegExp[];
  title: string;
  description: string;
};

const highlightRules: GuideRule[] = [
  {
    id: "normal",
    patterns: [
      /특이\s*소견\s*없/i,
      /특별한\s*이상\s*없/i,
      /정상\s*(범위|소견)/i,
      /\bnormal\b/i,
      /unremarkable/i,
      /within\s+normal\s+limits/i,
      /no\s+(abnormal|evidence|sign|finding)/i
    ],
    text: "기록에 '정상' 또는 '특이 소견 없음'에 가까운 표현이 있어요. 뚜렷한 이상이 보이지 않는다는 뜻으로 쓰입니다."
  },
  {
    id: "follow-up",
    patterns: [/추적/i, /재검/i, /경과\s*관찰/i, /follow[- ]?up/i, /recheck/i, /monitor/i, /surveillance/i, /f\/u/i],
    text: "경과 관찰이나 재검 안내가 보일 수 있어요. 아이의 증상과 함께 시간을 두고 다시 확인하는 과정입니다."
  },
  {
    id: "compare",
    patterns: [/비교/i, /이전/i, /previous/i, /prior/i, /compared/i, /comparison/i],
    text: "이전 검사와 비교했다는 표현이 있으면, 변화가 있는지 살펴본다는 뜻이에요."
  }
];

const termGuides: TermGuide[] = [
  {
    id: "nodule",
    patterns: [/결절/i, /종괴/i, /혹/i, /\bnodule\b/i, /\bmass\b/i, /\blesion\b/i],
    title: "결절/혹",
    description: "작은 혹이나 덩이를 말해요. 크기와 모양을 보고 필요하면 경과를 살펴봅니다."
  },
  {
    id: "cyst",
    patterns: [/낭종/i, /물혹/i, /\bcyst\b/i],
    title: "낭종/물혹",
    description: "액체가 차 있는 작은 주머니를 뜻해요. 대부분은 지켜보며 크기를 확인합니다."
  },
  {
    id: "inflammation",
    patterns: [/염증/i, /감염/i, /inflamm/i, /infection/i],
    title: "염증/자극",
    description: "조직이 붓거나 자극받은 상태를 의미해요. 증상과 함께 치료 여부를 결정합니다."
  },
  {
    id: "fluid",
    patterns: [/액체/i, /저류/i, /삼출/i, /복수/i, /흉수/i, /\bfluid\b/i, /effusion/i, /ascites/i, /collection/i],
    title: "액체/삼출",
    description: "액체가 모였다는 뜻으로, 위치와 양을 살피며 필요한 조치를 결정해요."
  },
  {
    id: "enlarged",
    patterns: [/비대/i, /확장/i, /enlarged/i, /dilat/i, /dilation/i, /dilated/i],
    title: "확장/비대",
    description: "관이나 장기의 크기가 커져 보인다는 의미로, 원인을 확인하며 경과를 봐요."
  },
  {
    id: "lymph",
    patterns: [/림프/i, /lymph/i],
    title: "림프절",
    description: "면역과 관련된 작은 구조예요. 크기와 모양을 살피며 의미를 판단합니다."
  },
  {
    id: "stone",
    patterns: [/결석/i, /석회/i, /calcification/i, /\bstone\b/i],
    title: "결석/석회",
    description: "단단하게 굳은 부분을 의미해요. 위치와 크기를 확인해요."
  }
];

const defaultReassurance = [
  "초음파는 방사선이 없는 안전한 검사예요.",
  "대부분은 경과를 보며 차분히 결정합니다.",
  "궁금한 점은 진료실에서 편하게 질문해 주세요."
];

const defaultIntro =
  "이 안내서는 소견과 판독 요약을 보호자분이 이해하기 쉽게 풀어쓴 참고 자료예요. 최종 설명은 담당의가 드립니다.";

function matchesAny(patterns: RegExp[], text: string) {
  return patterns.some((pattern) => pattern.test(text));
}

export function buildGuardianGuide(findings?: string | null, impression?: string | null): GuardianGuide {
  const combined = `${findings ?? ""}\n${impression ?? ""}`.trim();

  if (!combined) {
    return {
      intro: defaultIntro,
      highlights: [
        "검사 기록이 아직 입력되지 않았습니다. 진료실에서 담당의 설명을 먼저 확인해 주세요.",
        "궁금한 점을 미리 적어 두었다가 편하게 질문해 주세요."
      ],
      terms: [],
      reassurance: defaultReassurance
    };
  }

  const highlights = highlightRules.filter((rule) => matchesAny(rule.patterns, combined)).map((rule) => rule.text);

  if (highlights.length === 0) {
    highlights.push(
      "소견은 초음파에서 관찰된 사실을 적는 부분이에요.",
      "판독 요약은 소견의 의미를 간단히 정리한 부분입니다."
    );
  }

  const terms = termGuides
    .filter((term) => matchesAny(term.patterns, combined))
    .slice(0, 4)
    .map((term) => ({ title: term.title, description: term.description }));

  return {
    intro: defaultIntro,
    highlights,
    terms,
    reassurance: defaultReassurance
  };
}
