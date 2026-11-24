function cleanLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function findContexts(
  text: string,
  terms: string[],
  before = 3,
  after = 6,
) {
  const lines = text.split("\n").map(cleanLine).filter(Boolean);

  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const normalizedTerms = terms.map(normalize);

  const contexts: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = normalize(lines[index]);

    const found = normalizedTerms.some((term) => line.includes(term));

    if (!found) {
      continue;
    }

    const start = Math.max(0, index - before);

    const end = Math.min(lines.length, index + after + 1);

    contexts.push(lines.slice(start, end).join(" | "));
  }

  return [...new Set(contexts)];
}
