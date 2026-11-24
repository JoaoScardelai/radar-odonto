export interface RegistrationDates {
  start: string | null;
  end: string | null;
}

function toIsoDate(value: string): string | null {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;

  return [year, month.padStart(2, "0"), day.padStart(2, "0")].join("-");
}

export function extractRegistrationDates(text: string): RegistrationDates {
  const clean = text.replace(/\s+/g, " ").trim();

  const patterns = [
    /*
     * Ex:
     *
     * inscrições poderão ser efetuadas
     * a partir das 17 horas do dia
     * 27/04/2025 até às 17 horas do dia
     * 11/05/2026
     */
    /inscri[cç][õo]es[\s\S]{0,250}?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,120}?(?:at[eé]|a)[\s\S]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i,

    /*
     * Formatos mais simples.
     */
    /per[ií]odo\s+(?:de|das)\s+inscri[cç][õo]es[\s\S]{0,150}?(\d{1,2}\/\d{1,2}\/\d{4})[\s\S]{0,100}?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);

    if (!match) {
      continue;
    }

    return {
      start: toIsoDate(match[1]),

      end: toIsoDate(match[2]),
    };
  }

  return {
    start: null,
    end: null,
  };
}

export function determineStatus(
  registrationStart: string | null,
  registrationEnd: string | null,
): "UPCOMING" | "OPEN" | "CLOSED" {
  if (!registrationStart || !registrationEnd) {
    return "CLOSED";
  }

  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (todayString < registrationStart) {
    return "UPCOMING";
  }

  if (todayString <= registrationEnd) {
    return "OPEN";
  }

  return "CLOSED";
}
