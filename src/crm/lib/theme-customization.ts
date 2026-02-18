import { supabaseClient } from "./supabase";

export interface ThemeSettings {
  app_name: string;
  logo_url?: string | null;
  primary_color: string;
  accent_color: string;
  sidebar_color: string;
  radius: string;
  font_family: string;
  custom_css?: string | null;
  white_label: boolean;
}

const STYLE_ELEMENT_ID = "custom-theme-css";

export async function fetchThemeSettings(userId: string) {
  try {
    const { data, error } = await supabaseClient
      .from("theme_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // Silently handle missing table or no data
      return null;
    }

    return data as ThemeSettings | null;
  } catch (err) {
    // Silently handle any errors
    return null;
  }
}

export async function saveThemeSettings(userId: string, settings: ThemeSettings) {
  try {
    const payload = { ...settings, user_id: userId };
    const { error } = await supabaseClient
      .from("theme_settings")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      // Silently handle table not existing
      return;
    }
  } catch (err) {
    // Silently handle any errors
  }
}

export function applyThemeSettings(settings: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", settings.primary_color);
  root.style.setProperty("--accent", settings.accent_color);
  root.style.setProperty("--sidebar", settings.sidebar_color);
  root.style.setProperty("--radius", settings.radius);
  root.style.setProperty("--font-sans", settings.font_family);

  applyCustomCss(settings.custom_css || "");

  if (settings.app_name) {
    document.title = settings.app_name;
  }
}

function applyCustomCss(css: string) {
  let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
