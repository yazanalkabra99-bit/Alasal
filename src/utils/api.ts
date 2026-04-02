import axios, { AxiosInstance } from 'axios';

function normalizeToken(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let t = raw.trim();
  if (!t) return null;

  // Handle common bad persisted values
  if (t === 'undefined' || t === 'null') return null;

  // Strip quotes if stored via JSON.stringify
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }

  // Strip Bearer prefix if someone stored it by mistake
  if (t.toLowerCase().startsWith('bearer ')) {
    t = t.slice(7).trim();
  }

  if (!t || t === 'undefined' || t === 'null') return null;

  // Very small sanity check: JWTs are 3 dot-separated segments
  if (t.split('.').length !== 3) return null;

  return t;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 20000,
    });

    this.client.interceptors.request.use((config) => {
      // Don't override an explicit Authorization header set per-request
      const headers: any = config.headers || {};
      const hasAuth = headers.Authorization || headers.authorization;
      if (!hasAuth && this.token) {
        config.headers = headers;
        headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string | null) {
    this.token = normalizeToken(token);
  }

  // NOTE: Do NOT store bound methods as class fields.
  // Class fields are initialized before the constructor runs,
  // so `this.client` is undefined at that time and the app will crash.
  get(...args: Parameters<AxiosInstance['get']>) {
    return this.client.get(...args);
  }

  post(...args: Parameters<AxiosInstance['post']>) {
    return this.client.post(...args);
  }

  patch(...args: Parameters<AxiosInstance['patch']>) {
    return this.client.patch(...args);
  }

  put(...args: Parameters<AxiosInstance['put']>) {
    return this.client.put(...args);
  }

  delete(...args: Parameters<AxiosInstance['delete']>) {
    return this.client.delete(...args);
  }
}

export const api = new ApiClient();
