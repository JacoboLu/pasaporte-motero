import { createClient } from '@supabase/supabase-js'
import { encryptedAuthStorage } from './secure-storage'

// Configuración pública de Supabase.
// La clave publishable está diseñada para usarse en el navegador; los permisos
// reales se controlan mediante RLS en la base de datos.
const supabaseUrl = 'https://vngbrvfvoqdrhnxcnmdu.supabase.co'
const supabasePublishableKey = 'sb_publishable_KLOPofxxzkpLRJOwrS95sQ_2j8e7k7o'

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: encryptedAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null
