import { extractPdfFromUrl } from "./pdf";

import { findDentistryMatches, isDentistryOpportunity } from "./normalize";

import { extractDentistryOpportunity } from "./extract";

import { saveOpportunity } from "./database";

async function main() {
  console.log("");
  console.log("🦷 RADAR ODONTO");
  console.log("============================");
  console.log("");

  const editalUrl = process.env.CRAWLER_TEST_URL;

  if (!editalUrl) {
    throw new Error("CRAWLER_TEST_URL não configurada.");
  }

  const pdf = await extractPdfFromUrl(editalUrl);

  console.log("");
  console.log(`📚 ${pdf.pages} páginas`);

  console.log(`📝 ${pdf.text.length.toLocaleString("pt-BR")} caracteres`);

  if (!isDentistryOpportunity(pdf.text)) {
    console.log("❌ Nenhuma oportunidade de Odontologia.");

    return;
  }

  console.log("");
  console.log("✅ Odontologia encontrada!");

  const matches = findDentistryMatches(pdf.text);

  console.log(`🔎 ${matches.length} evidências encontradas`);

  const opportunity = extractDentistryOpportunity(pdf.text, {
    sourceUrl: editalUrl,

    organization: "Prefeitura Municipal de Turvo",

    city: "Turvo",

    state: "PR",

    type: "PSS",

    sourceName: "Prefeitura de Turvo",
  });

  if (!opportunity) {
    console.log("⚠️ Não foi possível estruturar a oportunidade.");

    return;
  }

  console.log("");
  console.log("🎯 OPORTUNIDADE EXTRAÍDA");

  console.log("============================");

  console.log(JSON.stringify(opportunity, null, 2));

  console.log("");

  const saved = await saveOpportunity(opportunity);

  console.log("");
  console.log(`🆔 ID: ${saved.id}`);

  console.log(`📊 Status: ${saved.status}`);

  console.log("");
  console.log("🏁 Crawler finalizado com sucesso!");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Crawler falhou:");

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
