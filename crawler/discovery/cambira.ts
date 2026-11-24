import * as cheerio from "cheerio";
import type { DiscoveredNotice } from "./types";

const SOURCE_URL = "https://cambira.pr.gov.br/concursos/";

const DENTISTRY_TERMS = [
  "cirurgião dentista",
  "cirurgiao dentista",
  "cirurgião-dentista",
  "cirurgiao-dentista",
  "odontólogo",
  "odontologo",
  "odontologia",
];

const IGNORE_TERMS = [
  "gabarito",
  "resultado",
  "classificação",
  "classificacao",
  "homologação",
  "homologacao",
  "homologadas",
  "homologados",
  "convocação",
  "convocacao",
  "ensalamento",
  "prova",
  "recurso",
  "aprovados",
  "títulos",
  "titulos",
  "inscritos",
  "retificação",
  "retificacao",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getYearFromUrl(url: string) {
  const match = url.match(/\/uploads\/(20\d{2})\//);

  return match ? Number(match[1]) : null;
}

function isPossibleOpeningNotice(title: string) {
  const normalized = normalize(title);

  const ignored = IGNORE_TERMS.some((term) =>
    normalized.includes(normalize(term)),
  );

  return !ignored;
}

export async function discoverCambira(): Promise<DiscoveredNotice[]> {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Cambira respondeu HTTP ${response.status}`);
  }

  const html = await response.text();

  const $ = cheerio.load(html);

  const candidates: DiscoveredNotice[] = [];

  /*
   * Agora analisamos cada LINK
   * individualmente.
   *
   * Não usamos mais o texto da
   * página inteira.
   */
  $("a").each((_, element) => {
    const link = $(element);

    const title = link.text().replace(/\s+/g, " ").trim();

    const href = link.attr("href");

    if (!title || !href) {
      return;
    }

    let url: string;

    try {
      url = new URL(href, SOURCE_URL).toString();
    } catch {
      return;
    }

    /*
     * Só documentos que potencialmente
     * podem ser editais.
     */
    const isDocument = /\.pdf(\?|$)/i.test(url);

    if (!isDocument) {
      return;
    }

    /*
     * Neste primeiro momento queremos
     * editais recentes.
     *
     * Ignora o histórico antigo.
     */
    const year = getYearFromUrl(url);

    const currentYear = new Date().getFullYear();

    if (year !== null && year < currentYear) {
      return;
    }

    /*
     * Não queremos resultado,
     * gabarito, convocação etc.
     */
    if (!isPossibleOpeningNotice(title)) {
      return;
    }

    /*
     * Não exigimos "dentista" no
     * título.
     *
     * Um edital pode simplesmente
     * chamar:
     *
     * EDITAL PSS 001/2026
     *
     * e conter Dentista dentro do PDF.
     */
    candidates.push({
      title,
      url,
      source: "Prefeitura de Cambira",

      type: "PSS",

      detectedTerms: [],
    });
  });

  return Array.from(
    new Map(candidates.map((item) => [item.url, item])).values(),
  );
}
