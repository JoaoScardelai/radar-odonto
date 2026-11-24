"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Opportunity } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type UserState = { is_favorite: boolean; applied: boolean };

function money(value: number | null) { return value === null ? "Não informado" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function date(value: string | null) { if (!value) return "Não informada"; const [year, month, day] = value.split("-"); return `${day}/${month}/${year}`; }
function label(type: Opportunity["type"]) { return type === "CONCURSO" ? "Concurso" : type === "PSS" ? "PSS" : "Credenciamento"; }

export function OpportunityBrowser({ opportunities }: { opportunities: Opportunity[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("TODAS");
  const [type, setType] = useState("TODOS");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [states, setStates] = useState<Record<string, UserState>>({});
  const [alertsEnabled, setAlertsEnabled] = useState(false);
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

  const cities = useMemo(() => [...new Set(opportunities.map((item) => item.city).filter(Boolean))] as string[], [opportunities]);
  const filtered = opportunities.filter((item) => {
    const state = states[item.id];
    const text = `${item.title} ${item.organization} ${item.city ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (city === "TODAS" || item.city === city) && (type === "TODOS" || item.type === type) && (!favoritesOnly || state?.is_favorite);
  });

  return <>
    <div className="filtersToolbar">
      <input className="searchInput" placeholder="Buscar cargo, órgão ou cidade..." value={query} onChange={(event) => setQuery(event.target.value)} />
      <select value={city} onChange={(event) => setCity(event.target.value)}><option value="TODAS">Todas as cidades</option>{cities.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={type} onChange={(event) => setType(event.target.value)}><option value="TODOS">Todos os tipos</option><option value="CONCURSO">Concurso</option><option value="PSS">PSS</option><option value="CREDENCIAMENTO">Credenciamento</option></select>
      <button className={favoritesOnly ? "filterActive" : ""} onClick={() => setFavoritesOnly(!favoritesOnly)}>★ Favoritos</button>
      <button className={alertsEnabled ? "filterActive" : ""} onClick={toggleAlerts}>{alertsEnabled ? "🔔 Alertas ativos" : "🔕 Ativar alertas"}</button>
    </div>
    <p className="resultCount">{filtered.length} oportunidade(s) encontrada(s)</p>
    {filtered.length === 0 ? <div className="empty">Nenhuma oportunidade corresponde aos filtros.</div> : <div className="grid">{filtered.map((item) => {
      const state = states[item.id];
      return <article className="card" key={item.id}>
        <div className="cardTop"><span className="status">● INSCRIÇÕES ABERTAS</span><span className="type">{label(item.type)}</span></div>
        <h3>{item.title}</h3><p className="organization">{item.organization} · {item.city}/{item.state}</p>
        <div className="info"><div><span>Remuneração</span><strong>{money(item.salary_min)}</strong></div><div><span>Jornada</span><strong>{item.weekly_hours ? `${item.weekly_hours}h` : "—"}</strong></div><div><span>Vagas</span><strong>{item.reserve_list && !item.vacancies ? "CR" : (item.vacancies ?? "—")}</strong></div></div>
        <div className="requirements"><span>✓ Graduação em Odontologia</span>{item.requires_cro && <span>✓ CRO</span>}<span>Inscrições até {date(item.registration_end)}</span></div>
        <div className="cardActions"><button onClick={() => updateState(item.id, { is_favorite: !state?.is_favorite })}>{state?.is_favorite ? "★ Favoritado" : "☆ Favoritar"}</button><button onClick={() => updateState(item.id, { applied: !state?.applied })}>{state?.applied ? "✓ Inscrito" : "Marcar inscrição"}</button></div>
        <Link href={`/concurso/${item.id}`} className="details">Ver detalhes →</Link>
      </article>;
    })}</div>}
  </>;
}
