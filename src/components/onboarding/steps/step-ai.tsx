"use client";

import * as React from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  Upload,
  X,
} from "lucide-react";
import { useOnboarding, type AIDocument } from "@/lib/store/onboarding-store";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StepNav } from "@/components/onboarding/step-nav";
import { useT } from "@/i18n/locale-context";
import { cn } from "@/lib/utils";

/**
 * Step 4 — "Entrena tu IA" (Train your AI)
 *
 * The user uploads documents (price lists, FAQs, service descriptions,
 * manuals…) and writes free-text notes. Both are concatenated into the
 * clinic's `aiGuidance` field at activation time, so the AI uses them in
 * every conversation.
 *
 * Extraction strategy:
 *   - text/* and explicit text extensions (txt, md, csv, json, html, xml,
 *     log) are read client-side with FileReader.readAsText — instant, no
 *     deps, no server round-trip.
 *   - PDF/DOCX are accepted with status="pending". A clear notice is
 *     shown explaining the user can paste key content into the notes
 *     field. Server-side extraction can be added later behind the same
 *     interface without UI churn.
 */

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/** Lowercased extensions whose content is plain text and can be read in
 * the browser with no extra dependency. */
const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "yaml",
  "yml",
  "html",
  "htm",
  "xml",
  "log",
  "ini",
  "conf",
  "rtf",
]);

/** Extensions we accept but cannot extract text from in the browser today.
 * The user is asked to paste the key content into the notes textarea. */
const BINARY_EXTS = new Set(["pdf", "docx", "doc", "pages", "odt"]);

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function bytesLabel(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function newId(): string {
  // Crypto-strong when available; falls back to a Math.random-based string
  // for non-secure contexts (e.g. running under HTTP locally).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc_${Math.random().toString(36).slice(2)}_${Math.random()
    .toString(36)
    .slice(2)}`;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.readAsText(file);
  });
}

export function StepAI() {
  const ai = useOnboarding((s) => s.ai);
  const setAI = useOnboarding((s) => s.setAI);
  const addDoc = useOnboarding((s) => s.addAIDocument);
  const updateDoc = useOnboarding((s) => s.updateAIDocument);
  const removeDoc = useOnboarding((s) => s.removeAIDocument);
  const { t } = useT();
  const aiT = t.onboarding.ai;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const TONES = React.useMemo(
    () =>
      [
        {
          id: "professional" as const,
          name: aiT.toneProfessional,
          desc: aiT.toneProfessionalDesc,
        },
        {
          id: "friendly" as const,
          name: aiT.toneFriendly,
          desc: aiT.toneFriendlyDesc,
        },
        {
          id: "casual" as const,
          name: aiT.toneCasual,
          desc: aiT.toneCasualDesc,
        },
      ],
    [aiT],
  );

  const ingestFile = React.useCallback(
    async (file: File) => {
      const ext = extOf(file.name);
      const baseDoc: AIDocument = {
        id: newId(),
        name: file.name,
        size: file.size,
        mime: file.type || "",
        ext,
        status: "pending",
        addedAt: Date.now(),
      };

      if (file.size > MAX_BYTES) {
        addDoc({ ...baseDoc, status: "error", error: aiT.errTooLarge });
        return;
      }

      const isText = TEXT_EXTS.has(ext) || file.type.startsWith("text/");
      const isBinaryAccepted = BINARY_EXTS.has(ext);
      if (!isText && !isBinaryAccepted) {
        addDoc({ ...baseDoc, status: "error", error: aiT.errType });
        return;
      }

      addDoc(baseDoc);

      if (!isText) {
        // Binary file (PDF/DOCX/etc.) — accept it but leave status="pending".
        // A clear notice is shown to the user to paste content into notes.
        return;
      }

      try {
        const text = await readAsText(file);
        updateDoc(baseDoc.id, {
          status: "ready",
          text,
          wordCount: countWords(text),
        });
      } catch {
        updateDoc(baseDoc.id, { status: "error", error: aiT.errRead });
      }
    },
    [addDoc, updateDoc, aiT],
  );

  const ingestFiles = React.useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      Array.from(fileList).forEach((f) => void ingestFile(f));
    },
    [ingestFile],
  );

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    ingestFiles(e.dataTransfer.files);
  };

  const hasPending = ai.documents.some((d) => d.status === "pending");
  const sortedDocs = React.useMemo(
    () => [...ai.documents].sort((a, b) => b.addedAt - a.addedAt),
    [ai.documents],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* ───────── Document upload ───────── */}
      <section className="flex flex-col gap-3">
        <div>
          <Label className="mb-1 block text-base">{aiT.uploadTitle}</Label>
          <p className="text-sm text-[color:var(--color-ink-500)] dark:text-white/60">
            {aiT.uploadHint}
          </p>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={cn(
            "group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
            dragging
              ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] dark:bg-[color:var(--color-brand-500)]/10"
              : "border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] hover:border-[color:var(--color-brand-400)] hover:bg-[color:var(--color-brand-50)]/60 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-[color:var(--color-brand-400)] dark:hover:bg-[color:var(--color-brand-500)]/[0.08]",
          )}
        >
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_12px_30px_-10px_rgba(124,58,237,0.55)] transition group-hover:scale-105",
            )}
          >
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold text-[color:var(--color-ink-900)] dark:text-white">
              {aiT.dropzoneTitle}
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
              {aiT.dropzoneSub}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-ink-900)] px-4 py-2 text-xs font-bold text-white shadow-sm transition group-hover:-translate-y-0.5 dark:bg-gradient-to-br dark:from-[#8b5cf6] dark:to-[#6d28d9] dark:text-white dark:shadow-[0_8px_22px_-8px_rgba(124,58,237,0.55)]">
            {aiT.dropzoneButton}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            accept=".pdf,.docx,.doc,.txt,.md,.markdown,.csv,.tsv,.json,.yaml,.yml,.html,.htm,.xml,.log,.ini,.conf,.rtf,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            onChange={(e) => {
              ingestFiles(e.target.files);
              // Reset so selecting the same file twice still re-triggers onChange.
              e.target.value = "";
            }}
          />
        </div>

        {/* Pending-extraction notice (only when relevant) */}
        {hasPending && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{aiT.pendingNotice}</p>
          </div>
        )}

        {/* File list */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--color-ink-500)] dark:text-white/60">
            {aiT.uploadedHeader} ({ai.documents.length})
          </p>
          {sortedDocs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[color:var(--color-ink-200)] bg-white/40 px-4 py-3 text-sm text-[color:var(--color-ink-400)] dark:border-white/10 dark:bg-white/[0.02] dark:text-white/45">
              {aiT.empty}
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedDocs.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  onRemove={() => removeDoc(doc.id)}
                  labels={aiT}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Additional notes */}
        <div className="mt-2">
          <Label htmlFor="ai-additional-notes" className="mb-1.5 block">
            {aiT.notesLabel}
          </Label>
          <Textarea
            id="ai-additional-notes"
            rows={5}
            value={ai.additionalNotes}
            onChange={(e) => setAI({ additionalNotes: e.target.value })}
            placeholder={aiT.notesPlaceholder}
          />
          <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
            {aiT.notesHint}
          </p>
        </div>
      </section>

      {/* ───────── AI behavior configuration ───────── */}
      <section className="flex flex-col gap-7 border-t border-[color:var(--color-ink-100)] pt-7 dark:border-white/10">
        <div>
          <Label className="mb-2 block">{aiT.toneLabel}</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                onClick={() => setAI({ tone: tone.id })}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  ai.tone === tone.id
                    ? "border-[color:var(--color-ink-900)] bg-[color:var(--color-ink-50)] dark:border-[color:var(--color-brand-400)] dark:bg-[color:var(--color-brand-500)]/10"
                    : "border-[color:var(--color-ink-100)] hover:border-[color:var(--color-ink-300)] dark:border-white/10 dark:hover:border-white/30",
                )}
              >
                <p className="font-semibold">{tone.name}</p>
                <p className="text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
                  {tone.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">{aiT.introLabel}</Label>
          <Textarea
            rows={3}
            value={ai.introMessage}
            onChange={(e) => setAI({ introMessage: e.target.value })}
          />
          <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
            {aiT.introHint}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">{aiT.askEmailTitle}</p>
              <p className="text-sm text-[color:var(--color-ink-500)] dark:text-white/55">
                {aiT.askEmailDesc}
              </p>
            </div>
            <Checkbox
              checked={ai.askEmailForNew}
              onCheckedChange={(v) => setAI({ askEmailForNew: v })}
            />
          </label>
          <label className="flex items-center justify-between gap-4 border-t border-[color:var(--color-ink-100)] pt-3 dark:border-white/10">
            <div>
              <p className="font-medium">{aiT.pushBookingTitle}</p>
              <p className="text-sm text-[color:var(--color-ink-500)] dark:text-white/55">
                {aiT.pushBookingDesc}
              </p>
            </div>
            <Checkbox
              checked={ai.pushBooking}
              onCheckedChange={(v) => setAI({ pushBooking: v })}
            />
          </label>
        </div>
      </section>

      {/* ───────── Right-rail style insights (stacked on mobile) ───────── */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--color-brand-200)] bg-[color:var(--color-brand-50)]/60 p-4 dark:border-[color:var(--color-brand-400)]/30 dark:bg-[color:var(--color-brand-500)]/10">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-brand-700)] dark:text-[color:var(--color-brand-300)]">
            <Bot className="h-3.5 w-3.5" /> {aiT.learnTitle}
          </div>
          <ul className="mt-2 space-y-1.5 text-sm text-[color:var(--color-ink-700)] dark:text-white/80">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-600)]" />
              {aiT.learnServices}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-600)]" />
              {aiT.learnHours}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-600)]" />
              {aiT.learnDocs}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-brand-600)]" />
              {aiT.learnNotes}
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-ink-700)] dark:text-white/80">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> {aiT.tip}
          </div>
          <p className="mt-2 text-sm text-[color:var(--color-ink-700)] dark:text-white/75">
            {aiT.tipBody}
          </p>
        </div>
      </section>

      <StepNav current={4} />
    </div>
  );
}

interface DocRowProps {
  doc: AIDocument;
  onRemove: () => void;
  labels: {
    statusReady: string;
    statusPending: string;
    statusError: string;
    remove: string;
    words: string;
  };
}

function DocRow({ doc, onRemove, labels }: DocRowProps) {
  const statusMeta =
    doc.status === "ready"
      ? {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: labels.statusReady,
          tone:
            "bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30",
        }
      : doc.status === "pending"
      ? {
          icon: <Clock className="h-3.5 w-3.5" />,
          label: labels.statusPending,
          tone:
            "bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30",
        }
      : {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: doc.error ?? labels.statusError,
          tone:
            "bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30",
        };

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3.5 py-2.5 shadow-[var(--shadow-sm)] dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-ink-50)] text-[color:var(--color-ink-600)] dark:bg-white/[0.06] dark:text-white/70">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[color:var(--color-ink-900)] dark:text-white">
          {doc.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
          {bytesLabel(doc.size)}
          {doc.ext ? ` · ${doc.ext.toUpperCase()}` : ""}
          {doc.wordCount !== undefined
            ? ` · ${labels.words.replace("{n}", String(doc.wordCount))}`
            : ""}
        </p>
      </div>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1",
          statusMeta.tone,
        )}
      >
        {statusMeta.icon} {statusMeta.label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={labels.remove}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-ink-400)] transition hover:bg-[color:var(--color-ink-100)] hover:text-[color:var(--color-ink-700)] dark:hover:bg-white/[0.06] dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}
