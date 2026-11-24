import { extractPdfFromUrl } from "./pdf";
import { isDentistryOpportunity } from "./normalize";
import { extractDentistryOpportunity } from "./extract";
import { saveOpportunity } from "./database";
import { findContexts } from "./debug";
import { validateOpportunity } from "./validate";
import {
  getProcessedDocument,
  markDocumentFailed,
  markDocumentProcessed,
} from "./documents";
import { radarSources } from "./sources/registry";

import type { RadarSource } from "./sources/types";

import type { DiscoveredNotice } from "./discovery/types";

async function processDocument(
  source: RadarSource,
  document: DiscoveredNotice,
) {
  const { title, url } = document;

  console.log("");
  console.log("────────────────────────────");

  console.log(`📄 ${title}`);

  console.log(`🔗 ${url}`);

  const previous = await getProcessedDocument(url);

  try {
    const pdf = await extractPdfFromUrl(url);

    if (
      previous?.processing_status === "PROCESSED" &&
      previous.content_hash === pdf.hash &&
      process.env.CRAWLER_REPROCESS !== "true" &&
      !process.argv.includes("--reprocess")
    ) {
      console.log("⏭️ Documento já processado e sem alterações.");

      return;
    }

    if (!isDentistryOpportunity(pdf.text)) {
      console.log("⏭️ Não possui oportunidade de Odontologia.");

      await markDocumentProcessed({
        sourceName: source.name,

        documentUrl: url,

        title,

        hash: pdf.hash,

        hasDentistry: false,
      });

      return;
    }

    console.log("🦷 Odontologia encontrada!");

    const cargoContexts = findContexts(
      pdf.text,
      ["cirurgião dentista", "cirurgião-dentista"],
      3,
      6,
    );

    console.log("");
    console.log("🔬 CONTEXTO DO CARGO");

    cargoContexts.slice(0, 5).forEach((context, index) => {
      console.log("");
      console.log(`--- ${index + 1} ---`);

      console.log(context);
    });

    const dateContexts = findContexts(
      pdf.text,
      ["inscrições", "período de inscrição", "período das inscrições"],
      2,
      5,
    );

    console.log("");
    console.log("📅 CONTEXTO DAS INSCRIÇÕES");

    dateContexts.slice(0, 5).forEach((context, index) => {
      console.log("");
      console.log(`--- ${index + 1} ---`);

      console.log(context);
    });

    if (!document.type) {
      console.log("⚠️ Tipo do processo não identificado com segurança.");

      return;
    }

    const opportunity = extractDentistryOpportunity(pdf.text, {
      sourceUrl: url,

      sourceName: source.name,

      organization: source.organization,

      city: source.city,

      state: source.state,

      type: document.type,
    });

    if (!opportunity) {
      console.log(
        "⚠️ Odontologia encontrada, mas não foi possível estruturar o cargo.",
      );

      return;
    }

    console.log("");
    console.log("🎯 Dados extraídos:");

    console.log(`   Cargo: ${opportunity.title}`);

    console.log(
      `   Salário: ${
        opportunity.salary_min !== null
          ? opportunity.salary_min.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "não identificado"
      }`,
    );

    console.log(
      `   Jornada: ${
        opportunity.weekly_hours !== null
          ? `${opportunity.weekly_hours}h`
          : "não identificada"
      }`,
    );

    console.log(
      `   Vagas: ${opportunity.vacancies ?? "não identificadas"}${
        opportunity.reserve_list ? " + CR" : ""
      }`,
    );

    console.log(
      `   Inscrições: ${opportunity.registration_start ?? "?"} → ${
        opportunity.registration_end ?? "?"
      }`,
    );

    console.log(`   Status: ${opportunity.status}`);

    const validation = validateOpportunity(opportunity);

    console.log("");
    console.log("🛡️ VALIDAÇÃO");

    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      console.log("   ✅ Nenhum problema encontrado.");
    }

    for (const warning of validation.warnings) {
      console.log(`   ⚠️ ${warning}`);
    }

    for (const error of validation.errors) {
      console.log(`   ❌ ${error}`);
    }

    if (!validation.valid) {
      console.log("   ⛔ Registro não será salvo.");

      return;
    }

    await saveOpportunity(opportunity);

    await markDocumentProcessed({
      sourceName: source.name,

      documentUrl: url,

      title,

      hash: pdf.hash,

      hasDentistry: true,
    });

    console.log("📚 Documento registrado como processado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    try {
      await markDocumentFailed({
        sourceName: source.name,

        documentUrl: url,

        title,

        error: message,
      });
    } catch (documentError) {
      console.error("⚠️ Não foi possível registrar a falha do documento.");

      console.error(documentError);
    }

    /*
     * Um edital quebrado não pode derrubar
     * todo o Radar.
     */
    console.error(`❌ Falha ao processar ${title}`);

    console.error(error instanceof Error ? error.message : error);
  }
}

async function processSource(source: RadarSource) {
  console.log("");
  console.log(`🔭 Monitorando ${source.city}/${source.state}...`);

  const documents = await source.discover();

  console.log("");
  console.log(`🔭 ${documents.length} documento(s) candidato(s)`);

  for (const document of documents) {
    await processDocument(source, document);
  }
}

async function main() {
  console.log("");
  console.log("🦷 RADAR ODONTO");

  console.log("============================");

  console.log("🤖 CRAWLER AUTOMÁTICO");

  const sources = [...radarSources].sort((a, b) => a.priority - b.priority);

  console.log("");
  console.log(`📡 ${sources.length} fonte(s) ativa(s)`);

  for (const source of sources) {
    try {
      await processSource(source);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      console.error("");
      console.error(`❌ Falha na fonte ${source.name}`);

      console.error(message);
    }
  }

  console.log("");
  console.log("============================");

  console.log("🏁 Radar finalizado!");
}

main().catch((error) => {
  console.error("");
  console.error("💥 Erro fatal no Radar:");

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
