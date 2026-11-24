import type { CrawledOpportunity } from "./types";

import { determineStatus, extractRegistrationDates } from "./dates";

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseBrazilianMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");

  const number = Number(normalized);

  return Number.isNaN(number) ? null : number;
}

function findPositionIndex(text: string) {
  const patterns = [/cirurgi[aã]o[\s-]+dentista/i, /odont[oó]logo/i];

  let bestMatch: { index: number; length: number; score: number } | null = null;

  for (const pattern of patterns) {
    const matches = text.matchAll(new RegExp(pattern.source, "gi"));

    for (const match of matches) {
      if (match.index === undefined) {
        continue;
      }

      const context = text.slice(match.index, match.index + 1200);

      let score = 0;

      if (/R\$\s*[\d.]+,\d{2}/i.test(context)) score += 4;
      if (/\b\d{1,2}\s*(?:h|horas?)\b/i.test(context)) score += 3;
      if (new RegExp(`${pattern.source}\\s+\\d{1,3}\\b`, "i").test(context)) {
        score += 2;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          index: match.index,
          length: match[0].length,
          score,
        };
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return bestMatch;
}

/*
 * Captura uma janela ao redor da
 * primeira ocorrência do cargo.
 *
 * Isso reduz o risco de pegarmos
 * salário/vagas de outro cargo.
 */
function getPositionContext(text: string) {
  const position = findPositionIndex(text);

  if (!position) {
    return null;
  }

  /*
   * IMPORTANTE:
   *
   * Para dados específicos do cargo,
   * começamos EXATAMENTE no nome dele.
   *
   * Assim não pegamos salário/vagas
   * do cargo anterior da tabela.
   */
  const start = position.index;

  const end = Math.min(text.length, position.index + 1200);

  return text.slice(start, end);
}

function extractSalary(context: string) {
  const match = context.match(/R\$\s*([\d.]+,\d{2})/i);

  if (!match) {
    return null;
  }

  return parseBrazilianMoney(match[1]);
}

function extractWeeklyHours(context: string) {
  /*
   * Aceita:
   *
   * 40 horas
   * 40h
   * 40 h
   * 20 horas semanais
   */
  const matches = Array.from(
    context.matchAll(/\b(\d{1,2})\s*(?:h|horas?)\b/gi),
  );

  for (const match of matches) {
    const hours = Number(match[1]);

    /*
     * Evita horários como:
     * 17 horas
     *
     * Cargas semanais mais comuns
     * ficam nesse intervalo.
     */
    if (hours >= 20 && hours <= 44) {
      return hours;
    }
  }

  return null;
}

function extractVacancies(context: string) {
  /*
   * Cambira:
   *
   * Cirurgião Dentista 03
   * R$ 4.277,67
   */
  const direct = context.match(/cirurgi[aã]o[\s-]+dentista\s+(\d{1,3})\b/i);

  if (direct) {
    return {
      vacancies: Number(direct[1]),

      reserve_list: false,
    };
  }

  /*
   * Turvo:
   *
   * Cirurgião Dentista
   * 40 horas
   * 1 + CR
   */
  const reserve = context.match(
    /cirurgi[aã]o[\s-]+dentista[\s\S]{0,100}?(\d{1,2})\s*horas?[\s\S]{0,60}?(\d+)\s*\+\s*CR/i,
  );

  if (reserve) {
    return {
      vacancies: Number(reserve[2]),

      reserve_list: true,
    };
  }

  return {
    vacancies: null,
    reserve_list: false,
  };
}

function extractCroRequirement(text: string): boolean | null {
  const contexts = [
    /cirurgi[aã]o[\s-]+dentista[\s\S]{0,1500}/i,
    /atribui[cç][õo]es\s+do\s+cargo\s+de\s+cirurgi[aã]o[\s-]+dentista[\s\S]{0,1500}/i,
  ];

  for (const pattern of contexts) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const context = match[0];

    if (
      /registro\s+(?:ativo\s+)?no\s+(?:órgão|orgao|conselho)\s+competente/i.test(
        context,
      ) ||
      /\bCRO\b/i.test(context)
    ) {
      return true;
    }
  }

  /*
   * Não encontrar não significa
   * que o edital NÃO exige.
   */
  return null;
}

function extractSpecializationRequirement(text: string): boolean | null {
  /*
   * Muito importante:
   *
   * Cambira dá pontos por
   * pós-graduação.
   *
   * Isso NÃO significa que ela
   * seja requisito para o cargo.
   *
   * Portanto não vamos inferir.
   */
  const positionContext = getPositionContext(text);

  if (!positionContext) {
    return null;
  }

  if (
    /especializa[cç][aã]o\s+(?:obrigat[oó]ria|exigida)/i.test(positionContext)
  ) {
    return true;
  }

  return null;
}

function extractApplicationFee(text: string) {
  const match = text.match(
    /taxa(?:\s+de)?\s+inscri[cç][aã]o[\s\S]{0,120}?R\$\s*([\d.]+,\d{2})/i,
  );

  return match ? parseBrazilianMoney(match[1]) : null;
}

function extractApplicationUrl(text: string) {
  const urls = text.match(/(?:https?:\/\/|www\.)[^\s)<>]+/gi) ?? [];

  const url = urls.find((value) =>
    /inscri|concurso|seletiv|banca|processo/i.test(value),
  );

  return url ? (url.startsWith("www.") ? `https://${url}` : url) : null;
}

function extractDateNear(text: string, term: RegExp) {
  const match = term.exec(text);

  if (!match || match.index === undefined) return null;

  const context = text.slice(match.index, match.index + 300);
  const date = context.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

  if (!date) return null;

  return `${date[3]}-${date[2].padStart(2, "0")}-${date[1].padStart(2, "0")}`;
}

function extractRequiredDocuments(text: string) {
  const documentTerms = [
    ["Documento de identidade", /documento de identidade|RG\b/i],
    ["CPF", /\bCPF\b/i],
    ["Diploma ou certificado de graduação", /diploma|certificado de conclus[aã]o/i],
    ["Registro no CRO", /\bCRO\b|conselho regional de odontologia/i],
    ["Comprovante de residência", /comprovante de resid[eê]ncia/i],
  ] as const;

  const documents = documentTerms
    .filter(([, pattern]) => pattern.test(text))
    .map(([label]) => label);

  return documents.length > 0 ? documents : null;
}

function extractRegistrationSummary(text: string) {
  const normalized = normalizeSpaces(text);
  const index = normalized.search(/inscri[cç][oõ]es?/i);

  if (index < 0) return null;

  return normalized.slice(Math.max(0, index - 80), index + 420);
}

function extractExamLocation(text: string) {
  const match = text.match(
    /(?:local|endere[cç]o)\s+(?:de|da)\s+prova[\s:;-]*(.{20,180})/i,
  );

  return match ? normalizeSpaces(match[1]).split(/[.!?]/)[0] : null;
}

function extractSelectionStages(text: string) {
  const stages = [
    ["Prova objetiva", /prova objetiva/i],
    ["Prova de títulos", /prova de t[ií]tulos|avalia[cç][aã]o de t[ií]tulos/i],
    ["Prova prática", /prova pr[aá]tica/i],
    ["Teste físico", /teste de aptid[aã]o f[ií]sica|teste f[ií]sico/i],
    ["Entrevista", /entrevista/i],
  ] as const;

  const found = stages.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);

  return found.length > 0 ? found : null;
}

export function extractDentistryOpportunity(
  text: string,
  options: {
    sourceUrl: string;
    organization: string;
    city: string;
    state: string;
    type: "CONCURSO" | "PSS" | "CREDENCIAMENTO";
    sourceName: string;
  },
): CrawledOpportunity | null {
  const cleanText = normalizeSpaces(text);

  const position = findPositionIndex(cleanText);

  if (!position) {
    return null;
  }

  const positionContext = getPositionContext(cleanText);

  if (!positionContext) {
    return null;
  }

  const salary = extractSalary(positionContext);

  const weeklyHours = extractWeeklyHours(positionContext);

  const vacancyData = extractVacancies(positionContext);

  const registration = extractRegistrationDates(text);

  const status = determineStatus(registration.start, registration.end);

  const requiresCro = extractCroRequirement(cleanText);

  const requiresSpecialization = extractSpecializationRequirement(cleanText);

  const registrationSummary = extractRegistrationSummary(text);
  const examDate = extractDateNear(
    text,
    /(?:data|dia)[^\n]{0,80}prova|prova[^\n]{0,80}(?:data|dia)/i,
  );
  const feeExemptionDeadline = extractDateNear(
    text,
    /isen[cç][aã]o[^\n]{0,120}(?:data|dia|prazo)/i,
  );

  const positionName = "Cirurgião Dentista";

  const specialty = null;

  const externalKey = [
    options.sourceUrl,
    options.type,
    positionName,
    specialty ?? "GERAL",
  ].join("|");

  return {
    external_key: externalKey,

    title: positionName,

    organization: options.organization,

    city: options.city,

    state: options.state,

    type: options.type,

    position: positionName,

    specialty,

    salary_min: salary,

    salary_max: salary,

    weekly_hours: weeklyHours,

    vacancies: vacancyData.vacancies,

    reserve_list: vacancyData.reserve_list,

    registration_start: registration.start,

    registration_end: registration.end,

    exam_date: examDate,

    application_url: extractApplicationUrl(text),

    application_fee: extractApplicationFee(text),

    fee_exemption_deadline: feeExemptionDeadline,

    required_documents: extractRequiredDocuments(text),

    registration_summary: registrationSummary,

    exam_location: extractExamLocation(text),

    selection_stages: extractSelectionStages(text),

    requires_cro: requiresCro,

    requires_specialization: requiresSpecialization,

    specialization: null,

    status,

    source_name: options.sourceName,

    source_url: options.sourceUrl,

    official_notice_url: options.sourceUrl,

    description: "Oportunidade identificada automaticamente no edital oficial.",
  };
}
