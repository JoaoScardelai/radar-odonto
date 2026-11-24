import * as cheerio from "cheerio";

export interface DiscoveredLink {
  title: string;
  url: string;
  context: string;
}

export async function discoverDentistryLinks(
  pageUrl: string,
): Promise<DiscoveredLink[]> {
  console.log(`🌐 Acessando ${pageUrl}`);

  const response = await fetch(pageUrl, {
    headers: {
      "User-Agent": "RadarOdonto/1.0 (monitor de concursos públicos)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ao acessar ${pageUrl}`);
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const results: DiscoveredLink[] = [];

  $("a").each((_, element) => {
    const anchor = $(element);

    const title = anchor.text().replace(/\s+/g, " ").trim();

    const href = anchor.attr("href");

    if (!href || !title) return;

    const context = anchor.parent().text().replace(/\s+/g, " ").trim();

    const searchable = `${title} ${context}`.toLowerCase();

    const terms = [
      "dentista",
      "cirurgião-dentista",
      "cirurgiao-dentista",
      "odontólogo",
      "odontologo",
      "odontologia",
      "saúde bucal",
      "saude bucal",
    ];

    const match = terms.some((term) => searchable.includes(term));

    if (!match) return;

    try {
      const absoluteUrl = new URL(href, pageUrl).toString();

      results.push({
        title,
        url: absoluteUrl,
        context,
      });
    } catch {
      // URL inválida: ignora
    }
  });

  return Array.from(new Map(results.map((item) => [item.url, item])).values());
}
