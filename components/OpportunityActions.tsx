"use client";

import { useEffect, useState } from "react";
import type { Opportunity } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function OpportunityActions({ opportunity }: { opportunity: Opportunity }) {
  const [favorite, setFavorite] = useState(false);
  const [applied, setApplied] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const documents = opportunity.required_documents ?? [];

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase.from("opportunity_user_state")
        .select("is_favorite,applied,completed_documents")
        .eq("user_id", userData.user.id)
        .eq("opportunity_id", opportunity.id)
        .maybeSingle();
      setFavorite(Boolean(data?.is_favorite));
      setApplied(Boolean(data?.applied));
      setCompleted(data?.completed_documents ?? []);
    }
    void load();
  }, [opportunity.id, supabase]);

  async function save(changes: Record<string, unknown>) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("opportunity_user_state").upsert({
      user_id: userData.user.id,
      opportunity_id: opportunity.id,
      is_favorite: favorite,
      applied,
      completed_documents: completed,
      ...changes,
    });
  }

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(opportunity.title)}&dates=${opportunity.exam_date?.replaceAll("-", "") ?? ""}/${opportunity.exam_date?.replaceAll("-", "") ?? ""}&details=${encodeURIComponent(opportunity.official_notice_url ?? opportunity.source_url)}`;

  return (
    <section className="detailSection personalSection">
      <h2>Meu acompanhamento</h2>
      <div className="personalActions">
        <button onClick={() => { const value = !favorite; setFavorite(value); void save({ is_favorite: value }); }}>
          {favorite ? "★ Favoritado" : "☆ Favoritar"}
        </button>
        <button onClick={() => { const value = !applied; setApplied(value); void save({ applied: value }); }}>
          {applied ? "✓ Já me inscrevi" : "Marcar como inscrito"}
        </button>
        {opportunity.exam_date && <a href={calendarUrl} target="_blank" rel="noreferrer">Adicionar prova ao calendário</a>}
      </div>
      {documents.length > 0 && <div className="checklist"><h3>Checklist pessoal</h3>{documents.map((document) => {
        const checked = completed.includes(document);
        return <label key={document} className="checkItem"><input type="checkbox" checked={checked} onChange={() => {
          const next = checked ? completed.filter((item) => item !== document) : [...completed, document];
          setCompleted(next); void save({ completed_documents: next });
        }} />{document}</label>;
      })}</div>}
    </section>
  );
}
