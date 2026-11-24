import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

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

    const html = `<h2>Novas oportunidades no Radar Odonto</h2><ul>${opportunities.map((item) => `<li><a href="${item.source_url}">${item.title}</a> — ${item.city ?? ""} — ${item.type}</li>`).join("")}</ul>`;
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
