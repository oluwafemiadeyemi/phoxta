import { useEffect } from "react";
import { useGetIdentity } from "@refinedev/core";
import { applyThemeSettings, fetchThemeSettings } from "@crm/lib/theme-customization";

export const ThemeCustomizer = () => {
  const { data: user } = useGetIdentity();

  useEffect(() => {
    if (!user?.id) return;
    const applyTheme = async () => {
      const settings = await fetchThemeSettings(user.id);
      if (settings) {
        applyThemeSettings(settings);
      }
    };
    applyTheme();
  }, [user?.id]);

  return null;
};
