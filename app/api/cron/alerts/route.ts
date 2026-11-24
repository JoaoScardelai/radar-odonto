import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function formatDate(value: string | null) {
  if (!value) return "Prazo não informado";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatMoney(value: number | null) {
  if (value === null) return "Remuneração não informada";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expected || authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!resendKey || !from) {
    return NextResponse.json({ error: "Alertas não configurados." }, { status: 503 });
  }

  const { data: subscriptions, error } = await supabaseAdmin
    .from("alert_subscriptions")
    .select("user_id,email,cities,types,minimum_salary,last_sent_at")
    .eq("enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    const since = subscription.last_sent_at ?? new Date(Date.now() - 86_400_000).toISOString();
    let query = supabaseAdmin.from("opportunities").select("title,city,type,salary_min,registration_end,source_url").eq("status", "OPEN").gt("created_at", since).limit(20);
    if (subscription.cities?.length) query = query.in("city", subscription.cities);
    if (subscription.types?.length) query = query.in("type", subscription.types);
    if (subscription.minimum_salary !== null) query = query.gte("salary_min", subscription.minimum_salary);
    const { data: opportunities } = await query;
    if (!opportunities?.length) continue;

    const cards = opportunities.map((item) => `
      <div style="background:#ffffff;border:1px solid #e4e9e7;border-radius:14px;margin:16px 0;padding:20px;">
        <div style="color:#16815c;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">${escapeHtml(item.type)} · INSCRIÇÕES ABERTAS</div>
        <h2 style="color:#17202a;font-size:20px;line-height:1.3;margin:10px 0 8px;">${escapeHtml(item.title)}</h2>
        <p style="color:#66737d;font-size:14px;margin:0 0 16px;">${escapeHtml(item.city ?? "Cidade não informada")}</p>
        <table role="presentation" style="width:100%;font-size:13px;color:#66737d;"><tr>
          <td><strong style="color:#17202a;display:block;">Prazo</strong>${formatDate(item.registration_end)}</td>
          <td><strong style="color:#17202a;display:block;">Remuneração</strong>${formatMoney(item.salary_min)}</td>
        </tr></table>
        <a href="${escapeHtml(item.source_url)}" style="background:#16815c;border-radius:8px;color:#ffffff;display:inline-block;font-size:14px;font-weight:700;margin-top:18px;padding:11px 16px;text-decoration:none;">Ver oportunidade →</a>
      </div>`).join("");
    const html = `<!doctype html><html><body style="background:#f5f8f6;margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#17202a;"><div style="max-width:620px;margin:0 auto;padding:28px 18px;"><div style="background:#0f6f51;border-radius:16px 16px 0 0;padding:24px 26px;color:#ffffff;"><div style="font-size:22px;font-weight:800;">🦷 Radar Odonto</div><div style="font-size:13px;margin-top:6px;opacity:.9;">Oportunidades de Odontologia selecionadas para você</div></div><div style="background:#ffffff;border-radius:0 0 16px 16px;padding:26px;"><p style="color:#66737d;font-size:15px;margin:0 0 4px;">Olá!</p><h1 style="font-size:25px;margin:0 0 8px;">Encontramos novas oportunidades</h1><p style="color:#66737d;font-size:15px;line-height:1.5;margin:0 0 20px;">Confira os editais recentes que podem combinar com seu perfil.</p>${cards}<p style="color:#89949c;font-size:12px;line-height:1.5;margin:24px 0 0;">As informações devem ser confirmadas no edital e na fonte oficial antes da inscrição.</p></div><p style="color:#89949c;font-size:12px;text-align:center;margin:18px 0;">Radar Odonto · Monitoramento de concursos e processos seletivos</p></div></body></html>`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [subscription.email], subject: "Novas oportunidades de Odontologia", html }),
    });
    if (response.ok) {
      await supabaseAdmin.from("alert_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("user_id", subscription.user_id);
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
