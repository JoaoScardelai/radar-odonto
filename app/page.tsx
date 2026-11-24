import { supabase } from "@/lib/supabase";
import type { Opportunity } from "@/lib/types";
import { LogoutButton } from "@/components/LogoutButton";
import { OpportunityBrowser } from "@/components/OpportunityBrowser";
import { monitoredCities } from "@/lib/municipalities";

export const dynamic = "force-dynamic";

async function getOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await supabase.from("opportunities").select("*").order("registration_end", { ascending: true });
  if (error) { console.error("Erro ao buscar oportunidades:", error); return []; }
  return data as Opportunity[];
}

export default async function Home() {
  const opportunities = await getOpportunities();
  const { data: sourceHealth } = await supabase.from("source_health").select("*").order("city");
  return <main>
    <header className="header"><div><div className="brand">🦷 Radar Odonto</div><p>Concursos, processos seletivos e credenciamentos de Odontologia</p></div><span className="counter">{opportunities.filter((item) => item.status === "OPEN").length} abertas</span><LogoutButton /></header>
    <section className="container"><div className="hero"><span className="eyebrow">RADAR DE OPORTUNIDADES</span><h1>Encontre oportunidades em Odontologia.</h1><p>Pesquise, favorite, acompanhe inscrições e receba alertas.</p></div><OpportunityBrowser opportunities={opportunities} cities={monitoredCities} sourceHealth={sourceHealth ?? []} /></section>
  </main>;
}
