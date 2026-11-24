"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type UserState = { is_favorite: boolean; applied: boolean };
type City = { city: string; state: string };
type SourceHealth = { source_id: string; source_name: string; city: string; state: string; last_run_at: string; last_status: string; last_error: string | null; documents_found: number };

function money(value: number | null) { return value === null ? "Não informado" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function date(value: string | null) { if (!value) return "Não informada"; const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function label(type: Opportunity["type"]) { return type === "CONCURSO" ? "Concurso" : type === "PSS" ? "PSS" : "Credenciamento"; }

export function OpportunityBrowser({ opportunities, cities, sourceHealth }: { opportunities: Opportunity[]; cities: City[]; sourceHealth: SourceHealth[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("TODAS");
  const [type, setType] = useState("TODOS");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [states, setStates] = useState<Record<string, UserState>>({});
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [status, setStatus] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN");
  const [supabase] = useState(() => createSupabaseBrowserClient());

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("opportunity_user_state").select("opportunity_id,is_favorite,applied").eq("user_id", userData.user.id);
      const next: Record<string, UserState> = {};
      for (const item of data ?? []) next[item.opportunity_id] = { is_favorite: item.is_favorite, applied: item.applied };
      setStates(next);
      const { data: alert } = await supabase.from("alert_subscriptions").select("enabled").eq("user_id", userData.user.id).maybeSingle();
      setAlertsEnabled(Boolean(alert?.enabled));
    }
    void load();
  }, [supabase]);

  async function updateState(id: string, changes: Partial<UserState>) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const next = { is_favorite: states[id]?.is_favorite ?? false, applied: states[id]?.applied ?? false, ...changes };
    setStates((current) => ({ ...current, [id]: next }));
    await supabase.from("opportunity_user_state").upsert({ user_id: userData.user.id, opportunity_id: id, ...next });
  }

  async function toggleAlerts() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const enabled = !alertsEnabled;
    await supabase.from("alert_subscriptions").upsert({ user_id: userData.user.id, email: userData.user.email, enabled });
    setAlertsEnabled(enabled);
  }

  const cityNames = useMemo(() => [...new Set(cities.map((item) => item.city))], [cities]);
  const filtered = opportunities.filter((item) => {
    const state = states[item.id];
    const text = `${item.title} ${item.organization} ${item.city ?? ""}`.toLowerCase();
    return (status === "ALL" || item.status === status) && text.includes(query.toLowerCase()) && (city === "TODAS" || item.city === city) && (type === "TODOS" || item.type === type) && (!favoritesOnly || state?.is_favorite);
  });

  return <>
    <div className="statusTabs"><button className={status === "OPEN" ? "filterActive" : ""} onClick={() => setStatus("OPEN")}>Abertas ({opportunities.filter((item) => item.status === "OPEN").length})</button><button className={status === "CLOSED" ? "filterActive" : ""} onClick={() => setStatus("CLOSED")}>Encerradas ({opportunities.filter((item) => item.status !== "OPEN").length})</button><button className={status === "ALL" ? "filterActive" : ""} onClick={() => setStatus("ALL")}>Todas ({opportunities.length})</button></div>
    <div className="filtersToolbar">
      <input className="searchInput" placeholder="Buscar cargo, órgão ou cidade..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <select value={city} onChange={(event) => setCity(event.target.value)}><option value="TODAS">Todas as cidades</option>{cityNames.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={type} onChange={(event) => setType(event.target.value)}><option value="TODOS">Todos os tipos</option><option value="CONCURSO">Concurso</option><option value="PSS">PSS</option><option value="CREDENCIAMENTO">Credenciamento</option></select>
      <button className={favoritesOnly ? "filterActive" : ""} onClick={() => setFavoritesOnly(!favoritesOnly)}>★ Favoritos</button>
      <button className={alertsEnabled ? "filterActive" : ""} onClick={toggleAlerts}>{alertsEnabled ? "🔔 Alertas ativos" : "🔕 Ativar alertas"}</button>
    </div>
    <p className="resultCount">{filtered.length} oportunidade(s) encontrada(s)</p>
    {filtered.length === 0 ? <div className="empty">Nenhuma oportunidade corresponde aos filtros.</div> : <div className="grid">{filtered.map((item) => {
      const state = states[item.id];
      return <article className="card" key={item.id}>
        <div className="cardTop"><span className="status">● {item.status === "OPEN" ? "INSCRIÇÕES ABERTAS" : item.status}</span><span className="type">{label(item.type)}</span></div>
        <h3>{item.title}</h3><p className="organization">{item.organization} · {item.city}/{item.state}</p>
        <div className="info"><div><span>Remuneração</span><strong>{money(item.salary_min)}</strong></div><div><span>Jornada</span><strong>{item.weekly_hours ? `${item.weekly_hours}h` : "—"}</strong></div><div><span>Vagas</span><strong>{item.reserve_list && !item.vacancies ? "CR" : (item.vacancies ?? "—")}</strong></div></div>
        <div className="requirements"><span>✓ Graduação em Odontologia</span>{item.requires_cro && <span>✓ CRO</span>}<span>Inscrições até {date(item.registration_end)}</span></div>
        <div className="cardActions"><button onClick={() => updateState(item.id, { is_favorite: !state?.is_favorite })}>{state?.is_favorite ? "★ Favoritado" : "☆ Favoritar"}</button><button onClick={() => updateState(item.id, { applied: !state?.applied })}>{state?.applied ? "✓ Inscrito" : "Marcar inscrição"}</button></div>
        <Link href={`/concurso/${item.id}`} className="details">Ver detalhes →</Link>
      </article>;
    })}</div>}
    <section className="sourceHealth"><h2>Monitoramento das fontes</h2><div className="sourceHealthGrid">{cities.map((item) => { const health = sourceHealth.find((source) => source.city === item.city); return <div className="sourceHealthCard" key={item.city}><strong>{item.city}/{item.state}</strong><span className={health?.last_status === "ERROR" ? "healthError" : "healthOk"}>{health ? `● ${health.last_status === "ERROR" ? "Erro" : "OK"}` : "● Ainda não consultada"}</span><small>{health ? `${health.documents_found} documento(s) · ${new Date(health.last_run_at).toLocaleString("pt-BR")}` : "Aguardando primeira consulta"}</small>{health?.last_error && <small>{health.last_error}</small>}</div>; })}</div></section>
  </>;
}
