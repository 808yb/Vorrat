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

export function normalizeUsernameToEmail(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  const clean = trimmed.replace(/[^a-z0-9._-]/g, "");
  return `${clean || "kueche"}@vorrat-app.de`;
}

export function displayUsernameFromEmail(emailOrUser?: string | null): string {
  if (!emailOrUser) return "";
  if (
    emailOrUser.endsWith("@vorrat-app.de") ||
    emailOrUser.endsWith("@vorrat.internal") ||
    emailOrUser.endsWith("@vorrat.de")
  ) {
    return emailOrUser.split("@")[0];
  }
  return emailOrUser;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signInWithEmail(usernameOrEmail: string, pass: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist noch nicht konfiguriert.");
  const email = normalizeUsernameToEmail(usernameOrEmail);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Benutzername oder Passwort ist falsch.");
    }
    throw error;
  }
  return data;
}

export async function signUpWithEmail(usernameOrEmail: string, pass: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase ist noch nicht konfiguriert.");
  const email = normalizeUsernameToEmail(usernameOrEmail);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) {
    if (error.message.includes("User already registered")) {
      throw new Error("Dieser Benutzername ist bereits vergeben. Bitte melde dich an oder wähle einen anderen.");
    }
    if (error.message.includes("Password should be at least 6 characters")) {
      throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
    }
    throw error;
  }

  // If no session created automatically, attempt immediate sign-in
  if (!data.session) {
    try {
      const loginRes = await supabase.auth.signInWithPassword({ email, password: pass });
      if (loginRes.data.session) return loginRes.data;
    } catch {}
  }

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

export const SUPABASE_SQL_SETUP = `-- Supabase Table Setup & RLS für Vorrat (Projekt: auwrcldqfapejhdwjzbg)
create extension if not exists "uuid-ossp";

create table if not exists public.vorrat_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  household_name text default 'Unsere Küche' not null,
  pantry jsonb default '[]'::jsonb not null,
  groceries jsonb default '[]'::jsonb not null,
  custom_recipes jsonb default '[]'::jsonb not null,
  meal_plan jsonb default '[]'::jsonb not null,
  favorites jsonb default '[]'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS)
alter table public.vorrat_user_data enable row level security;

create policy "Users can view their own vorrat data"
  on public.vorrat_user_data for select using (auth.uid() = user_id);

create policy "Users can insert their own vorrat data"
  on public.vorrat_user_data for insert with check (auth.uid() = user_id);

create policy "Users can update their own vorrat data"
  on public.vorrat_user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own vorrat data"
  on public.vorrat_user_data for delete using (auth.uid() = user_id);`;
