import { createClient } from "@supabase/supabase-js";

const SUPA_URL = (import.meta as any).env.VITE_SUPABASE_URL || "https://hdlnvmbmknpjpjektsgu.supabase.co";
const SUPA_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "sb_publishable_ITm0crZPvxM2wGFC3IeJ9g_NiAr4Dcg";
export const supabase = createClient(SUPA_URL, SUPA_KEY);
