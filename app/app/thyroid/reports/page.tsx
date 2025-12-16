import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ThyroidReportsList, { type ThyroidReportsListRow } from "@/components/ThyroidReportsList";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  patient_name: string;
  exam_date: string | null;
  highest_k_tirads: number | null;
  updated_at: string;
};

export default async function ThyroidReportsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("thyroid_reports")
    .select("id, patient_name, exam_date, highest_k_tirads, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Thyroid reports</h1>
        <p className="mt-3 text-sm text-rose-700">{error.message}</p>
      </div>
    );
  }

  const rows: ThyroidReportsListRow[] = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    patientName: r.patient_name,
    examDate: r.exam_date,
    highestKtirads: r.highest_k_tirads ?? 0,
    updatedAt: r.updated_at
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">Thyroid reports</h1>
          <p className="mt-1 text-sm text-slate-600">Latest 200 thyroid reports.</p>
        </div>
        <Link
          href="/app/thyroid/reports/new"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New thyroid report
        </Link>
      </div>

      <ThyroidReportsList initialRows={rows} />
    </div>
  );
}
