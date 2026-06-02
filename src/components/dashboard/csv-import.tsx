"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  autoMapHeaders,
  normaliseDate,
  normalisePhone,
  parseCsv,
  type CsvField,
  type CsvParseResult,
} from "@/lib/csv-import";
import {
  importPatientsCsvAction,
  type ImportSummary,
} from "@/server/actions/patients-import";
import { cn } from "@/lib/utils";

/**
 * Three-step flow:
 *
 *   1. UPLOAD   — drag-drop / click; we parse client-side
 *   2. MAP      — auto-mapped columns, user can override; preview first N rows
 *   3. RESULT   — server returns a per-row outcome summary
 *
 * Validation runs continuously: phones and dates are normalised live, and
 * any row that can't be sent (missing required field, bad phone, etc.) is
 * flagged in the preview before the user clicks Import. That way the
 * server action never sees garbage it'd just have to reject.
 */

type Stage = "upload" | "map" | "result";

const FIELD_LABELS: Record<CsvField, string> = {
  firstName: "Nombre *",
  lastName: "Apellidos",
  phone: "Teléfono *",
  email: "Email",
  dob: "Fecha de nacimiento",
  notes: "Notas",
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

interface MappedRow {
  line: number;
  data: {
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
    dob: string | null;
    notes: string | null;
  };
  /** Pre-import client-side validation error. */
  warning: string | null;
}

export function CsvImport() {
  const [stage, setStage] = React.useState<Stage>("upload");
  const [fileName, setFileName] = React.useState<string>("");
  const [parsed, setParsed] = React.useState<CsvParseResult | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, CsvField | null>>(
    {},
  );
  const [pending, setPending] = React.useState(false);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("El archivo supera los 5 MB.");
      return;
    }
    if (!/\.(csv|txt|tsv)$/i.test(file.name) && !file.type.includes("csv")) {
      setError("Formato no soportado. Sube un archivo .csv o .tsv.");
      return;
    }
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (result.headers.length === 0) {
        setError("No se ha podido leer ninguna columna del archivo.");
        return;
      }
      if (result.rows.length === 0) {
        setError("El archivo no contiene filas de datos.");
        return;
      }
      setFileName(file.name);
      setParsed(result);
      setMapping(autoMapHeaders(result.headers));
      setStage("map");
    } catch {
      setError("No se ha podido leer el archivo.");
    }
  }, []);

  // Compute the mapped + validated row payload on every mapping change so
  // the preview table and the Import button reflect the current state.
  const mappedRows: MappedRow[] = React.useMemo(() => {
    if (!parsed) return [];
    const fieldToColIndex: Partial<Record<CsvField, number>> = {};
    parsed.headers.forEach((h, idx) => {
      const target = mapping[h];
      if (target && fieldToColIndex[target] === undefined) {
        fieldToColIndex[target] = idx;
      }
    });
    return parsed.rows.map((row) => {
      const cellFor = (f: CsvField): string => {
        const idx = fieldToColIndex[f];
        return idx === undefined ? "" : row.cells[idx] ?? "";
      };
      const firstName = cellFor("firstName").trim();
      const lastName = cellFor("lastName").trim() || null;
      const phoneRaw = cellFor("phone");
      const phone = normalisePhone(phoneRaw) ?? "";
      const email = cellFor("email").trim().toLowerCase() || null;
      const dob = normaliseDate(cellFor("dob"));
      const notes = cellFor("notes").trim() || null;

      let warning: string | null = null;
      if (!firstName) warning = "Falta el nombre";
      else if (!phone) warning = "Teléfono inválido o vacío";
      else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        warning = "Email inválido";

      return {
        line: row.line,
        data: { firstName, lastName, phone, email, dob, notes },
        warning,
      };
    });
  }, [parsed, mapping]);

  const importable = mappedRows.filter((r) => !r.warning);
  const phoneMapped = Object.values(mapping).includes("phone");
  const firstNameMapped = Object.values(mapping).includes("firstName");
  const canImport =
    phoneMapped && firstNameMapped && importable.length > 0 && !pending;

  const doImport = async () => {
    if (!canImport) return;
    setPending(true);
    setError(null);
    try {
      const res = await importPatientsCsvAction(
        importable.map((r) => ({ line: r.line, data: r.data })),
      );
      if (!res.ok) {
        setError(res.error.message);
      } else {
        setSummary(res.data);
        setStage("result");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Ha fallado la importación. Inténtalo de nuevo.",
      );
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setStage("upload");
    setFileName("");
    setParsed(null);
    setMapping({});
    setSummary(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {stage === "upload" && (
        <UploadStep
          dragging={dragging}
          onDragChange={setDragging}
          onPick={() => fileInputRef.current?.click()}
          onDrop={(files) => files && handleFile(files[0])}
          inputRef={fileInputRef}
          onInputChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      )}

      {stage === "map" && parsed && (
        <MapStep
          fileName={fileName}
          headers={parsed.headers}
          mapping={mapping}
          onMappingChange={setMapping}
          mappedRows={mappedRows}
          importable={importable.length}
          totalRows={parsed.rows.length}
          canImport={canImport}
          pending={pending}
          onCancel={reset}
          onImport={doImport}
          missingPhone={!phoneMapped}
          missingFirstName={!firstNameMapped}
        />
      )}

      {stage === "result" && summary && (
        <ResultStep summary={summary} onReset={reset} />
      )}
    </div>
  );
}

/* ───────────────────────────── Step: Upload ───────────────────────────── */

function UploadStep({
  dragging,
  onDragChange,
  onPick,
  onDrop,
  inputRef,
  onInputChange,
}: {
  dragging: boolean;
  onDragChange: (v: boolean) => void;
  onPick: () => void;
  onDrop: (files: FileList | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <Card className="dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
      <CardHeader>
        <CardTitle>Sube un archivo CSV</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          role="button"
          tabIndex={0}
          onClick={onPick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPick();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            onDragChange(true);
          }}
          onDragLeave={() => onDragChange(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragChange(false);
            onDrop(e.dataTransfer.files);
          }}
          className={cn(
            "group flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition",
            dragging
              ? "border-[color:var(--color-brand-500)] bg-[color:var(--color-brand-50)] dark:bg-[color:var(--color-brand-500)]/10"
              : "border-[color:var(--color-ink-200)] bg-[color:var(--color-ink-50)] hover:border-[color:var(--color-brand-400)] dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-[color:var(--color-brand-400)]",
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a855f7] via-[#8b5cf6] to-[#7c3aed] text-white shadow-[0_12px_30px_-10px_rgba(124,58,237,0.55)]">
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="text-base font-bold text-[color:var(--color-ink-900)] dark:text-white">
              Arrastra tu archivo CSV aquí
            </p>
            <p className="mt-1 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
              .csv o .tsv · máx. 5 MB · una fila por paciente
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-ink-900)] px-4 py-2 text-xs font-bold text-white shadow-sm transition group-hover:-translate-y-0.5 dark:bg-gradient-to-br dark:from-[#8b5cf6] dark:to-[#6d28d9]">
            Seleccionar archivo
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
            className="sr-only"
            onChange={onInputChange}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-ink-50)] p-4 text-sm text-[color:var(--color-ink-600)] dark:border-white/10 dark:bg-white/[0.03] dark:text-white/70">
          <p className="font-bold text-[color:var(--color-ink-900)] dark:text-white">
            ¿Qué columnas reconoce Aizorix?
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            <li>
              · <strong>Nombre / First name</strong> (obligatorio)
            </li>
            <li>
              · <strong>Teléfono / Phone / Móvil / WhatsApp</strong>{" "}
              (obligatorio · se convierte a formato E.164 automáticamente)
            </li>
            <li>· Apellidos / Last name</li>
            <li>· Email / Correo</li>
            <li>· Fecha de nacimiento / DOB · YYYY-MM-DD o dd/mm/aaaa</li>
            <li>· Notas / Comentarios / Observaciones</li>
          </ul>
          <p className="mt-3 text-xs text-[color:var(--color-ink-500)] dark:text-white/50">
            Los pacientes con un teléfono que ya exista en tu clínica se
            ignoran automáticamente — la importación es segura de re-ejecutar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Step: Mapping ───────────────────────────── */

function MapStep({
  fileName,
  headers,
  mapping,
  onMappingChange,
  mappedRows,
  importable,
  totalRows,
  canImport,
  pending,
  onCancel,
  onImport,
  missingPhone,
  missingFirstName,
}: {
  fileName: string;
  headers: string[];
  mapping: Record<string, CsvField | null>;
  onMappingChange: (m: Record<string, CsvField | null>) => void;
  mappedRows: MappedRow[];
  importable: number;
  totalRows: number;
  canImport: boolean;
  pending: boolean;
  onCancel: () => void;
  onImport: () => void;
  missingPhone: boolean;
  missingFirstName: boolean;
}) {
  const previewRows = mappedRows.slice(0, 8);
  const invalidCount = mappedRows.filter((r) => r.warning).length;

  const setField = (header: string, field: CsvField | null) => {
    // If this field was already taken by another header, free it up first.
    const next: Record<string, CsvField | null> = { ...mapping };
    if (field) {
      for (const h of Object.keys(next)) {
        if (h !== header && next[h] === field) next[h] = null;
      }
    }
    next[header] = field;
    onMappingChange(next);
  };

  return (
    <div className="space-y-5">
      <Card className="dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-[color:var(--color-brand-500)]" />
              {fileName}
            </CardTitle>
            <span className="text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
              {totalRows} filas en el archivo
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-[color:var(--color-ink-600)] dark:text-white/70">
            Asigna cada columna del CSV a un campo de paciente.{" "}
            <strong>Nombre</strong> y <strong>Teléfono</strong> son obligatorios.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {headers.map((h) => (
              <label
                key={h}
                className="flex items-center gap-2 rounded-xl border border-[color:var(--color-ink-100)] bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.03]"
              >
                <span className="min-w-0 flex-1 truncate font-semibold text-[color:var(--color-ink-900)] dark:text-white">
                  {h}
                </span>
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) =>
                    setField(h, (e.target.value || null) as CsvField | null)
                  }
                  className="rounded-lg border border-[color:var(--color-ink-200)] bg-white px-2 py-1 text-xs font-semibold text-[color:var(--color-ink-700)] outline-none focus:border-[color:var(--color-brand-400)] dark:border-white/15 dark:bg-[color:var(--color-surface-2)] dark:text-white"
                >
                  <option value="">— ignorar —</option>
                  {(Object.keys(FIELD_LABELS) as CsvField[]).map((f) => (
                    <option key={f} value={f}>
                      {FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {(missingFirstName || missingPhone) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Asigna las columnas obligatorias:
                {missingFirstName && " Nombre"}
                {missingFirstName && missingPhone && " ·"}
                {missingPhone && " Teléfono"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          {previewRows.length === 0 ? (
            <p className="text-sm text-[color:var(--color-ink-500)] dark:text-white/55">
              No hay filas para previsualizar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-ink-500)] dark:text-white/60">
                    <th className="pb-2 pl-2 w-10">#</th>
                    <th className="pb-2">Nombre</th>
                    <th className="pb-2">Apellidos</th>
                    <th className="pb-2">Teléfono</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2 pr-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-ink-100)] dark:divide-white/5">
                  {previewRows.map((row) => (
                    <tr
                      key={row.line}
                      className={
                        row.warning
                          ? "bg-rose-50/40 dark:bg-rose-500/[0.04]"
                          : ""
                      }
                    >
                      <td className="py-2 pl-2 text-xs text-[color:var(--color-ink-400)] dark:text-white/45">
                        {row.line}
                      </td>
                      <td className="py-2 text-[color:var(--color-ink-900)] dark:text-white">
                        {row.data.firstName || "—"}
                      </td>
                      <td className="py-2 text-[color:var(--color-ink-700)] dark:text-white/75">
                        {row.data.lastName ?? "—"}
                      </td>
                      <td className="py-2 font-mono text-xs text-[color:var(--color-ink-700)] dark:text-white/75">
                        {row.data.phone || "—"}
                      </td>
                      <td className="py-2 text-xs text-[color:var(--color-ink-600)] dark:text-white/65">
                        {row.data.email ?? "—"}
                      </td>
                      <td className="py-2 pr-2">
                        {row.warning ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                            <AlertCircle className="h-3 w-3" />
                            {row.warning}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Listo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mappedRows.length > previewRows.length && (
                <p className="mt-3 text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
                  Se muestran las primeras {previewRows.length} filas de{" "}
                  {mappedRows.length}.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--color-ink-100)] bg-[color:var(--color-surface-1)] p-4 dark:border-white/10">
        <div className="text-sm">
          <p className="font-bold text-[color:var(--color-ink-900)] dark:text-white">
            {importable} {importable === 1 ? "fila lista" : "filas listas"} para
            importar
          </p>
          {invalidCount > 0 && (
            <p className="text-xs text-[color:var(--color-ink-500)] dark:text-white/55">
              {invalidCount} {invalidCount === 1 ? "fila" : "filas"} con errores
              se omitirán
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            <X /> Cancelar
          </Button>
          <Button onClick={onImport} disabled={!canImport} variant="accent">
            {pending ? <Loader2 className="animate-spin" /> : <Upload />}{" "}
            Importar {importable > 0 ? `(${importable})` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Step: Result ───────────────────────────── */

function ResultStep({
  summary,
  onReset,
}: {
  summary: ImportSummary;
  onReset: () => void;
}) {
  return (
    <Card className="dark:bg-[color:var(--color-surface-1)] dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          Importación completada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Creados" value={summary.created} tone="success" />
          <SummaryTile
            label="Duplicados"
            value={summary.skippedDuplicate}
            tone="warning"
          />
          <SummaryTile label="Inválidos" value={summary.invalid} tone="error" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={onReset}>
            <Upload /> Importar otro archivo
          </Button>
          <Button asChild variant="accent">
            <Link href="/app/clients">Ver clientes</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "error";
}) {
  const styles = {
    success:
      "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    warning:
      "border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
    error:
      "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
  }[tone];
  return (
    <div className={cn("rounded-2xl border p-4 ring-1 ring-inset", styles)}>
      <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      <p className="mt-1.5 text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

/* ──────────────────────────── Page-level shell ──────────────────────────── */

export function CsvImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/app/clients"
          className="inline-flex items-center gap-1 text-[color:var(--color-ink-500)] transition hover:text-[color:var(--color-ink-900)] dark:text-white/60 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a clientes
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[color:var(--color-ink-900)] dark:text-white">
          Importar pacientes desde CSV
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-ink-500)] dark:text-white/65">
          Sube un archivo exportado desde tu CRM actual (Excel, HubSpot, Zoho,
          Pipedrive, etc.). Aizorix detectará las columnas automáticamente.
        </p>
      </div>
      <CsvImport />
    </div>
  );
}
