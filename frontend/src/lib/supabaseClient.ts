import { createClient } from "@supabase/supabase-js";

/**
 * The only frontend Supabase usage — phone-OTP auth. Uses the anon key,
 * which is designed to be public (unlike the backend-only service-role
 * key in backend/src/services/supabaseAdmin.ts). No wagmi/RainbowKit
 * dependency here, so importing this from farmer routes doesn't cross
 * the React.lazy() boundary that keeps wallet libraries out of the
 * farmer bundle (see App.tsx).
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isSupabaseAuthConfigured = () => supabase !== null;
