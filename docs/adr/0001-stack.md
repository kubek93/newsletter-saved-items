# Supabase, Vercel, Resend and Google OAuth as the stack

Supabase provides the database, auth and file storage; the application code (Panel, ingest endpoint, analysis jobs, Digest sending) runs as one Next.js app on Vercel; Resend sends the Digest; Google OAuth is the only login. Chosen because the Owner already has paid accounts on Supabase (Pro) and Vercel (Pro); no alternatives were evaluated. Application code deliberately does not run in Supabase Edge Functions: one codebase, one deploy, one place to debug.
