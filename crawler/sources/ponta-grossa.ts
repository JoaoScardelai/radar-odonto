import { discoverPontaGrossa } from "../discovery/ponta-grossa";
import type { RadarSource } from "./types";

export const pontaGrossaSource: RadarSource = {
  id: "ponta-grossa-pr",
  name: "Prefeitura de Ponta Grossa",
  organization: "Município de Ponta Grossa",
  city: "Ponta Grossa",
  state: "PR",
  region: "OUTRA",
  priority: 4,
  discover: discoverPontaGrossa,
};
