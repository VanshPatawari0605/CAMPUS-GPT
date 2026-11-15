import axios from "axios";

const TOKEN_KEY = "campusgpt_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url: string = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/auth/")) onUnauthorized?.();
    return Promise.reject(err);
  }
);

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) return err.response?.data?.message || err.message || fallback;
  return fallback;
}

/** Opens a cited PDF at a given page. The file endpoint needs the Bearer token, so fetch it as a blob first. */
export async function openPdf(documentId: string, page?: number) {
  const win = window.open("", "_blank"); // open synchronously to avoid popup blockers
  try {
    const res = await api.get(`/documents/${documentId}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    if (win) win.location.href = page ? `${url}#page=${page}` : url;
  } catch (e) {
    win?.close();
    throw e;
  }
}
