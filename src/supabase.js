import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://rutrnhigmtvzvxfgvktd.supabase.co'  // ← aanpassen
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1dHJuaGlnbXR2enZ4Zmd2a3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNTI4NTgsImV4cCI6MjA5MjgyODg1OH0.6Qejm-5pjL4fzqLjEYAHc_5X790nZbSNcrkV0PgQHRE'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
export const BUCKET = 'Hamy School Files'