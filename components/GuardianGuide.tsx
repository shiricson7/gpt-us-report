import { Gaegu } from "next/font/google";
import { buildGuardianGuide } from "@/lib/guardianGuide";

const guideFont = Gaegu({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap"
});

type GuardianGuideProps = {
  findings: string;
  impression: string;
};

export default function GuardianGuide({ findings, impression }: GuardianGuideProps) {
  const guide = buildGuardianGuide(findings, impression);

  return (
    <section
      className={`relative mt-8 overflow-hidden rounded-2xl border border-rose-200/70 bg-gradient-to-br from-rose-50 via-amber-50 to-sky-50 p-5 shadow-sm print:shadow-none ${guideFont.className}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-6 right-8 h-20 w-20 rounded-full bg-rose-200/60 blur-2xl" />
        <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-sky-200/60 blur-2xl" />
        <div className="absolute left-10 top-6 h-3 w-3 rounded-full bg-amber-200/70" />
        <div className="absolute left-16 top-12 h-2 w-2 rounded-full bg-rose-200/70" />
      </div>

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xl font-bold text-rose-500">보호자용 안내서</div>
          <div className="flex items-center gap-2">
            <svg aria-hidden="true" className="h-7 w-7 text-rose-300" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 6l7 15 17 2-12 12 3 17-15-8-15 8 3-17L8 23l17-2 7-15z" />
            </svg>
            <svg aria-hidden="true" className="h-10 w-10 text-amber-300" viewBox="0 0 64 64">
              <circle cx="16" cy="18" r="8" fill="currentColor" opacity="0.7" />
              <circle cx="48" cy="18" r="8" fill="currentColor" opacity="0.7" />
              <circle cx="32" cy="34" r="18" fill="currentColor" opacity="0.6" />
              <circle cx="26" cy="30" r="2" fill="#b45309" />
              <circle cx="38" cy="30" r="2" fill="#b45309" />
              <path d="M26 38c3 4 9 4 12 0" stroke="#b45309" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <svg aria-hidden="true" className="h-8 w-8 text-sky-300" viewBox="0 0 64 64" fill="currentColor">
              <path d="M20 44h26a10 10 0 0 0 1-20 14 14 0 0 0-27-3A9 9 0 0 0 20 44z" />
            </svg>
          </div>
        </div>

        <p className="mt-2 text-[15px] leading-7 text-slate-700">{guide.intro}</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-rose-100/70 print:shadow-none">
            <div className="text-sm font-bold text-rose-500">검사 기록 이해하기</div>
            <ul className="mt-2 space-y-2 text-[14px] leading-6 text-slate-700">
              {guide.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-rose-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-sky-100/70 print:shadow-none">
            <div className="text-sm font-bold text-sky-500">표현 풀이</div>
            {guide.terms.length ? (
              <ul className="mt-2 space-y-2 text-[14px] leading-6 text-slate-700">
                {guide.terms.map((term) => (
                  <li key={term.title} className="flex gap-2">
                    <span className="mt-2 h-2 w-2 rounded-full bg-sky-300" />
                    <span>
                      <span className="font-semibold text-slate-800">{term.title}</span> - {term.description}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[14px] leading-6 text-slate-700">
                표현 풀이를 만들 단서가 아직 적어요. 진료실에서 자세히 설명드릴게요.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 ring-1 ring-amber-100/70">
          <div className="text-sm font-bold text-amber-500">걱정 줄이는 포인트</div>
          <div className="mt-2 grid gap-2 text-[14px] leading-6 text-slate-700 md:grid-cols-3">
            {guide.reassurance.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-amber-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
          <span>이 안내서는 이해를 돕기 위한 참고자료입니다.</span>
          <div className="flex items-center gap-2 text-rose-300">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 64 64" fill="currentColor">
              <path d="M32 54s-20-12-20-26a10 10 0 0 1 19-5 10 10 0 0 1 19 5c0 14-18 26-18 26z" />
            </svg>
            <svg aria-hidden="true" className="h-5 w-5 text-sky-300" viewBox="0 0 64 64" fill="currentColor">
              <path d="M20 44h26a10 10 0 0 0 1-20 14 14 0 0 0-27-3A9 9 0 0 0 20 44z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
