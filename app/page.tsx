import AuthCard from "@/components/AuthCard";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          src="/landing.mp4"
        />
        <div className="absolute inset-0 bg-slate-900/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-white/25" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-12">
        <div className="w-full">
          <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Welcome to AI Ultrasound Report Generator
          </h1>
          <div className="mx-auto max-w-md">
            <AuthCard />
          </div>
          <p className="mx-auto mt-4 max-w-md text-center text-xs text-white/80">
            For clinician use. Always review AI output before finalizing a report.
          </p>
        </div>
      </div>
    </main>
  );
}

