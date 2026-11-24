import type { RadarSource } from "./types";

import { cascavelSource } from "./cascavel";

import { toledoSource } from "./toledo";

import { cambiraSource } from "./cambira";

import { curitibaSource } from "./curitiba";

export const radarSources: RadarSource[] = [
  curitibaSource,

  cascavelSource,
  toledoSource,
  cambiraSource,
];
