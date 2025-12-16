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

  if (args.kTirads === 1) return "결절 없음. 임상적으로 필요 시 추적 초음파 고려.";

  if (args.kTirads === 2) {
    return "K-TIRADS 2(benign). FNA 불필요. 임상/추적 필요 시 follow-up US 고려.";
  }

  if (args.kTirads === 3) {
    if (sizeMm == null) return "K-TIRADS 3(low suspicion). 크기 정보 부족: 임상/영상 소견에 따라 FNA 또는 follow-up US 고려.";
    if (sizeMm >= 20) return "K-TIRADS 3(low suspicion). ≥20 mm: FNA 권고.";
    if (sizeMm >= 15) return "K-TIRADS 3(low suspicion). 15–19 mm: follow-up US 권고.";
    return "K-TIRADS 3(low suspicion). <15 mm: 임상적으로 필요 시 follow-up US 고려.";
  }

  if (args.kTirads === 4) {
    if (sizeMm == null) return "K-TIRADS 4(intermediate suspicion). 크기 정보 부족: 임상/영상 소견에 따라 FNA 또는 follow-up US 고려.";
    if (sizeMm >= 15) return "K-TIRADS 4(intermediate suspicion). ≥15 mm: FNA 권고.";
    if (sizeMm >= 10) return "K-TIRADS 4(intermediate suspicion). 10–14 mm: follow-up US 권고.";
    return "K-TIRADS 4(intermediate suspicion). <10 mm: 임상적으로 필요 시 follow-up US 고려.";
  }

  if (args.kTirads === 5) {
    if (sizeMm == null) return "K-TIRADS 5(high suspicion). 크기 정보 부족: 임상/영상 소견에 따라 FNA 또는 follow-up US 고려.";
    if (sizeMm >= 10) return "K-TIRADS 5(high suspicion). ≥10 mm: FNA 권고.";
    if (sizeMm >= 5) return "K-TIRADS 5(high suspicion). 5–9 mm: 임상적으로 FNA 고려 또는 close follow-up US 권고.";
    return "K-TIRADS 5(high suspicion). <5 mm: close follow-up US 권고.";
  }

  return "임상적으로 적절한 추적/추가 평가(FNA, follow-up US 등)를 고려.";
}
