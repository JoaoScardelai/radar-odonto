export type OpportunityType = "CONCURSO" | "PSS" | "CREDENCIAMENTO";

export type OpportunityStatus =
  | "UPCOMING"
  | "OPEN"
  | "CLOSED"
  | "CANCELLED";

export interface Opportunity {
  id: string;

  title: string;
  organization: string;

  city: string | null;
  state: string | null;

  type: OpportunityType;

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

  requires_cro: boolean;
  requires_specialization: boolean;
  specialization: string | null;

  status: OpportunityStatus;

  source_name: string | null;
  source_url: string;
  official_notice_url: string | null;

  description: string | null;

  first_seen_at: string;
  last_seen_at: string;

  created_at: string;
  updated_at: string;

  external_key: string;
}
