/**
 * Client-side fetch wrapper. Every REST call from the browser goes through
 * here so error handling (`{ error }` JSON bodies), JSON headers and status
 * codes stay uniform.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload !== null && typeof payload === 'object' && 'error' in payload && typeof (payload as { error: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : 'Something went wrong. Please try again.'
    throw new ApiError(response.status, message)
  }

  return payload as T
}
