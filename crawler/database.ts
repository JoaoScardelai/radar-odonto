import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CrawledOpportunity } from "./types";

export async function saveOpportunity(opportunity: CrawledOpportunity) {
  console.log("");
  console.log("💾 Salvando no Supabase...");

  const { data, error } = await supabaseAdmin
    .from("opportunities")
    .upsert(
      {
        ...opportunity,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: "external_key",
      },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao salvar oportunidade: ${error.message}`);
  }

  console.log("✅ Oportunidade salva!");

  return data;
}
