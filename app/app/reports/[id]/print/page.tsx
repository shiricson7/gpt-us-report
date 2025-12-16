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
  clinical_history: string;
  findings: string;
  impression: string;
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
    .select("patient_name, chart_no, rrn, exam_date, age_text, sex, clinical_history, findings, impression")
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

  return (
    <div className="mx-auto max-w-[210mm] print:max-w-none">
      <PrintToolbar />
      <h1 className="mb-4 text-2xl font-bold tracking-tight print:text-4xl">Ultrasound report</h1>
      <article className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <div className="text-sm leading-6">
          {profile?.hospital_name ? <div className="font-semibold">{profile.hospital_name}</div> : null}
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            <div>{`Patient: ${report.patient_name}`}</div>
            <div>{`Chart No: ${report.chart_no}`}</div>
            <div>{`RRN: ${report.rrn}`}</div>
            <div>{`Age/Sex: ${report.age_text}${report.age_text && report.sex ? " / " : ""}${report.sex}`}</div>
            <div>{`Exam date: ${examDate}`}</div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section className="border-t border-slate-200 pt-4">
            <h2 className="text-base font-bold tracking-tight print:text-lg">Clinical history</h2>
            <div className="mt-2 whitespace-pre-wrap text-base leading-7">{(report.clinical_history || "").trim()}</div>
          </section>

          <section className="border-t border-slate-200 pt-4">
            <h2 className="text-base font-bold tracking-tight print:text-lg">Findings</h2>
            <div className="mt-2 whitespace-pre-wrap text-base leading-7">{(report.findings || "").trim()}</div>
          </section>

          <section className="border-t border-slate-200 pt-4">
            <h2 className="text-base font-bold tracking-tight print:text-lg">Impression</h2>
            <div className="mt-2 whitespace-pre-wrap text-base leading-7">{(report.impression || "").trim()}</div>
          </section>
        </div>

        {profile?.doctor_name || profile?.license_no ? (
          <div className="mt-10 text-sm leading-6">{`Signed: ${[profile?.doctor_name, profile?.license_no]
            .filter(Boolean)
            .join(" / ")}`}</div>
        ) : null}
      </article>
    </div>
  );
}
