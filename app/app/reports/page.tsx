import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ULTRASOUND_TYPES } from "@/lib/ultrasound/catalog";
import ReportsList, { type ReportsListRow } from "@/components/ReportsList";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  patient_name: string;
  exam_date: string | null;
  ultrasound_type: string;
  updated_at: string;
};

export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data, error } = await supabase
    .from("reports")
    .select("id, patient_name, exam_date, ultrasound_type, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="mt-3 text-sm text-rose-700">{error.message}</p>
      </div>
    );
  }

  const typeLabel = new Map<string, string>(
    ULTRASOUND_TYPES.map((t) => [t.value, t.label] as [string, string])
  );

  const rows: ReportsListRow[] = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    patientName: r.patient_name,
    examDate: r.exam_date,
    ultrasoundTypeLabel: typeLabel.get(r.ultrasound_type) ?? r.ultrasound_type,
    updatedAt: r.updated_at
  }));

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div>
          <h1 className="text-lg font-semibold">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">Latest 200 reports.</p>
        </div>
        <Link
          href="/app/reports/new"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          New report
        </Link>
      </div>

      <ReportsList initialRows={rows} />
    </div>
  );
}
