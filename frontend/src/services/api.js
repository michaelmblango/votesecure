// frontend/src/services/api.js
// Central place for ALL API calls to the backend
// If the backend URL ever changes, update ONE line here

import axios from "axios";

const API_BASE = `${process.env.REACT_APP_API_URL || "http://localhost:8000"}/api`;

// Axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Interceptor: attach JWT token to every request automatically
// The token is stored in localStorage after login
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vs_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: if any request returns 401, clear token and reload
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("vs_token");
      localStorage.removeItem("vs_user");
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────
export const authAPI = {
  login:     (student_number, password) =>
               api.post("/auth/login", { student_number, password }),
  verifyOTP: (user_id, otp_code) =>
               api.post("/auth/login/otp", { user_id, otp_code }),
  me:        ()        => api.get("/auth/me"),
  logout:    ()        => api.post("/auth/logout"),
  register:  (data)    => api.post("/auth/register", data),
};

// ── Elections ────────────────────────────────────────────────
export const electionsAPI = {
  list:             ()            => api.get("/elections"),
  get:              (id)          => api.get(`/elections/${id}`),
  create:           (data)        => api.post("/elections", data),
  updateStatus:     (id, status)  => api.patch(`/elections/${id}/status`, { status }),
  addPosition:      (id, data)    => api.post(`/elections/${id}/positions`, data),
  deletePosition:   (id, posId)   => api.delete(`/elections/${id}/positions/${posId}`),
  addCandidate:     (id, posId, data) =>
                      api.post(`/elections/${id}/positions/${posId}/candidates`, data),
  approveCandidate: (id, candId, approval_status) =>
                      api.patch(`/elections/${id}/candidates/${candId}/status`, { approval_status }),
  listCandidates:   (id)          => api.get(`/elections/${id}/candidates`),
};

// ── Votes ────────────────────────────────────────────────────
export const votesAPI = {
  cast:        (election_id, position_id, candidate_id) =>
                 api.post("/votes/cast", { election_id, position_id, candidate_id }),
  getStatus:   (election_id) => api.get(`/votes/status/${election_id}`),
  verify:      (hash)        => api.get(`/votes/verify/${hash}`),
};

// ── Analytics ────────────────────────────────────────────────
export const analyticsAPI = {
  results:   (election_id) => api.get(`/analytics/results/${election_id}`),
  turnout:   (election_id) => api.get(`/analytics/turnout/${election_id}`),
  auditLogs: (limit = 50)  => api.get(`/analytics/audit-logs?limit=${limit}`),
};

export const orgAPI = {
  signup:    (data)         => api.post("/org/signup", data),
  join:      (code, data)   => api.post(`/org/join/${code}`, data),
  login:     (data)         => api.post("/org/login", data),
  loginOtp:  (data)         => api.post("/org/login/otp", data),
  me:        ()             => api.get("/org/me"),
  plans:     ()             => api.get("/org/plans"),
};

export const licenceAPI = {
  plans:          ()     => api.get("/licences/plans"),
  requestLicence: (data) => api.post("/licences/request", data),
  activate:       (data) => api.post("/licences/activate", data),
  myLicences:     ()     => api.get("/licences/my-licences"),
};

// ── Admin Approvals ──────────────────────────────────────────
// The /vote endpoint expects a JSON body ({ vote }), not a query
// string - matches the VoteRequest model on the backend.
export const approvalsAPI = {
  getPending: ()                => api.get("/approvals/pending"),
  vote:       (requestId, vote) => api.post(`/approvals/${requestId}/vote`, { vote }),
  initiate:   (data)            => api.post("/approvals/initiate", data),
};

// ── Voter Invites ────────────────────────────────────────────
export const voterInviteAPI = {
  send:             (data)     => api.post("/voter-invites/send", data),
  sendBulk:         (data)     => api.post("/voter-invites/send-bulk", data),
  list:             ()         => api.get("/voter-invites/"),
  getInviteDetails: (code)     => api.get(`/voter-invites/register/${code}`),
  pendingApprovals: ()         => api.get("/voter-invites/pending-approvals"),
  decide:           (id, data) => api.post(`/voter-invites/${id}/decide`, data),
};