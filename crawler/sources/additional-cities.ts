import { discoverMunicipal } from "../discovery/municipal";
import type { RadarSource } from "./types";

function municipalSource(config: {
  id: string;
  name: string;
  city: string;
  region: RadarSource["region"];
  listUrl: string;
}): RadarSource {
  return {
    id: config.id,
    name: config.name,
    organization: `Município de ${config.city}`,
    city: config.city,
    state: "PR",
    region: config.region,
    priority: 5,
    discover: () => discoverMunicipal({ listUrl: config.listUrl, source: config.name }),
  };
}

export const additionalCitySources: RadarSource[] = [
  municipalSource({ id: "sao-jose-dos-pinhais-pr", name: "Prefeitura de São José dos Pinhais", city: "São José dos Pinhais", region: "OUTRA", listUrl: "https://editaisconcursos.sjp.pr.gov.br/servicos/editaisconcursos/concurso_index.php" }),
  municipalSource({ id: "foz-do-iguacu-pr", name: "Prefeitura de Foz do Iguaçu", city: "Foz do Iguaçu", region: "OESTE", listUrl: "https://transparencia.foz.pr.gov.br/portaltransparencia/" }),
  municipalSource({ id: "maringa-pr", name: "Prefeitura de Maringá", city: "Maringá", region: "NORTE_CENTRAL", listUrl: "https://transparencia.maringa.pr.gov.br/portaltransparencia/" }),
  municipalSource({ id: "guarapuava-pr", name: "Prefeitura de Guarapuava", city: "Guarapuava", region: "OUTRA", listUrl: "https://guarapuava.atende.net/transparencia/item/concursos-e-seletivos" }),
  municipalSource({ id: "araucaria-pr", name: "Prefeitura de Araucária", city: "Araucária", region: "OUTRA", listUrl: "https://ws-araucaria.atende.net/cidadao/pagina/concursos-publicos-2026" }),
  municipalSource({ id: "campo-largo-pr", name: "Prefeitura de Campo Largo", city: "Campo Largo", region: "OUTRA", listUrl: "https://www.campolargo.pr.gov.br/cidadao/pagina/concursos-2026" }),
  municipalSource({ id: "paranagua-pr", name: "Prefeitura de Paranaguá", city: "Paranaguá", region: "OUTRA", listUrl: "https://www.paranagua.pr.gov.br/concursos" }),
  municipalSource({ id: "umuarama-pr", name: "Prefeitura de Umuarama", city: "Umuarama", region: "NORTE_CENTRAL", listUrl: "https://www.umuarama.pr.gov.br/concursos" }),
];
