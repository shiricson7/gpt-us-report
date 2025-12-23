import { redirect } from "next/navigation";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PrintToolbar from "@/components/PrintToolbar";

const reportSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

const reportSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap"
});

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
  const ageSex = `${report.age_text}${report.age_text && report.sex ? " / " : ""}${report.sex}`;

  return (
    <div className={`mx-auto max-w-[210mm] print:max-w-none ${reportSerif.className} text-slate-900`}>
      <div className={reportSans.className}>
        <PrintToolbar />
      </div>
      <article className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
        <header className="border-b border-slate-200 pb-5 print:border-slate-300">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className={`${reportSans.className} text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500`}>
                Radiology Report
              </div>
              <h1 className={`${reportSans.className} mt-2 text-2xl font-semibold tracking-tight print:text-3xl`}>
                Ultrasound Report
              </h1>
              {profile?.hospital_name ? (
                <div className={`${reportSans.className} mt-2 text-sm font-semibold text-slate-700`}>{profile.hospital_name}</div>
              ) : null}
            </div>
            <div className="text-right">
              <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>Exam date</div>
              <div className="mt-1 text-sm font-semibold text-slate-700">{examDate}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-200/70 px-3 py-2 print:border-slate-300">
              <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>Patient</div>
              <div className="mt-1 font-semibold text-slate-800">{report.patient_name}</div>
            </div>
            <div className="rounded-lg border border-slate-200/70 px-3 py-2 print:border-slate-300">
              <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>Chart No</div>
              <div className="mt-1 font-semibold text-slate-800">{report.chart_no}</div>
            </div>
            <div className="rounded-lg border border-slate-200/70 px-3 py-2 print:border-slate-300">
              <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>RRN</div>
              <div className="mt-1 font-semibold text-slate-800">{report.rrn}</div>
            </div>
            <div className="rounded-lg border border-slate-200/70 px-3 py-2 print:border-slate-300">
              <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>Age / Sex</div>
              <div className="mt-1 font-semibold text-slate-800">{ageSex}</div>
            </div>
          </div>
        </header>

        <div className="mt-6 space-y-6 text-[15px] leading-7">
          <section className="rounded-xl border border-slate-200/70 px-4 py-3 print:border-slate-300">
            <div className={`${reportSans.className} text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500`}>
              Clinical history
            </div>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{(report.clinical_history || "").trim()}</div>
          </section>

          <section className="rounded-xl border border-slate-200/70 px-4 py-3 print:border-slate-300">
            <div className={`${reportSans.className} text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500`}>
              Findings
            </div>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{(report.findings || "").trim()}</div>
          </section>

          <section className="rounded-xl border border-slate-300 bg-slate-50/60 px-4 py-3 print:border-slate-300 print:bg-transparent">
            <div className={`${reportSans.className} text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-500`}>
              Impression
            </div>
            <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7">{(report.impression || "").trim()}</div>
          </section>
        </div>

        {profile?.doctor_name || profile?.license_no ? (
          <div className="mt-10 border-t border-slate-200 pt-4 text-sm print:border-slate-300">
            <div className={`${reportSans.className} text-[11px] uppercase tracking-[0.2em] text-slate-500`}>Signed</div>
            <div className="mt-2 font-semibold text-slate-800">
              {[profile?.doctor_name, profile?.license_no].filter(Boolean).join(" / ")}
            </div>
          </div>
        ) : null}
      </article>
    </div>
  );
}
