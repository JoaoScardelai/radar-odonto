import { discoverCuritiba } from "../discovery/curitiba";
import type { RadarSource } from "./types";

export const curitibaSource: RadarSource = {
  id: "curitiba-pr",
  name: "Prefeitura de Curitiba",
  organization: "Município de Curitiba",
  city: "Curitiba",
  state: "PR",
  region: "OUTRA",
  priority: 0,
  discover: discoverCuritiba,
};
