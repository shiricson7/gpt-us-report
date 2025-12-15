import Link from "next/link";

export default function ThyroidHomePage() {
  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Thyroid Ultrasound Report with AI</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload thyroid ultrasound images and generate K-TIRADS-structured results with draft findings/impression.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/app/thyroid/reports/new" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            New thyroid report
          </Link>
          <Link
            href="/app/thyroid/reports"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium"
          >
            Thyroid reports
          </Link>
        </div>
      </div>
    </div>
  );
}

