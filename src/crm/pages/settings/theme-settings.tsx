import { useEffect, useState } from "react";
import { useGetIdentity, useNotification } from "@refinedev/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@crm/components/ui/card";
import { Button } from "@crm/components/ui/button";
import { Input } from "@crm/components/ui/input";
import { Switch } from "@crm/components/ui/switch";
import { Paintbrush, Save, WandSparkles } from "lucide-react";
import { applyThemeSettings, fetchThemeSettings, saveThemeSettings, type ThemeSettings } from "@crm/lib/theme-customization";

const defaultTheme: ThemeSettings = {
  app_name: "Phoxta CRM",
  logo_url: "",
  primary_color: "oklch(0.28 0.12 264)",
  accent_color: "oklch(0.8 0.15 170)",
  sidebar_color: "oklch(0.985 0 0)",
  radius: "0.325rem",
  font_family: "Inter, sans-serif",
  custom_css: "",
  white_label: false,
};

export const ThemeSettingsPage = () => {
  const { open } = useNotification();
  const { data: user } = useGetIdentity();
  const [settings, setSettings] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const stored = await fetchThemeSettings(user.id);
      if (stored) {
        setSettings({ ...defaultTheme, ...stored });
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const handleChange = (key: keyof ThemeSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await saveThemeSettings(user.id, settings);
      applyThemeSettings(settings);
      open?.({
        type: "success",
        message: "Theme settings saved",
        description: "Your custom theme has been applied.",
      });
    } catch (error) {
      open?.({
        type: "error",
        message: "Unable to save theme",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreview = () => {
    applyThemeSettings(settings);
    open?.({
      type: "success",
      message: "Preview applied",
      description: "Your theme has been applied locally. Save to persist it.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Branding & Theme</h2>
        <p className="text-muted-foreground mt-2">Customize colors, typography, and branding for white-label support.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>Define your app name and logo for white-label builds.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">App Name</label>
            <Input value={settings.app_name} onChange={(event) => handleChange("app_name", event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Logo URL</label>
            <Input value={settings.logo_url || ""} onChange={(event) => handleChange("logo_url", event.target.value)} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={settings.white_label} onCheckedChange={(value) => handleChange("white_label", value)} />
            <span className="text-sm text-muted-foreground">Enable white-label mode (hide StartupHub branding)</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WandSparkles className="w-5 h-5" />
            Theme Colors
          </CardTitle>
          <CardDescription>Customize the core UI colors and typography.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Color (OKLCH)</label>
            <Input value={settings.primary_color} onChange={(event) => handleChange("primary_color", event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Accent Color (OKLCH)</label>
            <Input value={settings.accent_color} onChange={(event) => handleChange("accent_color", event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sidebar Color (OKLCH)</label>
            <Input value={settings.sidebar_color} onChange={(event) => handleChange("sidebar_color", event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Border Radius</label>
            <Input value={settings.radius} onChange={(event) => handleChange("radius", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Font Family</label>
            <Input value={settings.font_family} onChange={(event) => handleChange("font_family", event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Custom CSS</label>
            <textarea
              className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settings.custom_css || ""}
              onChange={(event) => handleChange("custom_css", event.target.value)}
              placeholder=".sidebar { border-radius: 12px; }"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={handleApplyPreview} disabled={loading}>
          <WandSparkles className="w-4 h-4 mr-2" />
          Apply Preview
        </Button>
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </div>
    </div>
  );
};
