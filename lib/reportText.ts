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

export function buildPlainTextReport(r: ReportForText) {
  const lines = [
    "Ultrasound report",
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
    r.impression || "",
    "",
    "Recommendations",
    r.recommendations || "",
    "",
    r.doctorName || r.licenseNo ? `Signed: ${[r.doctorName, r.licenseNo].filter(Boolean).join(" / ")}` : ""
  ].filter((l, idx, arr) => !(l === "" && arr[idx - 1] === "")); // collapse repeated blanks

  return lines.join("\n").trim() + "\n";
}
