"use client";

export default function PrintToolbar() {
  return (
    <div className="mb-4 flex items-center justify-between print:hidden">
      <div className="text-sm font-semibold">Print preview</div>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Print
      </button>
    </div>
  );
}

