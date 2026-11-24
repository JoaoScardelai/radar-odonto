import type { CrawledOpportunity } from "./types";

const DENTISTRY_TERMS = [
  "cirurgião-dentista",
  "cirurgiao-dentista",
  "cirurgião dentista",
  "cirurgiao dentista",
  "cirurgião dentista esf",
  "odontólogo",
  "odontologo",
  "odontologia",
  "dentista",
  "saúde bucal",
  "saude bucal",
];

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isDentistryOpportunity(text: string) {
  const normalized = normalizeText(text);

  return DENTISTRY_TERMS.some((term) =>
    normalized.includes(normalizeText(term)),
  );
}

export function findDentistryMatches(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const matches: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!isDentistryOpportunity(lines[i])) {
      continue;
    }

    /*
     * Pegamos também algumas linhas anteriores e posteriores.
     * Em editais, salário/carga horária/vagas podem estar
     * em outra linha da tabela.
     */
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length, i + 4);

    const context = lines.slice(start, end).join(" | ");

    matches.push(context);
  }

  return [...new Set(matches)];
}

export function isValidOpportunity(item: CrawledOpportunity) {
  if (!item.title.trim()) return false;
  if (!item.organization.trim()) return false;
  if (!item.source_url.trim()) return false;

  return isDentistryOpportunity(
    `${item.title} ${item.position} ${item.description ?? ""}`,
  );
}
