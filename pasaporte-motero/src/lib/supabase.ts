
import { createClient } from '@supabase/supabase-js'

// Configuración pública de Supabase.
// Sustituye estos valores por los de tu proyecto.
const supabaseUrl = 'https://vngbrvfvoqdrhnxcnmdu.supabase.co'
const supabasePublishableKey = 'sb_publishable_KLOPofxxzkpLRJOwrS95sQ_2j8e7k7o'

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pasaporte-motero-auth-v1' } })
  : null
