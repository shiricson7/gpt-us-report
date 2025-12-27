import { Gaegu, Gowun_Dodum } from "next/font/google";
import type { GuardianSummary } from "@/lib/guardianSummary";

const titleFont = Gaegu({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap"
});

const bodyFont = Gowun_Dodum({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap"
});

type GuardianSummarySheetProps = {
  summary: GuardianSummary;
  patientName: string;
  ageSex: string;
  examDate: string;
  hospitalName?: string | null;
  title?: string;
  subtitle?: string;
};

export default function GuardianSummarySheet({
  summary,
  patientName,
  ageSex,
  examDate,
  hospitalName,
  title = "보호자용 초음파 요약",
  subtitle = "아이의 검사 결과를 쉬운 말로 정리했어요."
}: GuardianSummarySheetProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-[32px] border border-rose-200/70 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 p-7 text-slate-800 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none ${bodyFont.className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-12 right-8 h-32 w-32 rounded-full bg-rose-200/60 blur-3xl" />
        <div className="absolute -bottom-10 left-6 h-36 w-36 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute left-10 top-10 h-3 w-3 rounded-full bg-amber-200/80" />
        <div className="absolute left-16 top-16 h-2 w-2 rounded-full bg-rose-200/80" />
      </div>

      <div className="relative">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-rose-400">
              보호자용 안내
            </div>
            <h1 className={`mt-2 text-3xl font-bold text-rose-600 ${titleFont.className}`}>{title}</h1>
            <p className="mt-2 text-[14px] text-slate-600">{subtitle}</p>
            {hospitalName ? <div className="mt-2 text-sm font-semibold text-slate-700">{hospitalName}</div> : null}
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-right text-sm shadow-sm ring-1 ring-rose-100/70 print:shadow-none">
            <div className="text-[11px] uppercase tracking-[0.2em] text-rose-400">검사일</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{examDate}</div>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-rose-100/70 print:shadow-none">
            <div className="text-[11px] uppercase tracking-[0.2em] text-rose-400">환자</div>
            <div className="mt-1 font-semibold text-slate-800">{patientName}</div>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-rose-100/70 print:shadow-none">
            <div className="text-[11px] uppercase tracking-[0.2em] text-rose-400">나이 / 성별</div>
            <div className="mt-1 font-semibold text-slate-800">{ageSex || "-"}</div>
          </div>
        </div>

        <section className="mt-5 rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-rose-100/70 print:shadow-none">
          <div className="text-sm font-bold text-rose-500">한눈에 보는 요약</div>
          <p className="mt-2 text-[15px] leading-7 text-slate-700">{summary.summary}</p>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-amber-100/70 print:shadow-none">
            <div className="text-sm font-bold text-amber-500">쉬운 설명</div>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-slate-700">
              {summary.keyPoints.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-white/80 px-5 py-4 shadow-sm ring-1 ring-sky-100/70 print:shadow-none">
            <div className="text-sm font-bold text-sky-500">다음 단계 / 확인할 내용</div>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-slate-700">
              {summary.nextSteps.map((item, index) => (
                <li key={`${item}-${index}`} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-sky-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-4 rounded-2xl bg-white/70 px-5 py-4 ring-1 ring-rose-100/70">
          <div className="text-sm font-bold text-rose-500">안심 포인트</div>
          <div className="mt-3 grid gap-2 text-[14px] leading-6 text-slate-700 md:grid-cols-2">
            {summary.reassurance.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-rose-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
          <span>이 안내문은 이해를 돕기 위한 참고자료입니다.</span>
          <span>최종 설명은 담당의와 상의해 주세요.</span>
        </footer>
      </div>
    </article>
  );
}
