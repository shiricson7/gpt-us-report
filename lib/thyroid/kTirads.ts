export type KtiradsCategory = 1 | 2 | 3 | 4 | 5;

export function coerceKtiradsCategory(value: unknown): KtiradsCategory | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return null;
}

export function recommendKtiradsManagement(args: {
  kTirads: KtiradsCategory;
  sizeMm: number | null;
}) {
  const sizeMm = typeof args.sizeMm === "number" && Number.isFinite(args.sizeMm) ? args.sizeMm : null;

  if (args.kTirads === 1) return "결절 없음. 임상적으로 필요 시 추적 초음파.";

  if (args.kTirads === 2) {
    return "K-TIRADS 2(양성 의심). 일반적으로 FNA 비권고. 증상/성장/임상 의심 시 추적 초음파 고려.";
  }

  if (args.kTirads === 3) {
    if (sizeMm == null) return "K-TIRADS 3(저위험). 크기 정보에 따라 FNA/추적을 결정.";
    if (sizeMm >= 20) return "K-TIRADS 3(저위험). ≥20mm: FNA 고려.";
    if (sizeMm >= 15) return "K-TIRADS 3(저위험). 15–19mm: 추적 초음파 고려.";
    return "K-TIRADS 3(저위험). <15mm: 임상적으로 필요 시 추적.";
  }

  if (args.kTirads === 4) {
    if (sizeMm == null) return "K-TIRADS 4(중등도 위험). 크기 정보에 따라 FNA/추적을 결정.";
    if (sizeMm >= 15) return "K-TIRADS 4(중등도 위험). ≥15mm: FNA 권고/고려.";
    if (sizeMm >= 10) return "K-TIRADS 4(중등도 위험). 10–14mm: 추적 초음파 고려.";
    return "K-TIRADS 4(중등도 위험). <10mm: 임상적으로 필요 시 추적.";
  }

  if (args.kTirads === 5) {
    if (sizeMm == null) return "K-TIRADS 5(고위험). 크기/임상 위험도에 따라 FNA/추적을 결정.";
    if (sizeMm >= 10) return "K-TIRADS 5(고위험). ≥10mm: FNA 권고.";
    if (sizeMm >= 5) return "K-TIRADS 5(고위험). 5–9mm: 임상 위험도에 따라 FNA 또는 추적 고려.";
    return "K-TIRADS 5(고위험). <5mm: 추적 초음파 고려.";
  }

  return "추적 계획을 결정하기 위해 임상 정보와 함께 평가 필요.";
}

