"use client";

import { useCallback, useState } from "react";
import {
  buildCourseRosterXlsxBytes,
  type CourseRosterXlsxRow,
} from "@/lib/course-roster-xlsx";

type Props = {
  programTitle: string;
  courseCode: string;
  rows: CourseRosterXlsxRow[];
};

function safeFileSlug(s: string): string {
  const t = s.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  return t.length > 0 ? t.slice(0, 72) : "class";
}

export function ExportCourseRosterXlsxButton({
  programTitle,
  courseCode,
  rows,
}: Props) {
  const [busy, setBusy] = useState(false);

  const onExport = useCallback(async () => {
    setBusy(true);
    try {
      const bytes = await buildCourseRosterXlsxBytes(rows);
      const filename = `${safeFileSlug(programTitle)}-${safeFileSlug(courseCode)}-roster.xlsx`;
      const copy = new Uint8Array(bytes);
      const blob = new Blob([copy], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.style.position = "fixed";
      a.style.left = "-9999px";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
    } catch (e: unknown) {
      console.error(e);
      const detail =
        e instanceof Error
          ? e.message || e.name
          : typeof e === "string"
            ? e
            : "Unknown error (check console).";
      alert(`Could not create spreadsheet: ${detail}`);
    } finally {
      setBusy(false);
    }
  }, [programTitle, courseCode, rows]);

  return (
    <button
      type="button"
      onClick={() => void onExport()}
      disabled={busy}
      className="rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-200 hover:border-red-900/50 disabled:opacity-50"
    >
      {busy ? "Preparing spreadsheet…" : "Export roster (XLSX)"}
    </button>
  );
}
