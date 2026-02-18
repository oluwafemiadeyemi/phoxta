/**
 * Monitoring stubs — Sentry removed for Phoxta integration.
 * All public exports are preserved as no-ops so callers compile unchanged.
 */

export function initializeErrorTracking() {
  console.log("[Monitoring] Error tracking disabled (Sentry not configured)");
}

export function captureException(error: Error, _context?: Record<string, any>) {
  console.error("[Monitoring]", error);
}

export function captureMessage(message: string, _level: "fatal" | "error" | "warning" | "info" | "debug" = "info") {
  console.log("[Monitoring]", message);
}

export function setUserContext(_userId: string, _email?: string, _name?: string) {}

export function clearUserContext() {}

export function addBreadcrumb(_message: string, _data?: Record<string, any>, _level?: "fatal" | "error" | "warning" | "info" | "debug") {}

export function monitorApiCall(_method: string, _endpoint: string, _statusCode: number, _duration: number) {}

export function trackPerformanceMetric(_name: string, _value: number, _unit: string = "ms") {}

export async function checkApplicationHealth(): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, boolean>;
  timestamp: string;
}> {
  const checks: Record<string, boolean> = {};

  try {
    const { data } = await import("./supabase").then((m) =>
      m.supabaseClient.auth.getSession()
    );
    checks.supabase = !!data;
  } catch {
    checks.supabase = false;
  }

  try {
    localStorage.setItem("_health_check", "1");
    localStorage.removeItem("_health_check");
    checks.localStorage = true;
  } catch {
    checks.localStorage = false;
  }

  const healthyChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;

  let status: "healthy" | "degraded" | "unhealthy";
  if (healthyChecks === totalChecks) {
    status = "healthy";
  } else if (healthyChecks >= totalChecks / 2) {
    status = "degraded";
  } else {
    status = "unhealthy";
  }

  return { status, checks, timestamp: new Date().toISOString() };
}

export class SystemMetrics {
  private startTime = Date.now();
  private apiCallDurations: number[] = [];

  recordApiCall(duration: number) {
    this.apiCallDurations.push(duration);
  }

  getMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      avgApiCallDuration: this.apiCallDurations.length > 0
        ? this.apiCallDurations.reduce((a, b) => a + b, 0) / this.apiCallDurations.length
        : 0,
      totalApiCalls: this.apiCallDurations.length,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
    };
  }

  report() {
    const metrics = this.getMetrics();
    console.log("[Metrics]", metrics);
    return metrics;
  }
}

export class RequestInterceptor {
  private startTime: number = 0;

  onRequestStart() {
    this.startTime = performance.now();
  }

  onRequestEnd(endpoint: string, method: string, status: number) {
    const duration = performance.now() - this.startTime;
    monitorApiCall(method, endpoint, status, Math.round(duration));
    if (status >= 400) {
      captureMessage(`API Error: ${method} ${endpoint} (${status})`, "error");
    }
  }
}

export function setupGlobalErrorHandlers() {
  window.addEventListener("unhandledrejection", (event) => {
    captureException(event.reason, { type: "unhandledRejection" });
  });
  window.addEventListener("error", (event) => {
    captureException(event.error, {
      type: "globalError",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
}

export class SessionReplay {
  private enabled = false;
  start() { this.enabled = true; }
  stop() { this.enabled = false; }
  isEnabled() { return this.enabled; }
}

export const systemMetrics = new SystemMetrics();
export const requestInterceptor = new RequestInterceptor();
export const sessionReplay = new SessionReplay();
