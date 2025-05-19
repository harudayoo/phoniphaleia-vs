// API service utility for making authenticated requests

/**
 * Makes an authenticated API request with admin token
 * @param endpoint The API endpoint (without base URL)
 * @param options Fetch options
 * @returns Fetch response
 */
export const authenticatedFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const token = localStorage.getItem('admin_token');
  
  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }
  
  // Merge provided headers with auth header
  const baseHeaders: Record<string, string> = {};

  // If options.headers is a Headers object, convert it to a plain object
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      baseHeaders[key] = value;
    });
  } else if (Array.isArray(options.headers)) {
    options.headers.forEach(([key, value]) => {
      baseHeaders[key] = value;
    });
  } else if (options.headers && typeof options.headers === 'object') {
    Object.assign(baseHeaders, options.headers);
  }

  const headers = {
    ...baseHeaders,
    'Authorization': `Bearer ${token}`,
    'Content-Type': baseHeaders['Content-Type'] || 'application/json'
  };
  
  // Make the authenticated request
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
};

/**
 * Makes an authenticated POST request with admin token and JSON body
 * @param endpoint The API endpoint (without base URL)
 * @param data The request body data (will be JSON stringified)
 * @returns Fetch response
 */
export const authenticatedPost = async <T>(endpoint: string, data: Record<string, unknown>): Promise<T> => {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Makes an authenticated GET request with admin token
 * @param endpoint The API endpoint (without base URL)
 * @returns The parsed JSON response
 */
export const authenticatedGet = async <T>(endpoint: string): Promise<T> => {
  const response = await authenticatedFetch(endpoint);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Gets a temporary election ID to use for crypto key generation
 * before an actual election is created
 * @returns Object containing the temporary election ID
 */
export const getTempElectionId = async (): Promise<{ temp_election_id: number }> => {
  return authenticatedGet<{ temp_election_id: number }>('/crypto_configs/temp-election-id');
};

const apiService = {
  authenticatedFetch,
  authenticatedPost,
  authenticatedGet,
  getTempElectionId
};

export default apiService;
