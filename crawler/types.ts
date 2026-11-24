export interface CrawledOpportunity {
  title: string;
  organization: string;

  city: string | null;
  state: string | null;

  type: "CONCURSO" | "PSS" | "CREDENCIAMENTO";

  position: string;
  specialty: string | null;

  salary_min: number | null;
  salary_max: number | null;

  weekly_hours: number | null;
  vacancies: number | null;

  reserve_list: boolean;

  registration_start: string | null;
  registration_end: string | null;
  exam_date: string | null;
  application_url: string | null;
  application_fee: number | null;
  fee_exemption_deadline: string | null;
  required_documents: string[] | null;
  registration_summary: string | null;
  exam_location: string | null;
  selection_stages: string[] | null;

  requires_cro: boolean | null;
  requires_specialization: boolean | null;
  specialization: string | null;

  status: "UPCOMING" | "OPEN" | "CLOSED";

  source_name: string;
  source_url: string;
  official_notice_url: string | null;

  description: string | null;

  external_key: string;
}
