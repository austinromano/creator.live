/**
 * API Client - Typed fetch wrapper for consistent API calls
 * Used with React Query for data fetching
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: { error?: string; code?: string; errors?: Record<string, string[]> }
  ) {
    super(data.error || `API Error: ${status}`);
    this.name = 'ApiError';
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isBadRequest() {
    return this.status === 400;
  }

  get isServerError() {
    return this.status >= 500;
  }
}

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, data);
    }
    return response.json();
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: options.signal,
    });
    return this.handleResponse<T>(response);
  }

  async post<T, B = unknown>(
    endpoint: string,
    body?: B,
    options: RequestOptions = {}
  ): Promise<T> {
    const isFormData = body instanceof FormData;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: isFormData
        ? options.headers
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
    return this.handleResponse<T>(response);
  }

  async put<T, B = unknown>(
    endpoint: string,
    body?: B,
    options: RequestOptions = {}
  ): Promise<T> {
    const isFormData = body instanceof FormData;

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: isFormData
        ? options.headers
        : {
            'Content-Type': 'application/json',
            ...options.headers,
          },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T, B = unknown>(
    endpoint: string,
    body?: B,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(
    endpoint: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });
    return this.handleResponse<T>(response);
  }
}

// Singleton instance for app-wide use
export const api = new ApiClient();

// Export class for custom instances if needed
export { ApiClient };
