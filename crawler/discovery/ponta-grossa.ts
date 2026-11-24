import { discoverMunicipal } from "./municipal";
import type { DiscoveredNotice } from "./types";

export function discoverPontaGrossa(): Promise<DiscoveredNotice[]> {
  return discoverMunicipal({
    listUrl: "https://www.pontagrossa.pr.gov.br/concursos/",
    source: "Prefeitura de Ponta Grossa",
  });
}
