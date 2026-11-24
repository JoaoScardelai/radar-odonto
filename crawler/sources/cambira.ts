import type { RadarSource } from "./types";

import { discoverCambira } from "../discovery/cambira";

export const cambiraSource: RadarSource = {
  id: "cambira-pr",

  name: "Prefeitura de Cambira",

  organization: "Autarquia Municipal de Saúde de Cambira",

  city: "Cambira",

  state: "PR",

  region: "NORTE_CENTRAL",

  priority: 2,

  discover: discoverCambira,
};
