/**
 * Google Drive "Anyone with the link" file IDs from common URL shapes.
 */
export function extractGoogleDriveFileId(raw: string | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const fileD = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileD) return fileD[1];
  const idParam = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParam) return idParam[1];
  return null;
}

/**
 * Ordered URLs to try in <img src>. Thumbnails usually work better than
 * uc?export=view for shared Drive files in browsers.
 */
export function instructorPhotoUrlCandidates(raw: string | undefined): string[] {
  const s = raw?.trim();
  if (!s) return [];
  const id = extractGoogleDriveFileId(s);
  if (id) {
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
      `https://drive.google.com/uc?export=view&id=${id}`,
      `https://lh3.googleusercontent.com/d/${id}`,
    ];
  }
  if (/^https?:\/\//i.test(s)) return [s];
  return [];
}
