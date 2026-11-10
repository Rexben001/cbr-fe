export const apiBaseURL = import.meta.env.VITE_API_BASE_URL ?? '';

export class APIError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(`${apiBaseURL}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => ({ error: response.statusText }))) as { error?: string };
    throw new APIError(
      body.error ?? 'The request could not be completed.',
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
