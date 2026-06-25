import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });

const TOKEN_KEY = "rakkhtt_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && !location.pathname.startsWith("/login")) {
      clearToken();
      location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ---- generic list type ----
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  [k: string]: unknown;
}

export async function fetchList<T = any>(path: string, params: ListParams = {}): Promise<Page<T>> {
  const { data } = await api.get<Page<T>>(path, { params });
  return data;
}
