import { Asset } from "expo-asset";
import { File, Paths } from "expo-file-system";
import { printToFileAsync } from "expo-print";
import { shareAsync } from "expo-sharing";

import { A4_HEIGHT, A4_WIDTH, fontFaceCss } from "./pdfHtml";
import type { PdfFont } from "./pdfHtml";

const FACES: { family: string; weight: number; module: number }[] = [
  {
    family: "Outfit",
    module: require("../../../assets/fonts/outfit-regular.ttf"),
    weight: 400,
  },
  {
    family: "Outfit",
    module: require("../../../assets/fonts/outfit-semibold.ttf"),
    weight: 600,
  },
  {
    family: "Literata",
    module: require("../../../assets/fonts/literata-regular.ttf"),
    weight: 400,
  },
  {
    family: "Uthmanic Hafs",
    module: require("../../../assets/fonts/uthmanic-hafs.ttf"),
    weight: 400,
  },
];

let fontCss: Promise<string> | null = null;

async function readFace(face: (typeof FACES)[number]): Promise<PdfFont> {
  const asset = Asset.fromModule(face.module);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  if (!asset.localUri) {
    throw new Error(`Font ${face.family} has no local file`);
  }
  const base64 = await new File(asset.localUri).base64();
  return { base64, family: face.family, weight: face.weight };
}

/** The embedded faces, read once; a face that can't be read falls back to the
 *  WebView's own serif rather than failing the PDF. */
function loadFontCss(): Promise<string> {
  fontCss ??= Promise.allSettled(FACES.map(readFace)).then((results) =>
    fontFaceCss(
      results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))
    )
  );
  return fontCss;
}

/** Print `buildHtml(fontCss)` to an A4 PDF named `<baseName>.pdf` and open
 *  the share sheet with it. */
export async function shareJournalPdf(
  buildHtml: (fontCss: string) => string,
  baseName: string,
  title: string
): Promise<void> {
  const html = buildHtml(await loadFontCss());
  const { uri } = await printToFileAsync({
    height: A4_HEIGHT,
    html,
    width: A4_WIDTH,
  });
  let shareUri = uri;
  try {
    const named = new File(Paths.cache, `${baseName}.pdf`);
    if (named.exists) {
      named.delete();
    }
    new File(uri).move(named);
    shareUri = named.uri;
  } catch {
    // The printed file keeps its generated name; sharing still works.
  }
  await shareAsync(shareUri, {
    UTI: "com.adobe.pdf",
    dialogTitle: title,
    mimeType: "application/pdf",
  });
}
