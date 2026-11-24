import { discoverCambira } from "./discovery/cambira";

async function main() {
  console.log("");
  console.log("🦷 RADAR ODONTO");
  console.log("============================");
  console.log("🔭 DISCOVERY");
  console.log("");

  const results = await discoverCambira();

  console.log("");
  console.log(`🎯 ${results.length} edital(is) candidato(s)`);

  console.log("");

  if (results.length === 0) {
    console.log("Nenhum edital candidato encontrado.");
  } else {
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);

      console.log(`   ${result.url}`);

      console.log("");
    });
  }

  console.log("============================");

  console.log("🏁 Discovery finalizado");
}

main().catch((error) => {
  console.error("");
  console.error("❌ Discovery falhou:");

  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
});
