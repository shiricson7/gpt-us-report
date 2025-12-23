"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { deriveAgeAndSexFromRrn } from "@/lib/rrn";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  coerceKtiradsCategory,
  recommendKtiradsManagement,
  type KtiradsCategory
} from "@/lib/thyroid/kTirads";
import ImageUploadWithContext from "@/components/ImageUploadWithContext";

type Profile = { hospital_name: string; doctor_name: string; license_no: string } | null;

type UploadImage = {
  id: string;
  filename: string;
  mimeType: string;
  dataUrl: string;
  blob: Blob;
  storagePath?: string;
};

type KtiradsNodule = {
  side: "left" | "right" | "isthmus" | "unknown";
  location?: string;
  sizeMm?: number | null;
  composition?: string;
  echogenicity?: string;
  shape?: string;
  margin?: string;
  echogenicFoci?: string;
  kTirads?: KtiradsCategory;
  rationale?: string;
  confidence?: "low" | "medium" | "high";
};

type Analysis = {
  imageAssignments?: Array<{ filename: string; side: KtiradsNodule["side"] }>;
  nodules: KtiradsNodule[];
  findings: string;
  impression: string;
};

type ThyroidReportRow = {
  id: string;
  patient_name: string;
  chart_no: string;
  rrn: string;
  rrn_enc?: string;
  exam_date: string | null;
  age_text: string;
  sex: string;
  clinical_info: string;
  image_context?: string;
  findings: string;
  impression: string;
  recommendations: string;
  nodules: unknown;
  image_assignments: unknown;
};

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

function sideLabel(side: KtiradsNodule["side"]) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  if (side === "isthmus") return "Isthmus";
  return "Unknown";
}

function formatSize(sizeMm: number | null | undefined) {
  if (typeof sizeMm !== "number" || !Number.isFinite(sizeMm)) return "";
  return `${Math.round(sizeMm)} mm`;
}

function groupBySide(nodules: KtiradsNodule[]) {
  const grouped: Record<KtiradsNodule["side"], KtiradsNodule[]> = {
    left: [],
    right: [],
    isthmus: [],
    unknown: []
  };
  for (const nodule of nodules) grouped[nodule.side].push(nodule);
  return grouped;
}

function groupByKtirads(nodules: KtiradsNodule[]) {
  const grouped: Record<string, KtiradsNodule[]> = {};
  for (const nodule of nodules) {
    const k = nodule.kTirads ? `K-TIRADS ${nodule.kTirads}` : "K-TIRADS ?";
    grouped[k] ??= [];
    grouped[k].push(nodule);
  }
  const order = ["K-TIRADS 5", "K-TIRADS 4", "K-TIRADS 3", "K-TIRADS 2", "K-TIRADS 1", "K-TIRADS ?"];
  return Object.entries(grouped).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

function computeHighestKtirads(nodules: KtiradsNodule[]) {
  let max = 0;
  for (const n of nodules) {
    if (typeof n.kTirads === "number" && n.kTirads > max) max = n.kTirads;
  }
  return max;
}

function computeRecommendations(nodules: KtiradsNodule[]) {
  const lines: string[] = [];
  for (const n of nodules) {
    if (!n.kTirads) continue;
    const sizeMm = typeof n.sizeMm === "number" && Number.isFinite(n.sizeMm) ? n.sizeMm : null;
    const sideKo = n.side === "left" ? "좌엽" : n.side === "right" ? "우엽" : n.side === "isthmus" ? "협부" : "불명";
    const prefix = `${sideKo}${n.location ? `(${n.location})` : ""}${sizeMm ? ` ${formatSize(sizeMm)}` : ""}`;
    lines.push(`${prefix}: ${recommendKtiradsManagement({ kTirads: n.kTirads, sizeMm })}`);
  }
  if (!lines.length) return "";
  return lines.join("\n");
}

function safeParseArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default function ThyroidReportEditor({ reportId }: { reportId?: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [draftId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : uuid()));

  const [profile, setProfile] = useState<Profile>(null);
  const [busyAction, setBusyAction] = useState<null | "save" | "aiAnalyze">(null);
  const busy = busyAction !== null;
  const [status, setStatus] = useState<string | null>(null);

  const [patientName, setPatientName] = useState("");
  const [chartNo, setChartNo] = useState("");
  const [rrn, setRrn] = useState("");
  const [examDate, setExamDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ageText, setAgeText] = useState("");
  const [sex, setSex] = useState("");

  const [clinicalInfo, setClinicalInfo] = useState("");
  const [imageContext, setImageContext] = useState("");
  const [uploads, setUploads] = useState<UploadImage[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const nodules = useMemo(() => analysis?.nodules ?? [], [analysis]);
  const bySide = useMemo(() => groupBySide(nodules), [nodules]);
  const highestKtirads = useMemo(() => computeHighestKtirads(nodules), [nodules]);
  const recommendations = useMemo(() => computeRecommendations(nodules), [nodules]);

  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");

  const assignments = useMemo(() => {
    const map = new Map<string, KtiradsNodule["side"]>();
    for (const a of analysis?.imageAssignments ?? []) map.set(a.filename, a.side);
    return map;
  }, [analysis]);

  useEffect(() => {
    const derived = deriveAgeAndSexFromRrn(rrn, examDate);
    if (derived.sex) setSex(derived.sex);
    if (derived.ageText) setAgeText(derived.ageText);
  }, [rrn, examDate]);

  useEffect(() => {
    let canceled = false;
    async function load() {
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
          .from("thyroid_reports")
          .select(
            "id, patient_name, chart_no, rrn, rrn_enc, exam_date, age_text, sex, clinical_info, image_context, findings, impression, recommendations, nodules, image_assignments"
          )
          .eq("id", reportId)
          .maybeSingle();
        if (canceled) return;
        if (error) {
          setStatus(error.message);
          return;
        }
        const report = (r as ThyroidReportRow | null) ?? null;
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
        setClinicalInfo(report.clinical_info);
        setImageContext(report.image_context ?? "");
        setFindings(report.findings);
        setImpression(report.impression);

        const loadedNodules: KtiradsNodule[] = safeParseArray(report.nodules)
          .map((n) => {
            const obj = n as Record<string, unknown>;
            const side =
              obj.side === "left" || obj.side === "right" || obj.side === "isthmus" || obj.side === "unknown"
                ? (obj.side as KtiradsNodule["side"])
                : "unknown";
            const kTirads = coerceKtiradsCategory(obj.kTirads);
            const sizeMmRaw = obj.sizeMm;
            const sizeMm =
              typeof sizeMmRaw === "number"
                ? sizeMmRaw
                : typeof sizeMmRaw === "string"
                  ? Number(sizeMmRaw)
                  : null;
            return {
              side,
              location: typeof obj.location === "string" ? obj.location : undefined,
              sizeMm: typeof sizeMm === "number" && Number.isFinite(sizeMm) ? sizeMm : null,
              composition: typeof obj.composition === "string" ? obj.composition : undefined,
              echogenicity: typeof obj.echogenicity === "string" ? obj.echogenicity : undefined,
              shape: typeof obj.shape === "string" ? obj.shape : undefined,
              margin: typeof obj.margin === "string" ? obj.margin : undefined,
              echogenicFoci: typeof obj.echogenicFoci === "string" ? obj.echogenicFoci : undefined,
              kTirads: kTirads ?? undefined,
              rationale: typeof obj.rationale === "string" ? obj.rationale : undefined,
              confidence:
                obj.confidence === "low" || obj.confidence === "medium" || obj.confidence === "high"
                  ? (obj.confidence as KtiradsNodule["confidence"])
                  : undefined
            };
          })
          .filter((n) => n.side);

        const loadedAssignments = safeParseArray(report.image_assignments)
          .map((a) => {
            const obj = a as Record<string, unknown>;
            const filename = typeof obj.filename === "string" ? obj.filename : "";
            const side =
              obj.side === "left" || obj.side === "right" || obj.side === "isthmus" || obj.side === "unknown"
                ? (obj.side as KtiradsNodule["side"])
                : "unknown";
            return filename ? { filename, side } : null;
          })
          .filter(Boolean) as Array<{ filename: string; side: KtiradsNodule["side"] }>;

        setAnalysis({
          nodules: loadedNodules,
          imageAssignments: loadedAssignments,
          findings: report.findings,
          impression: report.impression
        });

        if (!report.recommendations) {
          const nextRec = computeRecommendations(loadedNodules);
          if (nextRec) setStatus("Recommendations were recalculated for this report.");
        }
      } catch (err) {
        if (!canceled) setStatus(getErrorMessage(err));
      }
    }
    void load();
    return () => {
      canceled = true;
    };
  }, [supabase, reportId]);

  async function onFilesSelected(files: FileList | File[] | null) {
    setStatus(null);
    if (!files || !files.length) return;

    const next: UploadImage[] = [];
    for (const file of Array.from(files)) {
      const name = file.name || "upload";
      const ext = name.split(".").pop()?.toLowerCase() ?? "";

      const isDicom = ext === "dcm" || file.type.toLowerCase().includes("dicom");
      if (isDicom) {
        setStatus("DICOM(.dcm)? ?꾩쭅 誘몄??먯엯?덈떎. PNG/JPG濡??대낫?댁꽌 ?낅줈?쒗빐 二쇱꽭??");
        continue;
      }

      if (!file.type.startsWith("image/")) {
        setStatus("?대?吏 ?뚯씪(PNG/JPG/WebP)留?吏?먰빀?덈떎.");
        continue;
      }

      if (file.size > 12 * 1024 * 1024) {
        setStatus("?뚯씪???덈Т ?쎈땲?? 12MB ?댄븯濡??낅줈?쒗빐 二쇱꽭??");
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
      const path = `${user.id}/thyroid/${stableReportId}/${uuid()}.jpg`;
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

  async function analyzeWithAi() {
    setStatus(null);
    setBusyAction("aiAnalyze");
    try {
      if (!uploads.length) throw new Error("?대?吏瑜??낅줈?쒗빐 二쇱꽭??");

      const imagePaths = await ensureUploadedImagePaths();

      const res = await fetch("/api/ai/thyroid", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clinicalInfo,
          imageContext,
          imagePaths
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Analysis;

      const cleanedNodules: KtiradsNodule[] = (data.nodules ?? [])
        .map((n) => {
          const side =
            n.side === "left" || n.side === "right" || n.side === "isthmus" || n.side === "unknown" ? n.side : "unknown";
          const kTirads = coerceKtiradsCategory((n as { kTirads?: unknown }).kTirads) ?? undefined;
          const sizeMmRaw = (n as { sizeMm?: unknown }).sizeMm;
          const sizeMm =
            typeof sizeMmRaw === "number" ? sizeMmRaw : typeof sizeMmRaw === "string" ? Number(sizeMmRaw) : null;

          return {
            side,
            location: typeof n.location === "string" ? n.location : undefined,
            sizeMm: typeof sizeMm === "number" && Number.isFinite(sizeMm) ? sizeMm : null,
            composition: typeof n.composition === "string" ? n.composition : undefined,
            echogenicity: typeof n.echogenicity === "string" ? n.echogenicity : undefined,
            shape: typeof n.shape === "string" ? n.shape : undefined,
            margin: typeof n.margin === "string" ? n.margin : undefined,
            echogenicFoci: typeof n.echogenicFoci === "string" ? n.echogenicFoci : undefined,
            kTirads,
            rationale: typeof n.rationale === "string" ? n.rationale : undefined,
            confidence: n.confidence === "low" || n.confidence === "medium" || n.confidence === "high" ? n.confidence : undefined
          };
        })
        .filter((n) => n.side);

      const cleanedAssignments = Array.isArray(data.imageAssignments)
        ? data.imageAssignments
            .map((a) => ({
              filename: String((a as { filename?: unknown }).filename ?? "").trim(),
              side: String((a as { side?: unknown }).side ?? "").trim()
            }))
            .filter((a) => a.filename)
            .map((a) => ({
              filename: a.filename,
              side:
                a.side === "left" || a.side === "right" || a.side === "isthmus" || a.side === "unknown"
                  ? (a.side as KtiradsNodule["side"])
                  : "unknown"
            }))
        : [];

      const nextAnalysis: Analysis = {
        imageAssignments: cleanedAssignments,
        nodules: cleanedNodules,
        findings: String(data.findings ?? "").trim(),
        impression: String(data.impression ?? "").trim()
      };

      setAnalysis(nextAnalysis);
      if (nextAnalysis.findings) setFindings(nextAnalysis.findings);
      if (nextAnalysis.impression) setImpression(nextAnalysis.impression);
      setStatus("AI 遺꾩꽍???꾨즺?섏뿀?듬땲?? 寃곌낵瑜?寃?좏빐 二쇱꽭??");
    } catch (err) {
      setStatus(getErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

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
        clinical_info: clinicalInfo,
        image_context: imageContext,
        findings,
        impression,
        recommendations,
        highest_k_tirads: highestKtirads,
        nodules: nodules as unknown,
        image_assignments: analysis?.imageAssignments ?? [],
        updated_at: new Date().toISOString()
      };

      if (reportId) {
        const { error } = await supabase.from("thyroid_reports").update(payload).eq("id", reportId);
        if (error) throw error;
        setStatus("Saved.");
        return;
      }

      const { data, error } = await supabase
        .from("thyroid_reports")
        .insert({ id: draftId, ...payload })
        .select("id")
        .single<{ id: string }>();
      if (error) throw error;
      if (!data?.id) {
        setStatus("Saved, but could not load new report id. Check RLS policies.");
        router.replace("/app/thyroid/reports");
        router.refresh();
        return;
      }
      router.replace(`/app/thyroid/reports/${data.id}`);
      router.refresh();
      setStatus("Saved.");
    } catch (err) {
      setStatus(getErrorMessage(err) || "Save failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function copyToClipboard() {
    setStatus(null);
    try {
      const headerLines = [
        "Thyroid ultrasound report",
        profile?.hospital_name ? profile.hospital_name : "",
        "",
        `Patient: ${patientName}`,
        `Chart No: ${chartNo}`,
        `RRN: ${rrn}`,
        `Age/Sex: ${ageText}${ageText && sex ? " / " : ""}${sex}`,
        `Exam date: ${examDate}`,
        ""
      ].filter(Boolean);

      const text = [
        ...headerLines,
        "Clinical history",
        clinicalInfo.trim(),
        "",
        "Findings",
        findings.trim(),
        "",
        "Impression",
        impression.trim(),
        "",
        "K-TIRADS recommendations",
        recommendations.trim()
      ]
        .filter(Boolean)
        .join("\n");

      await navigator.clipboard.writeText(text + "\n");
      setStatus("Copied to clipboard.");
    } catch (err) {
      setStatus(getErrorMessage(err));
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">{reportId ? "Edit thyroid report" : "New thyroid report"}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload thyroid ultrasound images ??auto K-TIRADS structuring ??draft findings/impression ??save/print.
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
          <h2 className="text-sm font-semibold">Clinical information</h2>
          <textarea
            className="mt-3 min-h-[140px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={clinicalInfo}
            onChange={(e) => setClinicalInfo(e.target.value)}
            placeholder="e.g., palpable nodule, TSH, prior FNA, radiation exposure, family history"
            disabled={busy}
          />
          <p className="mt-2 text-xs text-slate-600">Optional. Helps AI generate a more consistent impression.</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3">
          <ImageUploadWithContext
            title="Thyroid ultrasound images"
            helpText="이미지 + 간단한 설명을 바탕으로 AI가 K-TIRADS 분류와 findings/impression 초안을 생성합니다."
            busy={busy}
            uploads={uploads}
            accept="image/png,image/jpeg,image/webp,.dcm"
            onPickFiles={onFilesSelected}
            onRemoveUpload={(id) => setUploads((prev) => prev.filter((p) => p.id !== id))}
            renderMeta={(u) => (
              <span>Side: {assignments.get(u.filename) ? sideLabel(assignments.get(u.filename)!) : "—"}</span>
            )}
            contextLabel="Image context (optional)"
            contextValue={imageContext}
            onContextChange={setImageContext}
            actionLabel={busyAction === "aiAnalyze" ? "로딩중..." : "Analyze with AI"}
            actionDisabled={!uploads.length}
            onAction={() => void analyzeWithAi()}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setAnalysis(null);
                setFindings("");
                setImpression("");
              }}
              disabled={busy}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Clear AI result
            </button>
            {status ? <p className="text-sm text-slate-700">{status}</p> : null}
          </div>
        </div>

        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">K-TIRADS (auto)</h2>
          <p className="mt-1 text-xs text-slate-600">AI가 병변을 분류하고 K-TIRADS로 정리합니다.</p>

          <div className="mt-4 grid gap-4">
            <div className="text-xs font-semibold text-slate-700">Highest: {highestKtirads ? `K-TIRADS ${highestKtirads}` : "—"}</div>
            <div className="grid gap-6 lg:grid-cols-2">
              {(["left", "right"] as const).map((side) => {
                const sideNodules = bySide[side] ?? [];
                const groups = groupByKtirads(sideNodules);
                return (
                  <div key={side} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-semibold">{sideLabel(side)} lobe</div>
                    <div className="mt-4 grid gap-4">
                      {groups.length ? (
                        groups.map(([label, list]) => (
                          <div key={label}>
                            <div className="text-xs font-semibold text-slate-700">{label}</div>
                            <div className="mt-2 grid gap-2">
                              {list.map((n, idx) => (
                                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-xs font-semibold text-slate-800">
                                      {n.location ? n.location : "Nodule"} {formatSize(n.sizeMm)}
                                    </div>
                                    {n.confidence ? (
                                      <div className="text-[11px] font-semibold text-slate-600">
                                        {n.confidence.toUpperCase()} confidence
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 grid gap-1 text-[11px] text-slate-700">
                                    {n.composition ? <div>Composition: {n.composition}</div> : null}
                                    {n.echogenicity ? <div>Echogenicity: {n.echogenicity}</div> : null}
                                    {n.shape ? <div>Shape: {n.shape}</div> : null}
                                    {n.margin ? <div>Margin: {n.margin}</div> : null}
                                    {n.echogenicFoci ? <div>Echogenic foci: {n.echogenicFoci}</div> : null}
                                    {n.rationale ? <div className="text-slate-600">Rationale: {n.rationale}</div> : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-600">No categorized nodules detected (or not enough info).</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {bySide.isthmus.length || bySide.unknown.length ? (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                {bySide.isthmus.length ? (
                  <div>
                    <div className="text-sm font-semibold">Isthmus</div>
                    <div className="mt-2 text-sm text-slate-700">{bySide.isthmus.length} nodule(s)</div>
                  </div>
                ) : null}
                {bySide.unknown.length ? (
                  <div>
                    <div className="text-sm font-semibold">Unknown side</div>
                    <div className="mt-2 text-sm text-slate-700">{bySide.unknown.length} nodule(s)</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">Findings</h2>
          <textarea
            className="mt-3 min-h-[260px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="AI will fill this after analysis."
          />
        </section>

        <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold">Impression</h2>
          <textarea
            className="mt-3 min-h-[260px] w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm outline-none focus:border-slate-400"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="진단명만 간단히 (예: Benign-appearing thyroid nodules, No suspicious nodule)."
          />
        </section>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
        <h2 className="text-sm font-semibold">Recommendations (K-TIRADS)</h2>
        <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
          {recommendations || "Run AI analysis to generate recommendations."}
        </pre>
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
            onClick={() => window.open(`/app/thyroid/reports/${reportId}/print`, "_blank")}
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

