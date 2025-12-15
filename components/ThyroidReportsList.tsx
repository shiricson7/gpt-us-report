"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errorMessage";

export type ThyroidReportsListRow = {
  id: string;
  patientName: string;
  examDate: string | null;
  highestKtirads: number;
  updatedAt: string;
};

function TrashIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.className}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M6 6l1 16h10l1-16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function ThyroidReportsList(props: { initialRows: ThyroidReportsListRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<ThyroidReportsListRow[]>(props.initialRows);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  async function deleteRow(row: ThyroidReportsListRow) {
    const patient = row.patientName || "Untitled";
    const ok = window.confirm(`Delete this thyroid report?\n\n${patient}`);
    if (!ok) return;

    setError(null);
    setDeleting((prev) => ({ ...prev, [row.id]: true }));

    try {
      const res = await fetch(`/api/thyroid-reports/${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      router.refresh();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      alert(message);
    } finally {
      setDeleting((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur">
      <div className="grid grid-cols-12 gap-2 border-b border-white/60 bg-white/60 px-4 py-3 text-xs font-semibold text-slate-700">
        <div className="col-span-5">Patient</div>
        <div className="col-span-3">Exam date</div>
        <div className="col-span-2">K-TIRADS</div>
        <div className="col-span-1">Updated</div>
        <div className="col-span-1 text-right">
          <span className="sr-only">Actions</span>
        </div>
      </div>

      {error ? (
        <div className="border-b border-white/60 bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</div>
      ) : null}

      {rows.length ? (
        <div className="divide-y divide-white/60">
          {rows.map((r) => (
            <div key={r.id} className="group relative grid grid-cols-12 gap-2 px-4 py-3 text-sm">
              <Link
                href={`/app/thyroid/reports/${r.id}`}
                aria-label={`Open thyroid report: ${r.patientName || "Untitled"}`}
                className="absolute inset-0 rounded-none focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              />

              <div className="pointer-events-none col-span-5 font-medium group-hover:text-slate-900">
                {r.patientName || "Untitled"}
              </div>
              <div className="pointer-events-none col-span-3 text-slate-700 group-hover:text-slate-900">
                {r.examDate ?? ""}
              </div>
              <div className="pointer-events-none col-span-2 text-slate-700 group-hover:text-slate-900">
                {r.highestKtirads ? `K${r.highestKtirads}` : ""}
              </div>
              <div className="pointer-events-none col-span-1 text-xs text-slate-600 group-hover:text-slate-700">
                {new Date(r.updatedAt).toLocaleDateString()}
              </div>

              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  title="Delete"
                  aria-label={`Delete thyroid report: ${r.patientName || "Untitled"}`}
                  disabled={!!deleting[r.id]}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void deleteRow(r);
                  }}
                  className="relative z-10 rounded-lg p-2 text-slate-600 hover:bg-white/60 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-10 text-center text-sm text-slate-600">No thyroid reports yet.</div>
      )}
    </div>
  );
}
