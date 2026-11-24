import { PDFParse } from "pdf-parse";
import { createHash } from "node:crypto";

export interface PdfResult {
  text: string;
  pages: number;
  hash: string;
}

export async function extractPdfFromUrl(url: string): Promise<PdfResult> {
  console.log(`📄 Baixando edital...`);
  console.log(`   ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Não foi possível baixar o PDF. HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("pdf")) {
    console.warn(`⚠️ Content-Type recebido: ${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  const buffer = Buffer.from(arrayBuffer);

  const hash = createHash("sha256").update(buffer).digest("hex");

  console.log(`📦 ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB baixados`);

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
      hash,
    };
  } finally {
    await parser.destroy();
  }
}
