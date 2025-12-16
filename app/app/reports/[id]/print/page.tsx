import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PrintToolbar from "@/components/PrintToolbar";
import { buildPlainTextReport } from "@/lib/reportText";

export const dynamic = "force-dynamic";

type ProfileRow = { hospital_name: string | null; doctor_name: string | null; license_no: string | null };
type ReportRow = {
  patient_name: string;
  chart_no: string;
  rrn: string;
  exam_date: string | null;
  age_text: string;
  sex: string;
  clinical_history: string;
  findings: string;
  impression: string;
  recommendations: string | null;
};

export default async function ReportPrintPage({ params }: { params: Promise<{ id: string }> }) {
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
    .from("reports")
    .select("patient_name, chart_no, rrn, exam_date, age_text, sex, clinical_history, findings, impression, recommendations")
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

  const examDate = report.exam_date ?? new Date().toISOString().slice(0, 10);
  const text = buildPlainTextReport({
    hospitalName: profile?.hospital_name ?? undefined,
    doctorName: profile?.doctor_name ?? undefined,
    licenseNo: profile?.license_no ?? undefined,
    patientName: report.patient_name,
    chartNo: report.chart_no,
    rrn: report.rrn,
    ageText: report.age_text,
    sex: report.sex,
    examDate,
    clinicalHistory: report.clinical_history,
    findings: report.findings,
    impression: report.impression,
    recommendations: report.recommendations ?? ""
  });

  return (
    <div className="mx-auto max-w-[210mm] print:max-w-none">
      <PrintToolbar />
      <pre className="whitespace-pre-wrap rounded-2xl border border-white/60 bg-white/70 p-6 text-sm leading-6 shadow-sm backdrop-blur print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        {text}
      </pre>
    </div>
  );
}
