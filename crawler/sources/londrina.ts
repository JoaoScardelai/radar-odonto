import { discoverLondrina } from "../discovery/londrina";
import type { RadarSource } from "./types";

export const londrinaSource: RadarSource = {
  id: "londrina-pr",
  name: "Prefeitura de Londrina",
  organization: "Município de Londrina",
  city: "Londrina",
  state: "PR",
  region: "NORTE_CENTRAL",
  priority: 3,
  discover: discoverLondrina,
};
