import { discoverMunicipal } from "./municipal";
import type { DiscoveredNotice } from "./types";

export function discoverLondrina(): Promise<DiscoveredNotice[]> {
  return discoverMunicipal({
    listUrl: "https://portal.londrina.pr.gov.br/certames-publicos-oculto/administracao-direta-testes-seletivos/testes-seletivos-pml",
    source: "Prefeitura de Londrina",
  });
}
