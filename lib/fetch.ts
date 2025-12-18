/**
 * Authenticated fetch utility
 * Always includes credentials for mobile cookie support
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch wrapper that always includes credentials for mobile cookie support
 * and handles common error cases
 */
export async function authFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include', // Always include cookies for mobile
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * GET request with credentials
 */
export async function authGet(url: string, options?: FetchOptions): Promise<Response> {
  return authFetch(url, { ...options, method: 'GET' });
}

/**
 * POST request with credentials and JSON body
 */
export async function authPost(
  url: string,
  body?: unknown,
  options?: FetchOptions
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request with credentials
 */
export async function authDelete(
  url: string,
  body?: unknown,
  options?: FetchOptions
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request with credentials and JSON body
 */
export async function authPut(
  url: string,
  body?: unknown,
  options?: FetchOptions
): Promise<Response> {
  return authFetch(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}
