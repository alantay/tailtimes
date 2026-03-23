import { getIdToken } from './auth';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required');
}

interface ApiRequestOptions {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
}

function buildUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  options: ApiRequestOptions = {}
) {
  const headers = new Headers(options.headers);

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.auth !== false) {
    const token = await getIdToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const rawBody = await response.text();
  const parsedBody = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    const message =
      parsedBody?.error ||
      parsedBody?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return parsedBody as T;
}

export function apiGet<T>(path: string, options?: Omit<ApiRequestOptions, 'body'>) {
  return apiRequest<T>('GET', path, options);
}

export function apiPost<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'body'>) {
  return apiRequest<T>('POST', path, {
    ...options,
    body,
  });
}

export function apiPatch<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'body'>) {
  return apiRequest<T>('PATCH', path, {
    ...options,
    body,
  });
}

export function apiDelete<T>(path: string, options?: Omit<ApiRequestOptions, 'body'>) {
  return apiRequest<T>('DELETE', path, options);
}
