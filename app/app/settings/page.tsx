"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getErrorMessage } from "@/lib/errorMessage";

type Profile = {
  hospital_name: string;
  doctor_name: string;
  license_no: string;
};

const emptyProfile: Profile = { hospital_name: "", doctor_name: "", license_no: "" };

export default function SettingsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    async function load() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || canceled) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("hospital_name, doctor_name, license_no")
          .eq("user_id", user.id)
          .maybeSingle();

        if (canceled) return;
        if (error) {
          setStatus(error.message);
          return;
        }
        if (data) setProfile(data);
      } catch (err) {
        if (!canceled) setStatus(getErrorMessage(err));
      }
    }
    load();
    return () => {
      canceled = true;
    };
  }, [supabase]);

  async function save() {
    setStatus(null);
    setBusy(true);
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        ...profile,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      setStatus("Saved.");
    } catch (err) {
      setStatus(getErrorMessage(err) || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">Hospital / Doctor</h1>
        <p className="mt-1 text-sm text-slate-600">
          Used in the printed A4 report header and signature block.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Hospital name
            <input
              className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
              value={profile.hospital_name}
              onChange={(e) => setProfile((p) => ({ ...p, hospital_name: e.target.value }))}
              placeholder="e.g. Shiricson Pediatric Clinic"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            Doctor name
            <input
              className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
              value={profile.doctor_name}
              onChange={(e) => setProfile((p) => ({ ...p, doctor_name: e.target.value }))}
              placeholder="e.g. Dr. Kim"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            License number
            <input
              className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
              value={profile.license_no}
              onChange={(e) => setProfile((p) => ({ ...p, license_no: e.target.value }))}
              placeholder="e.g. 12345"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save
          </button>
          {status ? <p className="text-sm text-slate-700">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
