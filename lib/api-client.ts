// Resilient API Client with offline fallback & error interception
import { SEED_BRANDS, SEED_FINDINGS, SEED_INVESTIGATIONS, SEED_NOTIFICATIONS } from "./seed-data";

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function resilientFetch<T = any>(
  url: string,
  options: RequestOptions = {},
  fallbackData?: T
): Promise<{ success: boolean; data: T; isFallback: boolean; error?: string }> {
  const { timeoutMs = 6000, ...fetchOptions } = options;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Server returned non-JSON response.");
    }

    const json = await response.json();
    return {
      success: json.success !== false,
      data: json.data !== undefined ? json.data : json,
      isFallback: false,
    };
  } catch (err: any) {
    console.warn(`ResilientFetch: Failed calling ${url}. Activating fallback:`, err?.message);

    // Provide intelligent fallback based on url route
    let autoFallback: any = fallbackData;

    if (!autoFallback) {
      if (url.includes("/api/findings")) {
        autoFallback = SEED_FINDINGS;
      } else if (url.includes("/api/brands")) {
        autoFallback = SEED_BRANDS;
      } else if (url.includes("/api/investigations")) {
        autoFallback = SEED_INVESTIGATIONS;
      } else if (url.includes("/api/notifications")) {
        autoFallback = SEED_NOTIFICATIONS;
      } else if (url.includes("/api/analytics")) {
        autoFallback = {
          totalFindings: SEED_FINDINGS.length,
          severityCounts: {
            critical: SEED_FINDINGS.filter((f) => f.severity === "critical").length,
            high: SEED_FINDINGS.filter((f) => f.severity === "high").length,
            medium: SEED_FINDINGS.filter((f) => f.severity === "medium").length,
            low: SEED_FINDINGS.filter((f) => f.severity === "low").length,
          },
          moduleCounts: {
            social: SEED_FINDINGS.filter((f) => f.sourceModule === "social").length,
            app: SEED_FINDINGS.filter((f) => f.sourceModule === "app").length,
            domain: SEED_FINDINGS.filter((f) => f.sourceModule === "domain" || f.sourceModule === "web").length,
          },
          activeResponseActions: 18,
          completedResponseActions: 12,
        };
      }
    }

    return {
      success: true,
      data: autoFallback as T,
      isFallback: true,
      error: err?.message || "Server unreachable. Displaying cached intelligence.",
    };
  }
}

