import * as cheerio from "cheerio";
import type { DiscoveredNotice } from "./types";

const BASE_URL = "https://concursos.curitiba.pr.gov.br";
const LIST_URL = `${BASE_URL}/listar/1/0`;

const DENTIST_POSITION = /cirurgi[aã]o[\s-]+dentista/i;
const NORMATIVE_NOTICE = /edital\s+normativo/i;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Curitiba respondeu HTTP ${response.status}: ${url}`);
  }

  return response.text();
}

export async function discoverCuritiba(): Promise<DiscoveredNotice[]> {
  const listHtml = await fetchHtml(LIST_URL);
  const $ = cheerio.load(listHtml);

  const positionPages = $("a")
    .map((_, element) => {
      const link = $(element);
      const title = cleanText(link.find("span").first().text()) || cleanText(link.text());
      const href = link.attr("href");

      if (!href || !DENTIST_POSITION.test(title)) {
        return null;
      }

      return {
        title,
        url: new URL(href, BASE_URL).toString(),
      };
    })
    .get()
    .filter((item): item is { title: string; url: string } => item !== null);

  const candidates: DiscoveredNotice[] = [];

  for (const position of positionPages) {
    const documentHtml = await fetchHtml(position.url);
    const documentPage = cheerio.load(documentHtml);

    const normativeNotice = documentPage("a")
      .map((_, element) => {
        const link = documentPage(element);
        const title = cleanText(link.text());
        const href = link.attr("href");

        if (!href || !NORMATIVE_NOTICE.test(title) || !/\.pdf(?:\?|$)/i.test(href)) {
          return null;
        }

        return {
          title,
          url: new URL(href, position.url).toString(),
        };
      })
      .get()
      .find((notice) => /retificad/i.test(notice.title));

    if (!normativeNotice) {
      console.warn(`⚠️ Edital normativo não encontrado para ${position.title}.`);
      continue;
    }

    candidates.push({
      title: `${position.title} — ${normativeNotice.title}`,
      url: normativeNotice.url,
      source: "Prefeitura de Curitiba",
      type: "CONCURSO",
      detectedTerms: ["cirurgião dentista"],
    });
  }

  return Array.from(
    new Map(candidates.map((item) => [item.url, item])).values(),
  );
}
