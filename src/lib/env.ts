function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const env = {
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  ingestToken: required("INGEST_TOKEN"),
  openrouterApiKey: required("OPENROUTER_API_KEY"),
  openrouterModel: required("OPENROUTER_MODEL"),
  jinaApiKey: required("JINA_API_KEY"),
};
