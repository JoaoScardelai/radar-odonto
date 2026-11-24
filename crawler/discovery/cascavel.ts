import * as cheerio from "cheerio";
import type { DiscoveredNotice } from "./types";

const BASE_URL = "https://cascavel.atende.net";
const SOURCE_URL = `${BASE_URL}/subportal/concursos-e-testes-seletivos`;
const SEED_PROCESS_PAGES: ProcessPage[] = [
  {
    title: "Concursos e testes seletivos",
    url: `${BASE_URL}/cidadao/pagina/concursos-`,
  },
  {
    title: "Concursos públicos e testes seletivos",
    url: `${BASE_URL}/cidadao/pagina/concurso-publico-n-297202`,
  },
];

interface AtendeFile {
  titulo?: string;
  id?: string;
  tipo?: string;
}

interface ProcessPage {
  title: string;
  url: string;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  const html = await response.text();
  const staticOrigins = [
    ...html.matchAll(
      /class=["']static["'][^>]*origem=["']([^"']+)["']/gi,
    ),
  ]
    .map((match) => new URL(match[1], url).toString())
    .filter((origin) => origin !== url);

  if (staticOrigins.length > 0) {
    const staticResults = await Promise.allSettled(
      staticOrigins.map(fetchHtml),
    );
    const staticHtml = staticResults
      .filter(
        (result): result is PromiseFulfilledResult<string> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);

    if (staticHtml.length === 0) {
      throw new Error(`Nenhum bloco estático disponível: ${url}`);
    }

    return staticHtml.join("\n");
  }

  return html;
}

function buildFileUrl(fileId: string) {
  const url = new URL("/atende.php", BASE_URL);

  url.searchParams.set("rot", "1");
  url.searchParams.set("aca", "119");
  url.searchParams.set("ajax", "t");
  url.searchParams.set("processo", "viewFile");
  url.searchParams.set("file", fileId);
  url.searchParams.set("sistema", "WPO");
  url.searchParams.set("classe", "UploadMidia");

  return url.toString();
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function identifyType(
  value: string,
): "CONCURSO" | "PSS" | "CREDENCIAMENTO" | null {
  const text = normalize(value);

  if (text.includes("credenciamento") || text.includes("chamamento publico")) {
    return "CREDENCIAMENTO";
  }

  if (text.includes("processo seletivo") || text.includes("teste seletivo")) {
    return "PSS";
  }

  if (text.includes("concurso")) {
    return "CONCURSO";
  }

  return null;
}

function extractYear(value: string): number | null {
  const matches = value.match(/\b20\d{2}\b/g);

  if (!matches?.length) {
    return null;
  }

  return Number(matches[matches.length - 1]);
}

function isRelevantOpening(title: string) {
  const text = normalize(title);

  const openingTerms = [
    "abertura",
    "edital de abertura",
    "edital normativo",
    "edital",
    "credenciamento",
    "chamamento publico",
  ];

  const ignoredTerms = [
    "homologacao",
    "convocacao",
    "resultado",
    "classificacao",
    "gabarito",
    "recurso",
  ];

  if (ignoredTerms.some((term) => text.includes(term))) {
    return false;
  }

  return openingTerms.some((term) => text.includes(term));
}

function isPdf(file: AtendeFile) {
  return (
    file.tipo === "application/pdf" ||
    file.titulo?.toLowerCase().endsWith(".pdf")
  );
}

function decodeFiles($: cheerio.CheerioAPI) {
  const files: AtendeFile[] = [];

  $("[arquivos]").each((_, element) => {
    const encoded = $(element).attr("arquivos");

    if (!encoded) return;

    try {
      const parsed = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

      if (Array.isArray(parsed)) files.push(...parsed);
    } catch {
      console.log("   ⚠️ Falha ao decodificar arquivos.");
    }
  });

  return files;
}

function decodeEmbeddedData(html: string) {
  const decoded: string[] = [];
  const pattern = /dados_elemento\s*=\s*(["'])([\s\S]*?)\1/g;

  for (const match of html.matchAll(pattern)) {
    try {
      decoded.push(Buffer.from(match[2], "base64").toString("utf8"));
    } catch {
      continue;
    }
  }

  return decoded;
}

function findEmbeddedProcessUrls(html: string) {
  const urls = new Set<string>();

  for (const value of decodeEmbeddedData(html)) {
    const normalized = value
      .replaceAll("\\\\/", "/")
      .replaceAll("\\\"", '"');

    for (const match of normalized.matchAll(
      /(?:https?:\/\/cascavel\.atende\.net)?\/cidadao\/pagina\/[A-Za-z0-9_-]+/gi,
    )) {
      urls.add(new URL(match[0], BASE_URL).toString());
    }
  }

  return [...urls];
}

function findEmbeddedFiles(html: string) {
  const files: AtendeFile[] = [];

  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const object = value as Record<string, unknown>;
    const id = object.id;
    const title = object.titulo;
    const type = object.tipo;

    if (
      typeof id === "string" &&
      (typeof title === "string" || typeof type === "string")
    ) {
      files.push({
        id,
        titulo: typeof title === "string" ? title : undefined,
        tipo: typeof type === "string" ? type : undefined,
      });
    }

    Object.values(object).forEach(visit);
  }

  for (const value of decodeEmbeddedData(html)) {
    files.push(...decodeFiles(cheerio.load(value)));

    const normalized = value
      .replaceAll("\\\\/", "/")
      .replaceAll("\\\"", '"');

    for (const match of normalized.matchAll(
      /https?:\/\/[^\s"'<>]+\.pdf(?:\?[^\s"'<>]*)?/gi,
    )) {
      files.push({
        id: match[0],
        titulo: match[0].split("/").pop(),
        tipo: "application/pdf",
      });
    }

    try {
      visit(JSON.parse(value));
    } catch {
      continue;
    }
  }

  return files;
}

function findProcessPages($: cheerio.CheerioAPI) {
  const pages = new Map<string, ProcessPage>();

  $("a").each((_, element) => {
    const link = $(element);
    const title = link.text().replace(/\s+/g, " ").trim();
    const href = link.attr("href");

    if (!title || !href) return;

    try {
      const url = new URL(href, BASE_URL).toString();
      const parsed = new URL(url);

      if (
        parsed.hostname !== new URL(BASE_URL).hostname ||
        !parsed.pathname.includes("/cidadao/pagina/") ||
        parsed.pathname === "/cidadao/pagina/"
      ) {
        return;
      }

      if (
        !/(concurso|seletivo|processo|credenciamento|chamamento|edital)/i.test(
          `${title} ${url}`,
        )
      ) {
        return;
      }

      pages.set(url, { title, url });
    } catch {
      return;
    }
  });

  return [...pages.values()];
}

async function collectFiles(page: ProcessPage) {
  const html = await fetchHtml(page.url);
  const $ = cheerio.load(html);
  const files = [...decodeFiles($), ...findEmbeddedFiles(html)];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const title = $(element).text().replace(/\s+/g, " ").trim();

    if (href && /\.pdf(?:\?|$)/i.test(href)) {
      files.push({ titulo: title || href.split("/").pop(), tipo: "application/pdf", id: href });
    }
  });

  return files.map((file) => ({
    ...file,
    pageTitle: page.title,
    pageUrl: page.url,
  }));
}

export async function discoverCascavel(): Promise<DiscoveredNotice[]> {
  let html = "";

  try {
    html = await fetchHtml(SOURCE_URL);
  } catch (error) {
    console.warn(
      `   ⚠️ Página principal de Cascavel indisponível: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  const $ = cheerio.load(html);

  const processPages = [...findProcessPages($), ...SEED_PROCESS_PAGES];
  for (const url of findEmbeddedProcessUrls(html)) {
    processPages.push({ title: url, url });
  }
  const uniqueProcessPages = [
    ...new Map(processPages.map((page) => [page.url, page])).values(),
  ];

  console.log(`   📂 ${uniqueProcessPages.length} página(s) oficial(is) encontrada(s)`);

  const pageResults = await Promise.allSettled(
    uniqueProcessPages.map(collectFiles),
  );
  const pageFiles = pageResults
    .filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof collectFiles>>> =>
        result.status === "fulfilled",
    )
    .flatMap((result) => result.value);
  const currentYear = new Date().getFullYear();
  const candidates = pageFiles.filter((file) => {
    if (!file.titulo || !file.id || !isPdf(file) || !isRelevantOpening(file.titulo)) {
      return false;
    }

    const year = extractYear(`${file.titulo} ${file.pageTitle}`);
    return year === null || year >= currentYear - 1;
  });

  const notices: DiscoveredNotice[] = [];
  const processedUrls = new Set<string>();

  for (const file of candidates) {
    if (!file.id || !file.titulo) {
      continue;
    }

    const url = file.id.startsWith("http") ? file.id : buildFileUrl(file.id);

    if (processedUrls.has(url)) continue;
    processedUrls.add(url);

    const type = identifyType(`${file.pageTitle} ${file.titulo}`);

    if (!type) continue;

    console.log("");
    console.log(`   📄 ${file.titulo}`);
    console.log(`   🔗 ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)",
          Referer: file.pageUrl,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) {
        console.log(`   ⚠️ HTTP ${response.status}`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const signature = buffer.subarray(0, 8).toString("ascii");

      if (!signature.startsWith("%PDF")) {
        console.log("   ⚠️ O arquivo baixado não é um PDF válido.");
        continue;
      }

      console.log(
        `   ✅ PDF confirmado (${(buffer.length / 1024).toFixed(1)} KB)`,
      );

      notices.push({
        title: file.titulo,
        url,
        source: "Prefeitura de Cascavel",
        type,
        detectedTerms: [normalize(file.pageTitle)],
      });
    } catch (error) {
      console.log(
        `   ❌ Falha no download: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  console.log(`\n   🎯 ${notices.length} documento(s) candidato(s)`);

  return notices;
}
