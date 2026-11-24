import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Opportunity } from "@/lib/types";
import { LogoutButton } from "@/components/LogoutButton";
import { OpportunityActions } from "@/components/OpportunityActions";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

interface DocumentRevision {
  id: string;
  detected_at: string;
  content_hash: string;
}

async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao buscar oportunidade:", error);

    return null;
  }

  return data as Opportunity;
}

async function getRevisions(documentUrl: string): Promise<DocumentRevision[]> {
  const { data, error } = await supabase
    .from("document_revisions")
    .select("id,detected_at,content_hash")
    .eq("document_url", documentUrl)
    .order("detected_at", { ascending: false });

  if (error) return [];
  return data as DocumentRevision[];
}

function formatMoney(value: number | null) {
  if (value === null) {
    return "Não informado";
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string | null) {
  if (!value) {
    return "Não informada";
  }

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatType(value: Opportunity["type"]) {
  if (value === "CONCURSO") return "Concurso público";
  if (value === "PSS") return "Processo seletivo";
  return "Credenciamento";
}

export default async function OpportunityPage({ params }: PageProps) {
  const { id } = await params;

  const opportunity = await getOpportunity(id);

  if (!opportunity) {
    notFound();
  }

  const revisions = await getRevisions(opportunity.source_url);

  return (
    <main>
      <header className="header">
        <div>
          <Link href="/" className="brand">
            🦷 Radar Odonto
          </Link>

          <p>Concursos e processos seletivos de Odontologia</p>
        </div>

        <LogoutButton />
      </header>

      <section className="detailContainer">
        <Link href="/" className="back">
          ← Voltar para oportunidades
        </Link>

        <div className="detailCard">
          <div className="cardTop">
            <span className="status">
              ●{" "}
              {opportunity.status === "OPEN"
                ? "INSCRIÇÕES ABERTAS"
                : opportunity.status}
            </span>

            <span className="type">
              {formatType(opportunity.type)}
            </span>
          </div>

          <h1>{opportunity.title}</h1>

          <p className="organization detailOrganization">
            {opportunity.organization}

            {opportunity.city && (
              <>
                {" · "}
                {opportunity.city}
                {opportunity.state && `/${opportunity.state}`}
              </>
            )}
          </p>

          <div className="detailGrid">
            <div className="detailBox">
              <span>Remuneração</span>

              <strong>{formatMoney(opportunity.salary_min)}</strong>
            </div>

            <div className="detailBox">
              <span>Jornada</span>

              <strong>
                {opportunity.weekly_hours
                  ? `${opportunity.weekly_hours} horas`
                  : "Não informada"}
              </strong>
            </div>

            <div className="detailBox">
              <span>Vagas</span>

              <strong>
                {opportunity.reserve_list && !opportunity.vacancies
                  ? "Cadastro reserva"
                  : (opportunity.vacancies ?? "Não informado")}
              </strong>
            </div>
          </div>

          <section className="detailSection">
            <h2>Requisitos</h2>

            <div className="requirements">
              <span>✓ Graduação em Odontologia</span>

              {opportunity.requires_cro && <span>✓ Registro ativo no CRO</span>}

              {opportunity.requires_specialization ? (
                <span>
                  ✓ Especialização exigida
                  {opportunity.specialization
                    ? `: ${opportunity.specialization}`
                    : ""}
                </span>
              ) : (
                <span>✓ Não exige especialização</span>
              )}
            </div>
          </section>

          <OpportunityActions opportunity={opportunity} />

          <section className="detailSection">
            <h2>Datas importantes</h2>

            <div className="dates">
              <div>
                <span>Início das inscrições</span>
                <strong>{formatDate(opportunity.registration_start)}</strong>
              </div>

              <div>
                <span>Fim das inscrições</span>
                <strong>{formatDate(opportunity.registration_end)}</strong>
              </div>

              <div>
                <span>Prova</span>
                <strong>{formatDate(opportunity.exam_date)}</strong>
              </div>

              {opportunity.fee_exemption_deadline && (
                <div>
                  <span>Pedido de isenção</span>
                  <strong>{formatDate(opportunity.fee_exemption_deadline)}</strong>
                </div>
              )}
            </div>
          </section>

          <section className="detailSection guidanceSection">
            <h2>Como se inscrever</h2>

            {opportunity.registration_summary ? (
              <p>{opportunity.registration_summary}</p>
            ) : (
              <p>Consulte o edital para confirmar período e procedimento de inscrição.</p>
            )}

            <div className="guidanceGrid">
              <div>
                <span>Taxa de inscrição</span>
                <strong>
                  {opportunity.application_fee === null
                    ? "Não identificada"
                    : formatMoney(opportunity.application_fee)}
                </strong>
              </div>

              <div>
                <span>Local da prova</span>
                <strong>{opportunity.exam_location ?? "Não identificado"}</strong>
              </div>
            </div>

            {opportunity.required_documents?.length ? (
              <div className="checklist">
                <h3>Checklist inicial</h3>
                {opportunity.required_documents.map((document) => (
                  <span key={document}>□ {document}</span>
                ))}
              </div>
            ) : null}

            {opportunity.selection_stages?.length ? (
              <div className="checklist">
                <h3>Etapas identificadas</h3>
                {opportunity.selection_stages.map((stage) => (
                  <span key={stage}>• {stage}</span>
                ))}
              </div>
            ) : null}
          </section>

          {opportunity.description && (
            <section className="detailSection">
              <h2>Sobre a oportunidade</h2>

              <p>{opportunity.description}</p>
            </section>
          )}

          <section className="detailSection">
            <h2>Fontes</h2>

            <div className="sourceButtons">
              {opportunity.official_notice_url && (
                <a
                  href={opportunity.official_notice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primaryButton"
                >
                  📄 Abrir edital
                </a>
              )}

              {opportunity.application_url && (
                <a
                  href={opportunity.application_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primaryButton"
                >
                  📝 Ir para inscrição
                </a>
              )}

              <a
                href={opportunity.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="secondaryButton"
              >
                Abrir fonte oficial
              </a>
            </div>
          </section>

          {revisions.length > 0 && (
            <section className="detailSection">
              <h2>Atualizações do edital</h2>
              <p className="mutedText">
                {revisions.length} versão(ões) detectada(s). A versão mais recente aparece primeiro.
              </p>
              <div className="revisionList">
                {revisions.map((revision) => (
                  <span key={revision.id}>
                    {new Date(revision.detected_at).toLocaleDateString("pt-BR")}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
