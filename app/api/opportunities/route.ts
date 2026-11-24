import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("registration_end", {
      ascending: true,
    });

  if (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Não foi possível buscar as oportunidades.",
        details: error.message,
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    count: data.length,
    opportunities: data,
  });
}