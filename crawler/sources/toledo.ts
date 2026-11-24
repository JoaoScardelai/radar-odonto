import type { RadarSource } from "./types";
import { discoverToledo } from "../discovery/toledo";

export const toledoSource: RadarSource = {
  id: "toledo-pr",

  name: "Prefeitura de Toledo",

  organization: "Município de Toledo",

  city: "Toledo",

  state: "PR",

  region: "OESTE",

  priority: 1,

  discover: discoverToledo,
};
