import * as cheerio from "cheerio";
import type { DiscoveredNotice } from "./types";

interface MunicipalConfig {
  listUrl: string;
  source: string;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function identifyType(value: string): DiscoveredNotice["type"] {
  const text = normalize(value);
  if (text.includes("credenciamento") || text.includes("chamamento")) return "CREDENCIAMENTO";
  if (text.includes("processo seletivo") || text.includes("teste seletivo") || text.includes("selecao")) return "PSS";
  if (text.includes("concurso")) return "CONCURSO";
  return null;
}

export async function discoverMunicipal(config: MunicipalConfig): Promise<DiscoveredNotice[]> {
  const response = await fetch(config.listUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${config.listUrl}`);

  const currentYear = new Date().getFullYear();
  const notices = new Map<string, DiscoveredNotice>();
  const visited = new Set<string>();
  const pendingPages = [config.listUrl];
  const hostname = new URL(config.listUrl).hostname;

  while (pendingPages.length > 0 && visited.size < 20) {
    const pageUrl = pendingPages.shift();
    if (!pageUrl || visited.has(pageUrl)) continue;
    visited.add(pageUrl);

    const pageResponse = pageUrl === config.listUrl
      ? response
      : await fetch(pageUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarOdonto/1.0)" },
          signal: AbortSignal.timeout(30000),
        });
    if (!pageResponse.ok) continue;

    const $ = cheerio.load(await pageResponse.text());
    $("a[href]").each((_, element) => {
      const link = $(element);
      const title = link.text().replace(/\s+/g, " ").trim();
      const href = link.attr("href");
      const context = `${title} ${href ?? ""}`;
      const normalized = normalize(context);

      if (!href) return;
      if (/(resultado|gabarito|homologacao|convocacao|classificacao|recurso)/i.test(normalized)) return;
      if (!/(edital|concurso|processo seletivo|teste seletivo|credenciamento|chamamento)/i.test(context)) return;

      const url = new URL(href, pageUrl).toString();
      if (!/\.pdf(?:\?|$)/i.test(url)) {
        if (new URL(url).hostname === hostname && pendingPages.length < 20) pendingPages.push(url);
        return;
      }
      if (/20\d{2}/.test(context) && !context.includes(String(currentYear)) && !context.includes(String(currentYear - 1))) return;

      notices.set(url, {
        title: title || url.split("/").pop() || "Edital",
        url,
        source: config.source,
        type: identifyType(context),
        detectedTerms: [normalize(title)],
      });
    });
  }

  return [...notices.values()];
}
