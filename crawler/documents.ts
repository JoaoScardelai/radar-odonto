import { supabaseAdmin } from "@/lib/supabase-admin";

export interface ProcessedDocument {
  id: string;
  source_name: string;
  document_url: string;
  title: string | null;
  content_hash: string | null;
  has_dentistry: boolean | null;
  processing_status: "PENDING" | "PROCESSED" | "FAILED";
  last_error: string | null;
  first_seen_at: string;
  last_seen_at: string;
  last_processed_at: string | null;
}

export async function getProcessedDocument(
  documentUrl: string,
): Promise<ProcessedDocument | null> {
  const { data, error } = await supabaseAdmin
    .from("processed_documents")
    .select("*")
    .eq("document_url", documentUrl)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao consultar documento: ${error.message}`);
  }

  return data as ProcessedDocument | null;
}

export async function markDocumentProcessed(params: {
  sourceName: string;
  documentUrl: string;
  title: string;
  hash: string;
  hasDentistry: boolean;
}) {
  const now = new Date().toISOString();

  const { error: revisionError } = await supabaseAdmin
    .from("document_revisions")
    .upsert(
      {
        document_url: params.documentUrl,
        source_name: params.sourceName,
        title: params.title,
        content_hash: params.hash,
      },
      { onConflict: "document_url,content_hash", ignoreDuplicates: true },
    );

  if (revisionError) {
    throw new Error(`Erro ao registrar versão do documento: ${revisionError.message}`);
  }

  const { error } = await supabaseAdmin.from("processed_documents").upsert(
    {
      source_name: params.sourceName,

      document_url: params.documentUrl,

      title: params.title,

      content_hash: params.hash,

      has_dentistry: params.hasDentistry,

      processing_status: "PROCESSED",

      last_error: null,

      last_seen_at: now,

      last_processed_at: now,
    },
    {
      onConflict: "document_url",
    },
  );

  if (error) {
    throw new Error(`Erro ao registrar documento: ${error.message}`);
  }
}

export async function markDocumentFailed(params: {
  sourceName: string;
  documentUrl: string;
  title: string;
  error: string;
}) {
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin.from("processed_documents").upsert(
    {
      source_name: params.sourceName,

      document_url: params.documentUrl,

      title: params.title,

      processing_status: "FAILED",

      last_error: params.error,

      last_seen_at: now,

      last_processed_at: now,
    },
    {
      onConflict: "document_url",
    },
  );

  if (error) {
    throw new Error(`Erro ao registrar falha: ${error.message}`);
  }
}
