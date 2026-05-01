import { NextResponse } from "next/server";
import {
  isAllowedCourseDocumentHost,
  normalizeCourseDocumentFetchUrl,
} from "@/lib/course-document-pdf-url";
import { flattenPdfAcroFormBytes } from "@/lib/course-pdf-form-flatten";

export const runtime = "nodejs";

const MAX_BYTES = 28 * 1024 * 1024;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : "";

  if (!url || !isAllowedCourseDocumentHost(url)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  const fetchUrl = normalizeCourseDocumentFetchUrl(url);
  if (!fetchUrl) {
    return NextResponse.json(
      { error: "Could not resolve download URL" },
      { status: 400 },
    );
  }

  let res: Response;
  try {
    res = await fetch(fetchUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; METI-Audit-Portal/1.0)",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Upstream returned ${res.status}` },
      { status: 502 },
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const sig = buf.subarray(0, Math.min(5, buf.length)).toString("latin1");
  if (!sig.startsWith("%PDF")) {
    return NextResponse.json(
      { error: "Not a PDF response" },
      { status: 422 },
    );
  }

  const raw = new Uint8Array(buf);
  const normalized = await flattenPdfAcroFormBytes(raw);

  return new NextResponse(Buffer.from(normalized), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
}
