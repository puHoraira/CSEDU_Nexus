import { env } from "../config/env";

export type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  experience?: string;
  designation?: string;
  roles: string[];
};

export type AuthPayload = {
  user: ApiUser;
  accessToken: string;
};

export class ApiRequestError extends Error {
  status: number;
  details: Array<{ path?: string; message?: string }> | null;

  constructor(message: string, status: number, details: Array<{ path?: string; message?: string }> | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = RequestInit & {
  token?: string | null;
};

const TOKEN_REFRESHED_EVENT = "csedu:token-refreshed";

let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

function emitTokenRefreshed(token: string | null) {
  window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token } }));
}

export function getAuthTokenEventName() {
  return TOKEN_REFRESHED_EVENT;
}

export function setApiAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        inMemoryAccessToken = null;
        emitTokenRefreshed(null);
        return null;
      }

      const body = await response.json();
      const nextToken = body?.data?.accessToken || null;
      inMemoryAccessToken = nextToken;
      emitTokenRefreshed(nextToken);
      return nextToken;
    } catch {
      inMemoryAccessToken = null;
      emitTokenRefreshed(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function buildHeaders(token: string | null, headers?: HeadersInit) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const requestToken = token ?? inMemoryAccessToken;

  let response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    cache: "no-store",
    credentials: "include",
    headers: buildHeaders(requestToken, headers),
  });

  if (response.status === 401) {
    const refreshedToken = await tryRefreshAccessToken();
    if (refreshedToken) {
      response = await fetch(`${env.apiBaseUrl}${path}`, {
        ...rest,
        cache: "no-store",
        credentials: "include",
        headers: buildHeaders(refreshedToken, headers),
      });
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Session expired. Please login again."
        : body?.message || body?.error || `Request failed with ${response.status}`;
    throw new ApiRequestError(message, response.status, body?.details || null);
  }

  return body?.data ?? body;
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.details && Array.isArray(error.details)) {
      const messages = error.details
        .map((d) => d.message || (d as any).path)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
