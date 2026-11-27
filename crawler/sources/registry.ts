import type { RadarSource } from "./types";

import { cascavelSource } from "./cascavel";

import { toledoSource } from "./toledo";

import { cambiraSource } from "./cambira";

import { curitibaSource } from "./curitiba";

import { londrinaSource } from "./londrina";

import { pontaGrossaSource } from "./ponta-grossa";

import { additionalCitySources } from "./additional-cities";

export const radarSources: RadarSource[] = [
  curitibaSource,

  cascavelSource,
  toledoSource,
  cambiraSource,

  londrinaSource,
  pontaGrossaSource,

  ...additionalCitySources,
];
