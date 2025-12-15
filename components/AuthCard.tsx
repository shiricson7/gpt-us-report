"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getErrorMessage } from "@/lib/errorMessage";

export default function AuthCard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.push("/app");
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setStatus("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
        router.push("/app");
        router.refresh();
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-5 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h2>
        <button
          type="button"
          className="text-xs font-medium text-slate-700 underline decoration-slate-300 underline-offset-4"
          onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        >
          {mode === "signin" ? "Create account" : "Have an account?"}
        </button>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-medium text-slate-700">
          Email
          <input
            className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none ring-0 focus:border-slate-400"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="grid gap-1 text-xs font-medium text-slate-700">
          Password
          <input
            className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none ring-0 focus:border-slate-400"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>

        {error ? (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        ) : null}
        {status ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{status}</p> : null}

        <button
          className="mt-1 h-10 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/10 hover:bg-slate-50 disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
