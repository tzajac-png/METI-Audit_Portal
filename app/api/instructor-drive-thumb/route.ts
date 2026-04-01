import { NextResponse } from "next/server";
import { getDashboardSessionValid } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Proxies Google Drive thumbnails for instructor roster photos so the browser
 * can display images that block hotlinking or return HTML interstitials on
 * direct <img> to drive.google.com.
 */
export async function GET(request: Request) {
  const ok = await getDashboardSessionValid();
  if (!ok) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const tryUrls = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w400`,
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
  ];

  for (const remote of tryUrls) {
    const res = await fetch(remote, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; METI-Audit-Portal/1.0; +https://localhost)",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) continue;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) continue;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) continue;

    const head = buf.slice(0, 80).toString("utf8").toLowerCase();
    if (head.includes("<!doctype") || head.includes("<html")) continue;

    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
    const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50;
    const isGif = buf.slice(0, 6).toString() === "GIF89a" || buf.slice(0, 6).toString() === "GIF87a";
    const isWebp = buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP";

    let outType = ct.startsWith("image/") ? ct.split(";")[0]! : "";
    if (!outType) {
      if (isJpeg) outType = "image/jpeg";
      else if (isPng) outType = "image/png";
      else if (isGif) outType = "image/gif";
      else if (isWebp) outType = "image/webp";
      else if (ct === "application/octet-stream") outType = "image/jpeg";
    }
    if (!outType) continue;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": outType,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  return NextResponse.json({ error: "Could not load image" }, { status: 404 });
}
