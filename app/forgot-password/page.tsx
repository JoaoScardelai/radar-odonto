"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError("Não foi possível enviar o link de recuperação.");
    } else {
      setMessage("Confira o e-mail. O link permite criar uma nova senha.");
    }

    setLoading(false);
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="brand">🦷 Radar Odonto</div>
        <p className="authSubtitle">Recupere o acesso à sua conta.</p>

        <form onSubmit={handleSubmit} className="authForm">
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          {message && <p className="authMessage">{message}</p>}
          {error && <p className="authError">{error}</p>}

          <button type="submit" className="primaryButton" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link"}
          </button>

          <Link href="/login" className="forgotLink">
            Voltar para login
          </Link>
        </form>
      </section>
    </main>
  );
}
