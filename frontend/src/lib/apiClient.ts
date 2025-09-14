export type ApiClientOptions = {
  baseUrl?: string;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  data?: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
    ...options.headers,
  };

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init?.headers || {}),
      },
      // Don't cache GETs by default
      cache: init?.cache || 'no-store',
      // Always send credentials only if same-origin (backend likely on different port in dev)
      credentials: init?.credentials || 'omit',
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

    if (!res.ok) {
      const message = (body as any)?.message || res.statusText;
      throw new ApiError(message, res.status, body);
    }

    return body as T;
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, data?: any) => request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }),
    postForm: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
    patch: <T>(path: string, data?: any) => request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    baseUrl,
  };
}

export const api = createApiClient();


