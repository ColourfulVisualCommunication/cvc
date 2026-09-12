/**
 * Every call to Flask goes through here. Nothing else in the app calls fetch
 * directly — one place to change the base URL, handle errors, or add auth.
 */
const BASE = import.meta.env.VITE_API_URL || "/api/v1";

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    credentials: "include", // sends the admin auth cookie
    ...options,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(body.message || "Request failed", response.status, body.error);
  }
  return body;
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, data) => request(path, { method: "POST", body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

export const health = () => api.get("/health");
export const listServices = (tier) =>
  api.get(tier === undefined ? "/services" : `/services?tier=${tier}`);
export const getService = (slug) => api.get(`/services/${slug}`);
