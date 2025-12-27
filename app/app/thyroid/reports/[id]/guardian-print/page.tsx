import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PrintToolbar from "@/components/PrintToolbar";
import GuardianSummarySheet from "@/components/GuardianSummarySheet";
import { buildGuardianSummary } from "@/lib/guardianSummary";

export const dynamic = "force-dynamic";

type ProfileRow = { hospital_name: string | null };
type ReportRow = {
  patient_name: string;
  exam_date: string | null;
  age_text: string;
  sex: string;
  findings: string;
  impression: string;
};

export default async function ThyroidGuardianPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("hospital_name")
    .eq("user_id", user.id)
    .maybeSingle<ProfileRow>();

  const { data: report, error } = await supabase
    .from("thyroid_reports")
    .select("patient_name, exam_date, age_text, sex, findings, impression")
    .eq("id", id)
    .maybeSingle<ReportRow>();

  if (error) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">보호자용 출력물</h1>
        <p className="mt-3 text-sm text-rose-700">{error.message}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">보호자용 출력물</h1>
        <p className="mt-3 text-sm text-slate-700">출력할 보고서를 찾지 못했습니다.</p>
      </div>
    );
  }

  const examDate = report.exam_date ?? new Date().toISOString().slice(0, 10);
  const ageSex = `${report.age_text}${report.age_text && report.sex ? " / " : ""}${report.sex}`;
  const { summary } = await buildGuardianSummary(report.findings, report.impression);

  return (
    <div className="mx-auto max-w-[210mm] print:max-w-none">
      <PrintToolbar />
      <GuardianSummarySheet
        summary={summary}
        patientName={report.patient_name}
        ageSex={ageSex}
        examDate={examDate}
        hospitalName={profile?.hospital_name}
        title="보호자용 갑상선 초음파 요약"
        subtitle="검사 결과를 보호자 관점에서 부드럽게 정리했어요."
      />
    </div>
  );
}
