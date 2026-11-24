import type { CrawledOpportunity } from "./types";

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateOpportunity(
  opportunity: CrawledOpportunity,
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  /*
   * Campos essenciais.
   */
  if (!opportunity.title) {
    errors.push("Cargo não identificado.");
  }

  if (!opportunity.organization) {
    errors.push("Órgão não identificado.");
  }

  if (!opportunity.source_url) {
    errors.push("Fonte oficial ausente.");
  }

  /*
   * Salário.
   */
  if (opportunity.salary_min === null) {
    warnings.push("Salário não identificado.");
  }

  /*
   * Jornada.
   */
  if (opportunity.weekly_hours === null) {
    warnings.push("Jornada não identificada.");
  }

  /*
   * Vagas.
   */
  if (opportunity.vacancies === null && !opportunity.reserve_list) {
    warnings.push("Número de vagas não identificado.");
  }

  /*
   * Datas.
   */
  if (!opportunity.registration_start || !opportunity.registration_end) {
    warnings.push("Período de inscrições incompleto.");
  }

  /*
   * Detecta datas suspeitas.
   */
  if (opportunity.registration_start && opportunity.registration_end) {
    const start = new Date(`${opportunity.registration_start}T00:00:00`);

    const end = new Date(`${opportunity.registration_end}T00:00:00`);

    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);

    if (days < 0) {
      errors.push("Fim das inscrições ocorre antes do início.");
    }

    if (days > 120) {
      warnings.push(`Período de inscrições suspeito: ${days} dias.`);
    }
  }

  return {
    valid: errors.length === 0,

    warnings,

    errors,
  };
}
