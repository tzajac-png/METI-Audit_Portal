"use client";

import { useCallback, useState } from "react";
import {
  buildClassExportMergedPdf,
  type ClassExportStudentRow,
} from "@/lib/class-export-pdf-merge";

export type ExportClassPdfStudentRow = ClassExportStudentRow;

type Props = {
  programTitle: string;
  courseCode: string;
  courseDocumentUrl: string | null;
  dateLabel: string;
  leadInstructor: string;
  location: string;
  students: ExportClassPdfStudentRow[];
};

function safePdfSlug(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return t.length > 0 ? t.slice(0, 72) : "class";
}

export function ExportClassPdfButton({
  programTitle,
  courseCode,
  courseDocumentUrl,
  dateLabel,
  leadInstructor,
  location,
  students,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const bytes = await buildClassExportMergedPdf({
        programTitle,
        courseCode,
        courseDocumentUrl,
        dateLabel,
        leadInstructor,
        location,
        students,
      });
      const fn = `${safePdfSlug(programTitle)}-${safePdfSlug(courseCode)}-export.pdf`;
      const copy = new Uint8Array(bytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      a.rel = "noopener";
      a.style.position = "fixed";
      a.style.left = "-9999px";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
    } catch (e: unknown) {
      console.error(e);
      const raw =
        e instanceof Error
          ? e.message || e.name || e.stack
          : typeof e === "string"
            ? e
            : (() => {
                try {
                  return JSON.stringify(e);
                } catch {
                  return String(e);
                }
              })();
      const detail = raw?.trim() ? raw.trim() : "Unknown error (check console).";
      alert(`Could not create PDF: ${detail}`);
    } finally {
      setBusy(false);
    }
  }, [
    programTitle,
    courseCode,
    courseDocumentUrl,
    dateLabel,
    leadInstructor,
    location,
    students,
  ]);

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={busy}
      className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100/95 transition hover:border-emerald-600/60 hover:bg-emerald-950/65 disabled:opacity-50"
    >
      {busy ? "Preparing PDF…" : "Export class PDF"}
    </button>
  );
}
