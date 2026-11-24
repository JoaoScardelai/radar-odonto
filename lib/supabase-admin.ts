import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// No crawler local, carrega .env.local. Em CI/Vercel, preserva as variáveis injetadas.
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada");
}

if (!secret) {
  throw new Error("SUPABASE_SECRET_KEY não configurada");
}

export const supabaseAdmin = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
