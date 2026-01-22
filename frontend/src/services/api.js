// ===== Auth token handling =====
// Backward-compat: some pages saved token under 'token'. Normalize to 'authToken'.
let initialToken = localStorage.getItem("authToken") || localStorage.getItem("token") || null;
if (initialToken && !localStorage.getItem("authToken")) {
  try { localStorage.setItem("authToken", initialToken); } catch {}
}
let authToken = initialToken;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    try {
      localStorage.setItem("authToken", token);
      // keep legacy key in sync for any older code paths
      localStorage.setItem("token", token);
    } catch {}
  } else {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
    } catch {}
  }
}
export function isAuthed() {
  return !!authToken;
}

// helper function to read JSON response with error handling
async function readJson(res) {
  if (!res.ok) await readError(res);
  return res.json();
}

// generic error reader (turns HTML error pages into friendly text)
async function readError(res, { unauthMsg } = {}) {
  const ct = res.headers.get("content-type") || "";
  let msg = `HTTP ${res.status}`;
  try {
    if (ct.includes("application/json")) {
      const j = await res.json();
      if (j && (j.error || j.message)) msg = j.error || j.message;
      else msg = JSON.stringify(j);
    } else {
      const t = await res.text();
      msg = t.replace(/<[^>]+>/g, "").trim() || msg; // strip HTML tags
    }
  } catch (_) {}
    if (res.status === 401) msg = unauthMsg || "You need to be logged in to do that.";
  if (res.status === 403) msg = "You don’t have permission for that.";
  if (res.status === 409) msg = "Conflict. Please refresh and try again.";
  if (res.status === 400) msg = "Please check your input.";
  if (res.status === 422) msg = "Not eligible yet (event may not have ended).";
  throw new Error(msg);
}

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }
  
  // Ensure API calls go to the backend server
  const baseUrl = 'http://localhost:8080';
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
  const res = await fetch(fullUrl, { ...options, headers });
  return res;
}

// ------- Auth -------
export async function register({ email, password, name, role }) {
  const res = await apiFetch(`/api/auth/register`, { method: "POST", body: { email, password, name, role } });
  if (!res.ok) await readError(res, { unauthMsg: "Please check your details." });
  const data = await res.json();
  setAuthToken(data.token);
  return data; // {token, user}
}

export async function login({ email, password }) {
  const res = await apiFetch(`/api/auth/login`, { method: "POST", body: { email, password } });
  if (!res.ok) await readError(res, { unauthMsg: "Invalid email or password." });

  const data = await res.json(); // { token, user }

  setAuthToken(data.token); // existing

  // NEW: store userId and role in localStorage
  localStorage.setItem("userId", data.user.id);
  localStorage.setItem("role", data.user.role);

  return data; // {token, user}
}


export function logout() {
  setAuthToken(null);
}

// ------- Profile -------
export async function getMyProfile() {
  const res = await apiFetch(`/api/profile/me`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function updateMyProfile({ name }) {
  const res = await apiFetch(`/api/profile/me`, { method: "PUT", body: { name } });
  if (!res.ok) await readError(res);
  return res.json();
}

export async function getMyEvents(page = 0, size = 10) {
  const res = await apiFetch(`/api/profile/my-events?page=${page}&size=${size}`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function getEventRsvps(eventId) {
  const res = await apiFetch(`/api/profile/event/${eventId}/rsvps`);
  if (!res.ok) await readError(res);
  return res.json();
}

// ------- Events -------
export async function getEvents(opts = {}) {
  const { q = "", category = "", order = "asc" } = opts;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (order) params.set("order", order);
  const qs = params.toString();

  const res = await apiFetch(`/api/events${qs ? `?${qs}` : ""}`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function getEvent(id) {
  const res = await apiFetch(`/api/events/${id}`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function createEvent({ title, description, dateTimeISO, location, category }) {
  const payload = {
    id: null,
    title,
    description,
    startTime: new Date(dateTimeISO).toISOString(),
    location,
    category
  };
  const res = await apiFetch(`/api/events`, { method: "POST", body: payload });
  if (!res.ok) await readError(res);
  return res.json();
}

export async function updateEvent(id, { title, description, dateTimeISO, location, category }) {
  const payload = {
    id,
    title,
    description,
    startTime: new Date(dateTimeISO).toISOString(),
    location,
    category,
  };
  const res = await apiFetch(`/api/events/${id}`, { method: "PUT", body: payload });
  if (!res.ok) await readError(res);
  return res.json();
}

export async function deleteEvent(id) {
  const res = await apiFetch(`/api/events/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await readError(res);
  return true;
}

// simple derived list so we don't need a server endpoint yet
export async function listCategories() {
  const all = await getEvents();
  return Array.from(new Set(all.map(e => e.category))).sort();
}

// ------- RSVPs (require auth; token is attached via apiFetch) -------
export async function getMyRsvps() {
  const res = await apiFetch(`/api/rsvps/my`);
  if (!res.ok) await readError(res);
  return res.json(); // [{id,userId,eventId,status,createdAt,updatedAt}]
}

export async function rsvpEvent(eventId, status /* "GOING" | "INTERESTED" */) {
  const res = await apiFetch(`/api/rsvps`, { method: "POST", body: { eventId, status } });
  if (!res.ok) await readError(res);
  return res.json();
}

export async function cancelRsvpByEvent(eventId) {
  const res = await apiFetch(`/api/rsvps/by-event/${eventId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await readError(res);
}

// ------- Photos -------
export async function listPhotos(eventId) {
  const res = await apiFetch(`/api/events/${eventId}/photos`);
  if (!res.ok) await readError(res);
  return res.json(); // [{id, eventId, url, contentType, sizeBytes, originalFilename, createdAt}]
}

export async function uploadPhotos(eventId, files) {
  const fd = new FormData();
  for (const f of files) fd.append("files", f);
  const headers = {};
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`; // don't set content-type for FormData
  const res = await fetch(`/api/events/${eventId}/photos`, { method: "POST", body: fd, headers });
  if (!res.ok) await readError(res);
  return res.json();
}

export async function deletePhoto(photoId) {
  const res = await apiFetch(`/api/photos/${photoId}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) await readError(res);
  return true;
}

// --- Feedback API ---
export async function createOrUpdateFeedback({ eventId, rating, comment }) {
  const res = await apiFetch(`/api/feedback`, {
    method: "POST",
    body: { eventId, rating, comment }, // apiFetch will JSON-encode
  });
  if (!res.ok) await readError(res);
  return res.json(); // FeedbackDto
}

export async function getMyFeedback(eventId) {
  const res = await apiFetch(`/api/feedback/my?eventId=${encodeURIComponent(eventId)}`);
  if (!res.ok) await readError(res);
  return res.json(); // null or FeedbackDto
}

export async function listEventFeedback(eventId) {
  const res = await apiFetch(`/api/events/${encodeURIComponent(eventId)}/feedback`);
  if (!res.ok) await readError(res);
  return res.json(); // FeedbackDto[]
}

// decode current user's email from JWT (for client-side organizer gate)
export function currentUserEmail() {
  const t = localStorage.getItem("authToken");
  if (!t) return null;
  const parts = t.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return (payload.sub || "").toLowerCase();
  } catch {
    return null;
  }
}

export function authHeaders() {
  const t = localStorage.getItem("authToken") || localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}
 
export function getAuthRole() {
  try {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");
    if (!token) return null;
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    const r = (payload.role || "").toUpperCase();
    return r || null;
  } catch {
    return null;
  }
}

// --- Homepage: Upcoming + Recommended ---

export async function getUpcomingEvents({ limit = 10 } = {}) {
  const res = await apiFetch(`/api/events/upcoming?limit=${encodeURIComponent(limit)}`);
  if (!res.ok) await readError(res);
  return res.json(); // EventDto[]
}

export async function getRecommendedEvents() {
  const email = currentUserEmail(); // already defined in this file
  if (!email) return []; // not logged in or no JWT -> no recs
  const res = await apiFetch(`/api/events/recommended?email=${encodeURIComponent(email)}`);
  if (!res.ok) await readError(res);
  return res.json(); // EventDto[]
}

// ------- Badges -------
export async function getAllBadges() {
  const res = await apiFetch(`/api/badges`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function getMyBadges() {
  const res = await apiFetch(`/api/badges/my-badges`);
  if (!res.ok) await readError(res);
  return res.json();
}

export async function getMyBadgeProgress() {
  const res = await apiFetch(`/api/badges/my-progress`);
  if (!res.ok) await readError(res);
  return res.json();
}

// ----- Admin API -----
export async function adminListUsers() {
  const res = await apiFetch("/api/admin/users");
  return readJson(res);
}
export async function adminSetActive(id, active) {
  const res = await apiFetch(`/api/admin/users/${id}/active`, {
    method: "PATCH",
    body: { active },
  });
  return readJson(res);
}
export async function adminSetBan(id, banned) {
  const res = await apiFetch(`/api/admin/users/${id}/ban`, {
    method: "PATCH",
    body: { banned },
  });
  return readJson(res);
}
export async function adminSetRole(id, role) {
  const res = await apiFetch(`/api/admin/users/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
  return readJson(res);
}
export async function adminListEvents({ status, query }) {
  const p = new URLSearchParams();
  if (status && status !== "ALL") p.set("status", status);
  if (query) p.set("query", query);
  const res = await apiFetch(`/api/admin/events?${p.toString()}`);
  return readJson(res);
}
export async function adminApproveEvent(id) {
  const res = await apiFetch(`/api/admin/events/${id}/approve`, { method: "POST" });
  return readJson(res);
}
export async function adminRejectEvent(id, reason) {
  const res = await apiFetch(`/api/admin/events/${id}/reject`, {
    method: "POST",
    body: { reason },
  });
  return readJson(res);
}
export async function adminDeleteEvent(id) {
  const res = await apiFetch(`/api/admin/events/${id}`, { method: "DELETE" });
  if (!res.ok) throw await readError(res);
}
export async function adminCounts() {
  const res = await apiFetch("/api/admin/analytics/counts");
  return readJson(res);
}
export async function authMe() {
  const res = await apiFetch("/api/auth/me");
  return readJson(res);
}
