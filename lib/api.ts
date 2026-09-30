import type { AuthResponse } from "@/lib/types";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  skipRefresh?: boolean;
};

function csrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split("; ")
      .find((item) => item.startsWith("fieldline_csrf="))
      ?.split("=")[1] ?? ""
  );
}

async function request<T>(
  path: string,
  options: ApiOptions,
  accessToken: string | null,
): Promise<T> {
  const { body, skipRefresh: _skipRefresh, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Accept", "application/json");

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  if (path === "/auth/refresh" || path === "/auth/logout") {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", decodeURIComponent(token));
  }

  const response = await fetch(`/api/v1${path}`, {
    ...requestOptions,
    headers,
    credentials: "include",
    body:
      body === undefined || body instanceof FormData
        ? (body as BodyInit | null | undefined)
        : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      message = payload.detail ?? message;
    } catch {
      // Keep the status-derived message.
    }
    const error = new Error(message);
    Object.assign(error, { status: response.status });
    throw error;
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {},
  accessToken: string | null = null,
): Promise<T> {
  try {
    return await request<T>(path, options, accessToken);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 && !options.skipRefresh && path !== "/auth/refresh") {
      const session = await request<AuthResponse>("/auth/refresh", { method: "POST" }, null);
      return request<T>(path, options, session.access_token);
    }
    throw error;
  }
}

export function refreshSession() {
  return request<AuthResponse>("/auth/refresh", { method: "POST" }, null);
}
