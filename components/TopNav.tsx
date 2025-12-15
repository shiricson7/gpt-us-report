"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    let signOutError: unknown = null;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      signOutError = err;
    } finally {
      setBusy(false);
    }
    router.push("/");
    router.refresh();
    if (signOutError) {
      console.error("Sign out failed:", signOutError);
    }
  }

  const linkClass = (href: string) =>
    `rounded-xl px-3 py-2 text-sm font-medium ${
      pathname === href || pathname?.startsWith(`${href}/`) ? "bg-white/70" : "hover:bg-white/50"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-white/40 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/app" className="text-sm font-semibold tracking-tight">
          Ultrasound Report with AI
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/app/reports/new" className={linkClass("/app/reports/new")}>
            New
          </Link>
          <Link href="/app/reports" className={linkClass("/app/reports")}>
            Reports
          </Link>
          <Link href="/app/thyroid/reports" className={linkClass("/app/thyroid")}>
            Thyroid
          </Link>
          <Link href="/app/settings" className={linkClass("/app/settings")}>
            Settings
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="ml-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
