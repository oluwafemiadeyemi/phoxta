export type OptimizeFor = "sales" | "projects" | "ops";

export type PersonalizationSettings = {
  optimizeFor: OptimizeFor;
};

const STORAGE_KEY = "starterhub.personalization.v1";

export function getPersonalizationSettings(): PersonalizationSettings {
  if (typeof window === "undefined") return { optimizeFor: "sales" };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { optimizeFor: "sales" };
    const parsed = JSON.parse(raw) as any;
    const optimizeFor: OptimizeFor =
      parsed?.optimizeFor === "projects" || parsed?.optimizeFor === "ops" || parsed?.optimizeFor === "sales"
        ? parsed.optimizeFor
        : "sales";
    return { optimizeFor };
  } catch {
    return { optimizeFor: "sales" };
  }
}

export function setPersonalizationSettings(next: PersonalizationSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("starterhub.personalization.updated"));
}
