import * as cheerio from "cheerio";
import type { DiscoveredNotice } from "./types";

const BASE_URL = "https://www.toledo.pr.gov.br";

const PSS_SECTIONS = [
  {
    name: "Em andamento",

    url:
      `${BASE_URL}/municipio/concursos_e_admissao/` +
      "processos_seletivos_simplificados/" +
      "processos-seletivos-simplificados",
  },

  {
    name: "Vigentes",

    url:
      `${BASE_URL}/municipio/concursos_e_admissao/` +
      "processos_seletivos_simplificados/" +
      "processos-seletivos-0",
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Toledo respondeu HTTP ${response.status}`);
  }

  return response.text();
}

function isOpeningNotice(title: string) {
  const value = normalize(title);

  const ignoredTerms = [
    "retificacao",
    "comunicado",
    "homologacao",
    "convocacao",
    "resultado",
    "classificacao",
    "recurso",
    "requerimento",
    "formulario",
    "autodeclaracao",
    "inscricoes homologadas",
    "gabarito",
  ];

  if (ignoredTerms.some((term) => value.includes(term))) {
    return false;
  }

  return (
    value.includes("edital") &&
    (value.includes("processo seletivo") || value.includes("pss"))
  );
}

async function findProcessPages(sectionName: string, sectionUrl: string) {
  const html = await fetchHtml(sectionUrl);

  const $ = cheerio.load(html);

  const pages = new Map<
    string,
    {
      title: string;
      url: string;
    }
  >();

  $("a").each((_, element) => {
    const link = $(element);

    const title = link.text().replace(/\s+/g, " ").trim();

    const href = link.attr("href");

    if (!title || !href) {
      return;
    }

    let url: string;

    try {
      url = new URL(href, BASE_URL).toString();
    } catch {
      return;
    }

    const parsedUrl = new URL(url);

    const pathname = parsedUrl.pathname;

    /*
     * Precisamos permanecer dentro
     * da área de PSS de Toledo.
     */
    if (!pathname.includes("/processos_seletivos_simplificados/")) {
      return;
    }

    /*
     * Não queremos a própria página
     * da seção nem páginas gerais.
     */
    if (parsedUrl.toString() === new URL(sectionUrl).toString()) {
      return;
    }

    /*
     * As páginas individuais usadas
     * pelo portal possuem normalmente
     * um último segmento como:
     *
     * processo
     * processo-1
     * processo-2
     */
    const lastSegment = pathname.split("/").filter(Boolean).at(-1);

    if (!lastSegment) {
      return;
    }

    if (!/^processo(?:-\d+)?$/i.test(lastSegment)) {
      return;
    }

    pages.set(url, {
      title,
      url,
    });
  });

  console.log(`   📂 ${sectionName}: ${pages.size} processo(s)`);

  return [...pages.values()];
}

async function extractOpeningNotices(processUrl: string) {
  const html = await fetchHtml(processUrl);

  const $ = cheerio.load(html);

  const notices: DiscoveredNotice[] = [];

  $("a").each((_, element) => {
    const link = $(element);

    const title = link.text().replace(/\s+/g, " ").trim();

    const href = link.attr("href");

    if (!title || !href) {
      return;
    }

    if (!isOpeningNotice(title)) {
      return;
    }

    let url: string;

    try {
      url = new URL(href, BASE_URL).toString();
    } catch {
      return;
    }

    if (!/\.pdf(\?|$)/i.test(url)) {
      return;
    }

    notices.push({
      title,
      url,

      source: "Prefeitura de Toledo",

      type: "PSS",

      detectedTerms: [],
    });
  });

  return notices;
}

export async function discoverToledo(): Promise<DiscoveredNotice[]> {
  const allProcesses = new Map<
    string,
    {
      title: string;
      url: string;
    }
  >();

  for (const section of PSS_SECTIONS) {
    const processes = await findProcessPages(section.name, section.url);

    for (const process of processes) {
      allProcesses.set(process.url, process);
    }
  }

  console.log(`   🔎 ${allProcesses.size} processo(s) único(s) de Toledo`);

  const notices: DiscoveredNotice[] = [];

  for (const process of allProcesses.values()) {
    console.log(`   📂 Verificando: ${process.title || process.url}`);

    const discovered = await extractOpeningNotices(process.url);

    notices.push(...discovered);
  }

  return Array.from(new Map(notices.map((item) => [item.url, item])).values());
}
