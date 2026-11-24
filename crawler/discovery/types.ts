export interface DiscoveredNotice {
  title: string;
  url: string;
  source: string;

  type: "CONCURSO" | "PSS" | "CREDENCIAMENTO" | null;

  detectedTerms: string[];
}