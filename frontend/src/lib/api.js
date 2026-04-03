import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  session: (sessionId) => API.get(`/auth/session?session_id=${sessionId}`),
  me: () => API.get('/auth/me'),
  logout: () => API.post('/auth/logout'),
};

export const employees = {
  list: () => API.get('/employees'),
  get: (id) => API.get(`/employees/${id}`),
};

export const plans = {
  get: (employeeId) => API.get(`/plans/${employeeId}`),
};

export const milestones = {
  list: (employeeId) => API.get(`/milestones/${employeeId}`),
  toggle: (milestoneId) => API.put(`/milestones/${milestoneId}/toggle`),
};

export const chat = {
  get: (employeeId) => API.get(`/chat/${employeeId}`),
  send: (employeeId, message) => API.post(`/chat/${employeeId}/send`, { message }),
};

export const hr = {
  cohort: () => API.get('/hr/cohort'),
  stats: () => API.get('/hr/stats'),
  override: (data) => API.post('/hr/override', data),
};

export const lms = {
  get: (employeeId) => API.get(`/lms/${employeeId}`),
  complete: (assignmentId) => API.put(`/lms/${assignmentId}/complete`),
};

export const calendar = {
  get: (employeeId) => API.get(`/calendar/${employeeId}`),
};

export const nudges = {
  get: (employeeId) => API.get(`/nudges/${employeeId}`),
  read: (nudgeId) => API.put(`/nudges/${nudgeId}/read`),
};

export const kb = {
  search: (q) => API.get(`/kb/search?q=${encodeURIComponent(q)}`),
};

export const audit = {
  list: () => API.get('/audit'),
};

export const notes = {
  get: (employeeId) => API.get(`/notes/${employeeId}`),
};

export const onboarding = {
  intake: (data) => API.post('/onboarding/intake', data),
};

export const seed = () => API.post('/seed');

export default API;
