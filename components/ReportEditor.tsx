"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAbnormalTiles,
  getDefaultImpression,
  getNormalFindings,
  type UltrasoundType,
  ULTRASOUND_TYPES
} from "@/lib/ultrasound/catalog";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deriveAgeAndSexFromRrn } from "@/lib/rrn";
import { buildPlainTextReport } from "@/lib/reportText";
import { getErrorMessage } from "@/lib/errorMessage";
import ImageUploadWithContext from "@/components/ImageUploadWithContext";

type Profile = { hospital_name: string; doctor_name: string; license_no: string } | null;

type ReportRow = {
  id: string;
  patient_name: string;
  chart_no: string;
  rrn: string;
  rrn_enc?: string;
  exam_date: string | null;
  age_text: string;
  sex: string;
  ultrasound_type: string;
  clinical_history: string;
  image_context?: string;
  findings: string;
  impression: string;
  recommendations: string;
};

type UploadImage = {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  blob: Blob;
  storagePath?: string;
};

function appendLine(base: string, line: string) {
  const trimmed = base.trim();
  if (!trimmed) return line;
  if (trimmed.includes(line)) return base;
  return `${base.replace(/\s+$/g, "")}\n${line}`;
}

function removeLine(base: string, line: string) {
  const target = line.trim();
  if (!target) return base;
  const kept = base
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.trim() && l.trim() !== target);
  return kept.join("\n");
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

async function downscaleToJpegDataUrl(file: File, opts?: { maxDim?: number; quality?: number }) {
  const maxDim = opts?.maxDim ?? 1280;
  const quality = opts?.quality ?? 0.86;

  const imageBitmap = await createImageBitmap(file);
  const srcW = imageBitmap.width;
  const srcH = imageBitmap.height;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const dstW = Math.max(1, Math.round(srcW * scale));
  const dstH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.drawImage(imageBitmap, 0, 0, dstW, dstH);

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const blob = await (await fetch(dataUrl)).blob();
  return { dataUrl, mimeType: "image/jpeg", blob };
}

export default function ReportEditor({ reportId }: { reportId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draftId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : uuid()));

  const [profile, setProfile] = useState<Profile>(null);
  const [busyAction, setBusyAction] = useState<null | "save" | "aiAnalyze" | "aiPolish">(null);
  const busy = busyAction !== null;
  const [status, setStatus] = useState<string | null>(null);

  const [patientName, setPatientName] = useState("");
  const [chartNo, setChartNo] = useState("");
  const [rrn, setRrn] = useState("");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ageText, setAgeText] = useState("");
  const [sex, setSex] = useState("");

  const [ultrasoundType, setUltrasoundType] = useState<UltrasoundType | "">("");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [imageContext, setImageContext] = useState("");
  const [uploads, setUploads] = useState<UploadImage[]>([]);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [selectedAbnormal, setSelectedAbnormal] = useState<Record<string, boolean>>({});

  const normalFindings = getNormalFindings(ultrasoundType);
  const abnormalTiles = getAbnormalTiles(ultrasoundType);

  useEffect(() => {
    const derived = deriveAgeAndSexFromRrn(rrn, examDate);
    if (derived.sex) setSex(derived.sex);
    if (derived.ageText) setAgeText(derived.ageText);
  }, [rrn, examDate]);

  useEffect(() => {
    let canceled = false;
    async function loadProfileAndReport() {
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user || canceled) return;

        const { data: p } = await supabase
          .from("profiles")
          .select("hospital_name, doctor_name, license_no")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!canceled) setProfile(p ?? null);

        if (!reportId) return;
        const { data: r, error } = await supabase
          .from("reports")
          .select(
            "id, patient_name, chart_no, rrn, exam_date, age_text, sex, ultrasound_type, clinical_history, image_context, findings, impression, recommendations"
          )
          .eq("id", reportId)
          .maybeSingle();
        if (canceled) return;
        if (error) {
          setStatus(error.message);
          return;
        }
        const report = (r as ReportRow | null) ?? null;
        if (!report) {
          setStatus("Report not found.");
          return;
        }

        setPatientName(report.patient_name);
        setChartNo(report.chart_no);
        setRrn(report.rrn);
        setExamDate((report.exam_date ?? new Date().toISOString().slice(0, 10)) as string);
        setAgeText(report.age_text);
        setSex(report.sex);
        setUltrasoundType((report.ultrasound_type as UltrasoundType) ?? "");
        setClinicalHistory(report.clinical_history);
        setImageContext(report.image_context ?? "");
        setFindings(report.findings);
        setImpression(report.impression);
        setRecommendations(report.recommendations ?? "");
      } catch (err) {
        if (!canceled) setStatus(getErrorMessage(err));
      }
    }
    loadProfileAndReport();
    return () => {
      canceled = true;
    };
  }, [supabase, reportId]);

  async function save() {
    setStatus(null);
    setBusyAction("save");
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      const rrnRes = await fetch("/api/secure/rrn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rrn })
      });
      if (!rrnRes.ok) throw new Error(await rrnRes.text());
      const rrnSec = (await rrnRes.json()) as { rrnMasked: string; rrnEnc: string };

      const payload = {
        user_id: user.id,
        patient_name: patientName,
        chart_no: chartNo,
        rrn: rrnSec.rrnMasked ?? "",
        rrn_enc: rrnSec.rrnEnc ?? "",
        exam_date: examDate || null,
        age_text: ageText,
        sex,
        ultrasound_type: ultrasoundType,
        clinical_history: clinicalHistory,
        image_context: imageContext,
        findings,
        impression,
        recommendations,
        updated_at: new Date().toISOString()
      };

      if (reportId) {
        const { error } = await supabase.from("reports").update(payload).eq("id", reportId);
        if (error) throw error;
        setStatus("Saved.");
        return;
      }

      const { data, error } = await supabase
        .from("reports")
        .insert({ id: draftId, ...payload })
        .select("id")
        .single<{ id: string }>();
      if (error) throw error;
      if (!data?.id) {
        setStatus("Saved, but could not load new report id. Check reports SELECT RLS policy.");
        router.replace("/app/reports");
        router.refresh();
        return;
      }
      router.replace(`/app/reports/${data.id}`);
      router.refresh();
    } catch (err) {
      setStatus(getErrorMessage(err) || "Save failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function copyToClipboard() {
    setStatus(null);
    try {
      const text = buildPlainTextReport({
        hospitalName: profile?.hospital_name,
        doctorName: profile?.doctor_name,
        licenseNo: profile?.license_no,
        patientName,
        chartNo,
        rrn,
        ageText,
        sex,
        examDate,
        clinicalHistory,
        findings,
        impression,
        recommendations
      });
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch (err) {
      setStatus(getErrorMessage(err));
    }
  }

  async function onFilesSelected(files: FileList | File[] | null) {
    setStatus(null);
    if (!files || !files.length) return;

    const next: UploadImage[] = [];
    for (const file of Array.from(files)) {
      const name = file.name || "upload";
      const ext = name.split(".").pop()?.toLowerCase() ?? "";

      const isDicom = ext === "dcm" || file.type.toLowerCase().includes("dicom");
      if (isDicom) {
        setStatus("DICOM(.dcm)은 아직 미지원입니다. PNG/JPG로 내보내서 업로드해 주세요.");
        continue;
      }

      if (!file.type.startsWith("image/")) {
        setStatus("이미지 파일(PNG/JPG/WebP)만 지원합니다.");
        continue;
      }

      if (file.size > 12 * 1024 * 1024) {
        setStatus("파일이 너무 큽니다. 12MB 이하로 업로드해 주세요.");
        continue;
      }

      try {
        const { dataUrl, mimeType, blob } = await downscaleToJpegDataUrl(file);
        next.push({ id: uuid(), filename: name, mimeType, dataUrl, blob });
      } catch (err) {
        setStatus(getErrorMessage(err));
      }
    }

    setUploads((prev) => [...prev, ...next].slice(0, 12));
  }

  async function ensureUploadedImagePaths() {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in.");

    const uploaded: string[] = [];

    for (const img of uploads) {
      if (img.storagePath) {
        uploaded.push(img.storagePath);
        continue;
      }

      const stableReportId = reportId ?? draftId;
      const path = `${user.id}/reports/${stableReportId}/${uuid()}.jpg`;
      const { error } = await supabase.storage.from("ultrasound-images").upload(path, img.blob, {
        upsert: false,
        contentType: img.mimeType
      });
      if (error) throw error;

      setUploads((prev) => prev.map((p) => (p.id === img.id ? { ...p, storagePath: path } : p)));
      uploaded.push(path);
    }

    return uploaded;
  }

  async function aiAnalyzeImages() {
    setStatus(null);
    setBusyAction("aiAnalyze");
    try {
      if (!ultrasoundType) throw new Error("Select an ultrasound type first.");
      if (!uploads.length) throw new Error("Upload at least one image first.");

      const imagePaths = await ensureUploadedImagePaths();

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ultrasoundType,
          clinicalHistory,
          imageContext,
          imagePaths
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { findings?: string; impression?: string; recommendations?: string };

      if (typeof data.findings === "string") setFindings(data.findings);
      if (typeof data.impression === "string") setImpression(data.impression);
      if (typeof data.recommendations === "string") setRecommendations(data.recommendations);
      setStatus("AI image analysis applied.");
    } catch (err) {
      setStatus(getErrorMessage(err) || "AI request failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function aiPolish() {
    setStatus(null);
    setBusyAction("aiPolish");
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ultrasoundType,
          clinicalHistory,
          findings,
          impression
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { findings: string; impression: string };
      setFindings(data.findings ?? findings);
      setImpression(data.impression?.trim() ? data.impression : impression);
      setStatus("AI refinement applied.");
    } catch (err) {
      setStatus(getErrorMessage(err) || "AI request failed.");
    } finally {
      setBusyAction(null);
    }
  }

  function toggleAbnormal(id: string, text: string) {
    setSelectedAbnormal((prev) => {
      const wasActive = !!prev[id];
      setFindings((f) => (wasActive ? removeLine(f, text) : appendLine(f, text)));
      return { ...prev, [id]: !wasActive };
    });
  }

  function useNormalFindings() {
    setFindings(normalFindings);
    if (!impression) setImpression(getDefaultImpression(ultrasoundType));
    setSelectedAbnormal({});
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">{reportId ? "Edit report" : "New report"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Patient info → Clinical history → Ultrasound type → Findings/Impression.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">Patient information</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Name
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Chart number
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
                value={chartNo}
                onChange={(e) => setChartNo(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              주민등록번호 (RRN)
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
                value={rrn}
                onChange={(e) => setRrn(e.target.value)}
                placeholder="YYMMDD-XXXXXXX"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Exam date
              <input
                className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Age (auto)
              <input
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
                value={ageText}
                readOnly
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Sex (auto)
              <input
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
                value={sex}
                readOnly
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">Exam</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Ultrasound type
              <select
                className="h-10 rounded-xl border border-slate-200 bg-white/80 px-3 text-sm outline-none focus:border-slate-400"
                value={ultrasoundType}
                onChange={(e) => {
                  const next = e.target.value as UltrasoundType;
                  setUltrasoundType(next);
                  setImpression((prev) => prev || getDefaultImpression(next));
                  setSelectedAbnormal({});
                }}
              >
                <option value="">Select</option>
                {ULTRASOUND_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-medium text-slate-700">
              Clinical history
              <textarea
                className="min-h-[120px] rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
                value={clinicalHistory}
                onChange={(e) => setClinicalHistory(e.target.value)}
                placeholder="Free text"
              />
            </label>
          </div>
        </section>
      </div>

      <ImageUploadWithContext
        title="Ultrasound images"
        helpText="이미지 + 간단한 설명을 바탕으로 AI가 findings/impression/recommendations 초안을 작성합니다."
        busy={busy}
        uploads={uploads}
        accept="image/png,image/jpeg,image/webp,.dcm"
        onPickFiles={onFilesSelected}
        onRemoveUpload={(id) => setUploads((prev) => prev.filter((p) => p.id !== id))}
        contextLabel="Image context (optional)"
        contextValue={imageContext}
        onContextChange={setImageContext}
        actionLabel={busyAction === "aiAnalyze" ? "로딩중..." : "AI 이미지 분석"}
        actionDisabled={!uploads.length || !ultrasoundType}
        onAction={() => void aiAnalyzeImages()}
      />

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Normal findings (≤ 750 bytes)</h2>
            <p className="mt-1 text-xs text-slate-600">Shown based on ultrasound type.</p>
          </div>
          <button
            type="button"
            onClick={useNormalFindings}
            disabled={!ultrasoundType}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Use as base findings
          </button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800">
          {normalFindings || "Select an ultrasound type."}
        </pre>

        {abnormalTiles.length ? (
          <div className="mt-5">
            <h3 className="text-sm font-semibold">Common abnormal findings</h3>
            <p className="mt-1 text-xs text-slate-600">Select tiles to append to findings.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {abnormalTiles.map((t) => {
                const active = !!selectedAbnormal[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleAbnormal(t.id, t.text)}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-white/60 bg-white/70 hover:bg-white"
                    }`}
                  >
                    <div className="text-sm font-semibold">{t.title}</div>
                    <div className={`mt-1 text-xs ${active ? "text-white/80" : "text-slate-600"}`}>{t.text}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Findings</h2>
            <button
              type="button"
              onClick={aiPolish}
              disabled={busy || !findings.trim()}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              title="Uses OpenAI API"
            >
              {busyAction === "aiPolish" ? "로딩중..." : "AI 다듬기"}
            </button>
          </div>
          <textarea
            className="mt-3 min-h-[220px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Write or build from templates. Avoid special symbols."
          />
          <p className="mt-2 text-xs text-slate-600">
            AI will rewrite findings and impression using professional terminology (no special symbols). Review before
            use.
          </p>
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">Impression</h2>
          <textarea
            className="mt-3 min-h-[220px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="진단명만 간단히 입력 (예: Normal study, No focal lesion)."
          />
        </section>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold">Recommendations</h2>
        <textarea
          className="mt-3 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          placeholder="Follow-up / additional workup / referral recommendations."
        />
      </section>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={copyToClipboard}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
          >
            Copy
          </button>
          <button
            type="button"
            disabled={!reportId}
            onClick={() => window.open(`/app/reports/${reportId}/print`, "_blank")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Print A4
          </button>
          {status ? <p className="text-sm text-slate-700">{status}</p> : null}
        </div>
      </section>
    </div>
  );
}
