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
  upload: (path, file, formats) => {
    const form = new FormData();
    form.append("file", file);
    if (formats) form.append("formats", formats);
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

// Client logos
export const listClientLogos = () => api.get("/client-logos");
export const adminListClientLogos = () => api.get("/admin/client-logos");
export const adminCreateClientLogo = (data) => api.post("/admin/client-logos", data);
export const adminUpdateClientLogo = (id, data) => api.patch(`/admin/client-logos/${id}`, data);
export const adminDeleteClientLogo = (id) => api.delete(`/admin/client-logos/${id}`);

// Media
export const uploadMedia = (file) => api.upload("/admin/media", file);
export const uploadLogo = (file) => api.upload("/admin/media", file, "svg,png");

// Leads
export const submitLead = (data) => api.post("/leads", data);
export const adminListLeads = () => api.get("/admin/leads");
export const adminUpdateLead = (id, data) => api.patch(`/admin/leads/${id}`, data);
export const adminDeleteLead = (id) => api.delete(`/admin/leads/${id}`);

// Quotes
export const adminListQuotes = () => api.get("/admin/quotes");
export const adminGetQuote = (id) => api.get(`/admin/quotes/${id}`);
export const adminCreateQuote = (data) => api.post("/admin/quotes", data);
export const adminUpdateQuote = (id, data) => api.patch(`/admin/quotes/${id}`, data);
export const adminDeleteQuote = (id) => api.delete(`/admin/quotes/${id}`);
export const adminSendQuote = (id) => api.post(`/admin/quotes/${id}/send`);
export const adminRemindQuote = (id) => api.post(`/admin/quotes/${id}/remind`);

export const getQuote = (token) => api.get(`/quotes/${token}`);
export const acceptQuote = (token) => api.post(`/quotes/${token}/accept`);
export const declineQuote = (token) => api.post(`/quotes/${token}/decline`);

// Invoices & payments (Phase 5)
export const adminListInvoices = () => api.get("/admin/invoices");
export const adminGetInvoice = (id) => api.get(`/admin/invoices/${id}`);
export const adminRecordPayment = (id, data) => api.post(`/admin/invoices/${id}/payments`, data);
export const adminCheckPaymentStatus = (id) => api.post(`/admin/invoices/${id}/check-status`);

// PDF endpoints return a file, not JSON — bypass the shared `request()`
// wrapper (which always calls response.json()) and trigger a browser save
// via a Blob URL. The admin one needs the bearer token attached by hand
// since it's a plain fetch, not routed through `request()`.
async function downloadFile(url, filename, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new ApiError("Could not download the file", response.status);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export const adminDownloadInvoicePdf = (id, filename) => {
  const token = getToken();
  return downloadFile(`${BASE}/admin/invoices/${id}/pdf`, filename, token ? { Authorization: `Bearer ${token}` } : {});
};

export const payQuoteDeposit = (token, phoneNumber) => api.post(`/quotes/${token}/pay`, { phone_number: phoneNumber });
export const getQuotePaymentStatus = (token) => api.get(`/quotes/${token}/payment-status`);
export const downloadQuoteReceipt = (token, filename) => downloadFile(`${BASE}/quotes/${token}/receipt.pdf`, filename);

// Projects & delivery (Phase 6)
export const adminListProjects = () => api.get("/admin/projects");
export const adminGetProject = (id) => api.get(`/admin/projects/${id}`);
export const adminAddDeliverable = (projectId, data) => api.post(`/admin/projects/${projectId}/deliverables`, data);
export const adminPublishProject = (id) => api.post(`/admin/projects/${id}/publish`);
export const adminDownloadDeliverable = (projectId, deliverableId) =>
  api.get(`/admin/projects/${projectId}/deliverables/${deliverableId}/download`);

export const getProject = (token) => api.get(`/projects/${token}`);
export const submitProjectBrief = (token, briefText) => api.post(`/projects/${token}/brief`, { brief_text: briefText });
export const addProjectBriefAsset = (token, data) => api.post(`/projects/${token}/brief/assets`, data);
export const viewDeliverable = (token, deliverableId) => api.get(`/projects/${token}/deliverables/${deliverableId}/view`);
export const downloadDeliverable = (token, deliverableId) =>
  api.get(`/projects/${token}/deliverables/${deliverableId}/download`);
export const approveProject = (token) => api.post(`/projects/${token}/approve`);
export const requestProjectChanges = (token, note) => api.post(`/projects/${token}/request-changes`, { note });
export const payProjectBalance = (token, phoneNumber) => api.post(`/projects/${token}/pay`, { phone_number: phoneNumber });
export const getProjectPaymentStatus = (token) => api.get(`/projects/${token}/payment-status`);

// Direct-to-Cloudinary uploads — file bytes never transit our own server.
// adminGetUploadSignature/getProjectUploadSignature return a short-lived
// signature from our backend; uploadFileDirect posts the file straight to
// Cloudinary using it, then the caller reports the result to our own
// persist endpoint (adminAddDeliverable / addProjectBriefAsset above) so
// it can be verified (see file_service.verify_upload_report) before
// anything is written to the database.
export const adminGetUploadSignature = (projectId) => api.post("/admin/uploads/sign", { project_id: projectId });
export const getProjectUploadSignature = (token) => api.post(`/projects/${token}/uploads/sign`);

export async function uploadFileDirect(file, signatureData) {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signatureData.api_key);
  form.append("timestamp", signatureData.timestamp);
  form.append("signature", signatureData.signature);
  form.append("folder", signatureData.folder);
  form.append("type", signatureData.type);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signatureData.cloud_name}/auto/upload`, {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new ApiError(result.error?.message || "Upload failed", response.status);
  return result; // { public_id, version, signature, resource_type, format, ... }
}

// Auth
export const login = (email, password) => api.post("/auth/login", { email, password });
export const me = () => api.get("/auth/me");

// Clients (Phase 7)
export const adminListClients = () => api.get("/admin/clients");
export const adminGetClient = (id) => api.get(`/admin/clients/${id}`);
export const adminCreateClient = (data) => api.post("/admin/clients", data);
export const adminUpdateClient = (id, data) => api.patch(`/admin/clients/${id}`, data);

// Retainers (Phase 7)
export const adminListRetainers = () => api.get("/admin/retainers");
export const adminGetRetainer = (id) => api.get(`/admin/retainers/${id}`);
export const adminCreateRetainer = (data) => api.post("/admin/retainers", data);
export const adminUpdateRetainer = (id, data) => api.patch(`/admin/retainers/${id}`, data);
export const adminDeleteRetainer = (id) => api.delete(`/admin/retainers/${id}`);
export const adminGenerateRetainerInvoiceNow = (id) => api.post(`/admin/retainers/${id}/generate-now`);

export const getRetainer = (token) => api.get(`/retainers/${token}`);
export const payRetainerInvoice = (token, phoneNumber) => api.post(`/retainers/${token}/pay`, { phone_number: phoneNumber });
export const getRetainerPaymentStatus = (token) => api.get(`/retainers/${token}/payment-status`);
export const downloadRetainerReceipt = (token, filename) => downloadFile(`${BASE}/retainers/${token}/receipt.pdf`, filename);

// Retainer requests (Phase 7)
export const submitRetainerRequest = (data) => api.post("/retainer-requests", data);
export const adminListRetainerRequests = () => api.get("/admin/retainer-requests");
export const adminUpdateRetainerRequest = (id, data) => api.patch(`/admin/retainer-requests/${id}`, data);
export const adminDeleteRetainerRequest = (id) => api.delete(`/admin/retainer-requests/${id}`);

// Email log (Phase 7)
export const adminListEmailLog = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return api.get(`/admin/email-log${qs ? `?${qs}` : ""}`);
};
