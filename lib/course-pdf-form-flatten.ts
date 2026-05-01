import { PDFDocument } from "pdf-lib";

/**
 * Bakes AcroForm values into page content so viewers and embeds show filled text.
 * Tries regenerating appearances first; falls back to existing /AP only if that fails.
 */
export async function flattenPdfAcroFormBytes(
  pdfBytes: Uint8Array,
): Promise<Uint8Array> {
  const tryFlatten = async (
    updateAppearances: boolean,
  ): Promise<Uint8Array | null> => {
    try {
      const doc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      const form = doc.getForm();
      if (form.getFields().length === 0) {
        return pdfBytes;
      }
      form.flatten({ updateFieldAppearances: updateAppearances });
      return await doc.save({
        updateFieldAppearances: false,
        addDefaultPage: false,
      });
    } catch {
      return null;
    }
  };

  const withAppearances = await tryFlatten(true);
  if (withAppearances) return withAppearances;

  const existingApOnly = await tryFlatten(false);
  if (existingApOnly) return existingApOnly;

  return pdfBytes;
}
