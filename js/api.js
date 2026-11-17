import { API_URL } from "./config.js";

const TOKEN_KEY = "keyhold:token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Hooks the app registers so the API layer can react without importing the UI.
let onUnauthorized = () => {};
let onWaking = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);
export const setWakingHandler = (fn) => (onWaking = fn);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const WAKING_STATUSES = [502, 503, 504];

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Render's free tier sleeps when idle; the first request can fail while it
  // boots. Reads are safe to retry, so give them a few patient attempts.
  const maxAttempts = method === "GET" ? 4 : 1;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    } catch {
      lastError = new ApiError("Can't reach the server. Check your connection and try again.", 0);
      if (attempt < maxAttempts) {
        onWaking(true);
        await sleep(6000);
        continue;
      }
      onWaking(false);
      throw lastError;
    }

    if (WAKING_STATUSES.includes(res.status)) {
      lastError = new ApiError("The server is waking up — wait about 30 seconds and try again.", res.status);
      if (attempt < maxAttempts) {
        onWaking(true);
        await sleep(6000);
        continue;
      }
      onWaking(false);
      throw lastError;
    }

    onWaking(false);
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* some error responses have no JSON body */
    }
    if (res.status === 401 && auth) onUnauthorized();
    if (!res.ok) throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
    return data;
  }
  throw lastError;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: "POST", body, ...opts }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
