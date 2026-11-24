import type { RadarSource } from "./types";

import { discoverCascavel } from "../discovery/cascavel";

export const cascavelSource: RadarSource = {
  id: "cascavel-pr",

  name: "Prefeitura de Cascavel",

  organization: "Município de Cascavel",

  city: "Cascavel",

  state: "PR",

  region: "OESTE",

  priority: 0,

  discover: discoverCascavel,
};
