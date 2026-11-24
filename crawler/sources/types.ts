import type { DiscoveredNotice } from "../discovery/types";

export interface RadarSource {
  id: string;

  name: string;

  city: string;
  state: string;

  region: "OESTE" | "NORTE_CENTRAL" | "OUTRA";

  priority: number;

  organization: string;

  discover: () => Promise<DiscoveredNotice[]>;
}
