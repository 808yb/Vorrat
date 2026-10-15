import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

// Storage keys
const SUPABASE_URL_KEY = "vorrat_supabase_url";
const SUPABASE_ANON_KEY = "vorrat_supabase_anon_key";

export const DEFAULT_SUPABASE_PROJECT_ID = "auwrcldqfapejhdwjzbg";
export const DEFAULT_SUPABASE_URL = "https://auwrcldqfapejhdwjzbg.supabase.co";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  projectId: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  try {
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_SUPABASE_URL;
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";
    const storedUrl = localStorage.getItem(SUPABASE_URL_KEY)?.trim();
    const storedKey = localStorage.getItem(SUPABASE_ANON_KEY)?.trim();

    // Ignore placeholder values if stored previously
    const effectiveUrl = (storedUrl && !storedUrl.includes("your-project.supabase.co"))
      ? storedUrl
      : envUrl;
    const effectiveKey = (storedKey && !storedKey.includes("dummy_anon_key"))
      ? storedKey
      : envKey;

    return {
      url: effectiveUrl,
      anonKey: effectiveKey,
      isConfigured: Boolean(effectiveUrl && effectiveKey),
      projectId: DEFAULT_SUPABASE_PROJECT_ID,
    };
  } catch {
    return {
      url: DEFAULT_SUPABASE_URL,
      anonKey: "",
      isConfigured: false,
      projectId: DEFAULT_SUPABASE_PROJECT_ID,
    };
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
    _cachedClient = null; // reset client
  } catch {}
}

let _cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_cachedClient) return _cachedClient;

  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    _cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return _cachedClient;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }
}

export interface VorratSyncPayload {
  householdName?: string;
  pantry: unknown[];
  groceries: unknown[];
  customRecipes?: unknown[];
  mealPlan?: unknown[];
  favorites?: unknown[];
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signInWithEmail(email: string, pass: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist noch nicht konfiguriert.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, pass: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist noch nicht konfiguriert.");
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password: pass,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Backup all local data to Supabase table vorrat_user_data
 */
export async function backupUserDataToSupabase(payload: VorratSyncPayload) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase nicht verbunden.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Kein eingeloggter Nutzer gefunden. Bitte erst anmelden.");

  const { error } = await supabase.from("vorrat_user_data").upsert(
    {
      user_id: user.id,
      household_name: payload.householdName || "Unsere Küche",
      pantry: payload.pantry,
      groceries: payload.groceries,
      custom_recipes: payload.customRecipes || [],
      meal_plan: payload.mealPlan || [],
      favorites: payload.favorites || [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
  return true;
}

/**
 * Restore user data from Supabase table vorrat_user_data
 */
export async function fetchUserDataFromSupabase(): Promise<VorratSyncPayload | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("vorrat_user_data")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    householdName: data.household_name,
    pantry: Array.isArray(data.pantry) ? data.pantry : [],
    groceries: Array.isArray(data.groceries) ? data.groceries : [],
    customRecipes: Array.isArray(data.custom_recipes) ? data.custom_recipes : [],
    mealPlan: Array.isArray(data.meal_plan) ? data.meal_plan : [],
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
  };
}

export const SUPABASE_SQL_SETUP = `-- Supabase Table Setup für Vorrat
create table if not exists public.vorrat_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_name text default 'Unsere Küche',
  pantry jsonb default '[]'::jsonb,
  groceries jsonb default '[]'::jsonb,
  custom_recipes jsonb default '[]'::jsonb,
  meal_plan jsonb default '[]'::jsonb,
  favorites jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.vorrat_user_data enable row level security;

create policy "Users can manage their own pantry data"
  on public.vorrat_user_data
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);`;
