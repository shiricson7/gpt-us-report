import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PrintToolbar from "@/components/PrintToolbar";

export const dynamic = "force-dynamic";

type ProfileRow = { hospital_name: string | null; doctor_name: string | null; license_no: string | null };
type ReportRow = {
  patient_name: string;
  chart_no: string;
  rrn: string;
  exam_date: string | null;
  age_text: string;
  sex: string;
  clinical_info: string;
  findings: string;
  impression: string;
  recommendations: string;
};

export default async function ThyroidReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("hospital_name, doctor_name, license_no")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const { data: report, error } = await supabase
    .from("thyroid_reports")
    .select("patient_name, chart_no, rrn, exam_date, age_text, sex, clinical_info, findings, impression, recommendations")
    .eq("id", id)
    .maybeSingle<ReportRow>();

  if (error) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Print preview</h1>
        <p className="mt-3 text-sm text-rose-700">{error.message}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Print preview</h1>
        <p className="mt-3 text-sm text-slate-700">Report not found.</p>
      </div>
    );
  }

  const headerLines = [
    "Thyroid ultrasound report",
    profile?.hospital_name ? profile.hospital_name : "",
    "",
    `Patient: ${report.patient_name}`,
    `Chart No: ${report.chart_no}`,
    `RRN: ${report.rrn}`,
    `Age/Sex: ${report.age_text}${report.age_text && report.sex ? " / " : ""}${report.sex}`,
    `Exam date: ${report.exam_date ?? new Date().toISOString().slice(0, 10)}`,
    ""
  ].filter(Boolean);

  const text = [
    ...headerLines,
    "Clinical information",
    report.clinical_info.trim(),
    "",
    "Findings",
    report.findings.trim(),
    "",
    "Impression",
    report.impression.trim(),
    "",
    "K-TIRADS recommendations",
    report.recommendations.trim(),
    "",
    profile?.doctor_name || profile?.license_no
      ? `Signed: ${[profile?.doctor_name, profile?.license_no].filter(Boolean).join(" / ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="mx-auto max-w-[210mm] print:max-w-none">
      <PrintToolbar />
      <pre className="whitespace-pre-wrap rounded-2xl border border-white/60 bg-white/70 p-6 text-sm leading-6 shadow-sm backdrop-blur print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        {text}
      </pre>
    </div>
  );
}
