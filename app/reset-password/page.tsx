"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setReady(Boolean(sessionData.session));
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As senhas não conferem.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Link expirado. Solicite uma nova recuperação.");
      return;
    }

    setMessage("Senha alterada. Você será redirecionado.");
    setTimeout(() => router.push("/"), 800);
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="brand">🦷 Radar Odonto</div>
        <p className="authSubtitle">Crie uma nova senha.</p>

        {!ready ? (
          <p className="authMessage">Validando link de recuperação...</p>
        ) : (
          <form onSubmit={handleSubmit} className="authForm">
            <label>
              Nova senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            <label>
              Confirmar senha
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>

            {message && <p className="authMessage">{message}</p>}
            {error && <p className="authError">{error}</p>}

            <button type="submit" className="primaryButton">
              Salvar nova senha
            </button>
          </form>
        )}

        <Link href="/login" className="forgotLink">
          Voltar para login
        </Link>
      </section>
    </main>
  );
}
