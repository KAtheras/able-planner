import type { CalculateRequest, CalculateResponse } from "@/features/planner/api/contracts";

export async function postCalculate(
  payload: CalculateRequest,
  options?: { signal?: AbortSignal; endpoint?: string },
): Promise<CalculateResponse> {
  const endpoint = options?.endpoint ?? "/api/calculate";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      return {
        ok: false,
        error: `Request failed (${response.status})`,
      };
    }
    return {
      ok: false,
      error: "Invalid JSON response",
    };
  }

  const typed = data as CalculateResponse;
  if (!response.ok) {
    return {
      ok: false,
      error: typed?.error || `Request failed (${response.status})`,
    };
  }
  return typed;
}
