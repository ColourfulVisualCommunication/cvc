/**
 * Every call to Flask goes through here. Nothing else in the app calls fetch
 * directly — one place to change the base URL, handle errors, or add auth.
 */
const BASE = import.meta.env.VITE_API_URL || "/api/v1";
const TOKEN_KEY = "cvc_admin_token";

// The frontend and API are different domains, so auth travels as a Bearer
// token (set on login, read from storage on every request) rather than a
// cookie — see backend/app/api/auth.py for why.
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const headers = { ...options.headers };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE}${path}`, { ...options, headers });

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
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(path, { method: "POST", body: form });
  },
};

export const health = () => api.get("/health");

// Services
export const listServices = (tier) =>
  api.get(tier === undefined ? "/services" : `/services?tier=${tier}`);
export const getService = (slug) => api.get(`/services/${slug}`);

// Portfolio
export const listPortfolio = () => api.get("/portfolio");
export const getPortfolioProject = (slug) => api.get(`/portfolio/${slug}`);
export const adminListPortfolio = () => api.get("/admin/portfolio");
export const adminCreatePortfolio = (data) => api.post("/admin/portfolio", data);
export const adminUpdatePortfolio = (id, data) => api.patch(`/admin/portfolio/${id}`, data);
export const adminDeletePortfolio = (id) => api.delete(`/admin/portfolio/${id}`);

// Blog
export const listPosts = () => api.get("/posts");
export const getPost = (slug) => api.get(`/posts/${slug}`);
export const adminListPosts = () => api.get("/admin/posts");
export const adminCreatePost = (data) => api.post("/admin/posts", data);
export const adminUpdatePost = (id, data) => api.patch(`/admin/posts/${id}`, data);
export const adminDeletePost = (id) => api.delete(`/admin/posts/${id}`);

// Testimonials
export const listTestimonials = () => api.get("/testimonials");
export const adminListTestimonials = () => api.get("/admin/testimonials");
export const adminCreateTestimonial = (data) => api.post("/admin/testimonials", data);
export const adminUpdateTestimonial = (id, data) => api.patch(`/admin/testimonials/${id}`, data);
export const adminDeleteTestimonial = (id) => api.delete(`/admin/testimonials/${id}`);

// Media
export const uploadMedia = (file) => api.upload("/admin/media", file);

// Auth
export const login = (email, password) => api.post("/auth/login", { email, password });
export const me = () => api.get("/auth/me");
