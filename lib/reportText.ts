export type ReportForText = {
  hospitalName?: string;
  doctorName?: string;
  licenseNo?: string;
  patientName: string;
  chartNo: string;
  rrn: string;
  ageText: string;
  sex: string;
  examDate: string;
  clinicalHistory: string;
  findings: string;
  impression: string;
  recommendations?: string;
};

export type PlainTextReportOptions = {
  includeTitle?: boolean;
  includeRecommendations?: boolean;
  title?: string;
};

export function buildPlainTextReport(r: ReportForText, opts: PlainTextReportOptions = {}) {
  const includeTitle = opts.includeTitle ?? true;
  const includeRecommendations = opts.includeRecommendations ?? true;
  const title = opts.title ?? "Ultrasound report";

  const lines: string[] = [];
  if (includeTitle) lines.push(title);
  lines.push(
    r.hospitalName ? r.hospitalName : "",
    "",
    `Patient: ${r.patientName}`,
    `Chart No: ${r.chartNo}`,
    `RRN: ${r.rrn}`,
    `Age/Sex: ${r.ageText}${r.ageText && r.sex ? " / " : ""}${r.sex}`,
    `Exam date: ${r.examDate}`,
    "",
    "Clinical history",
    r.clinicalHistory || "",
    "",
    "Findings",
    r.findings || "",
    "",
    "Impression",
    r.impression || ""
  );

  if (includeRecommendations) {
    lines.push("", "Recommendations", r.recommendations || "");
  }

  lines.push(
    "",
    r.doctorName || r.licenseNo ? `Signed: ${[r.doctorName, r.licenseNo].filter(Boolean).join(" / ")}` : ""
  );

  const collapsed = lines.filter((l, idx, arr) => !(l === "" && arr[idx - 1] === "")); // collapse repeated blanks
  return collapsed.join("\n").trim() + "\n";
}
