"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type UploadItem = {
  id: string;
  filename: string;
  dataUrl: string;
};

function UploadIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.className}
    >
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    </svg>
  );
}

export default function ImageUploadWithContext(props: {
  title: string;
  helpText?: string;
  busy: boolean;
  uploads: UploadItem[];
  accept: string;
  onPickFiles: (files: FileList | File[] | null) => void;
  onRemoveUpload: (id: string) => void;
  renderMeta?: (upload: UploadItem) => ReactNode;
  contextLabel: string;
  contextValue: string;
  contextPlaceholder?: string;
  onContextChange: (value: string) => void;
  actionLabel: string;
  actionDisabled: boolean;
  onAction: () => void;
}) {
  const inputId = useId();
  const busyRef = useRef(props.busy);
  const uploadsCountRef = useRef(props.uploads.length);
  const onPickFilesRef = useRef(props.onPickFiles);

  useEffect(() => {
    busyRef.current = props.busy;
  }, [props.busy]);

  useEffect(() => {
    uploadsCountRef.current = props.uploads.length;
  }, [props.uploads.length]);

  useEffect(() => {
    onPickFilesRef.current = props.onPickFiles;
  }, [props.onPickFiles]);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      if (busyRef.current) return;
      if (uploadsCountRef.current >= 12) return;

      const items = Array.from(event.clipboardData?.items ?? []);
      if (!items.length) return;

      const files = items
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file)
        .filter((file) => file.type.startsWith("image/"));

      if (!files.length) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      onPickFilesRef.current(files);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <section className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{props.title}</h2>
          {props.helpText ? <p className="mt-1 text-xs text-slate-600">{props.helpText}</p> : null}
        </div>
        <button
          type="button"
          onClick={props.onAction}
          disabled={props.actionDisabled || props.busy}
          className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          title="Uses OpenAI API"
        >
          {props.actionLabel}
        </button>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <label
            htmlFor={inputId}
            className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-4 transition hover:border-slate-400 hover:bg-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <UploadIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">클릭하거나 붙여넣기(⌘V/Ctrl+V)로 이미지 추가</div>
              <div className="mt-1 text-xs text-slate-600">
                PNG/JPG/WebP 권장 (DICOM은 현재 미지원). 최대 12장.
              </div>
            </div>
          </label>
          <input
            id={inputId}
            type="file"
            accept={props.accept}
            multiple
            className="sr-only"
            onChange={(e) => props.onPickFiles(e.target.files)}
            disabled={props.busy}
          />

          {props.uploads.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {props.uploads.map((u) => (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-2">
                  <Image
                    src={u.dataUrl}
                    alt={u.filename}
                    width={480}
                    height={320}
                    className="h-24 w-full rounded-lg object-cover"
                    unoptimized
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="truncate text-[11px] text-slate-700" title={u.filename}>
                      {u.filename}
                    </div>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => props.onRemoveUpload(u.id)}
                      disabled={props.busy}
                    >
                      Remove
                    </button>
                  </div>
                  {props.renderMeta ? (
                    <div className="mt-1 text-[11px] text-slate-600">{props.renderMeta(u)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">No images added yet.</div>
          )}
        </div>

        <div className="lg:col-span-2">
          <label className="grid gap-1 text-xs font-medium text-slate-700">
            {props.contextLabel}
            <textarea
              className="min-h-[180px] rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm leading-relaxed outline-none focus:border-slate-400"
              value={props.contextValue}
              onChange={(e) => props.onContextChange(e.target.value)}
              placeholder={
                props.contextPlaceholder ??
                "예: transverse right lobe, cine frames, color Doppler, limited exam, known lesion location\n(식별자/전화번호/RRN 등은 쓰지 마세요)"
              }
              disabled={props.busy}
            />
          </label>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
            이 설명은 AI가 이미지를 해석할 때 참고용으로만 사용됩니다. 민감한 식별정보는 입력하지 마세요.
          </div>
        </div>
      </div>
    </section>
  );
}
