import { SERVER_URL } from './api';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(path, options = {}) {
    const { body, headers: customHeaders, ...restOptions } = options;
    const isFormData = body instanceof FormData;
    
    const headers = { ...customHeaders };
    if (!isFormData && body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      credentials: 'include',
      headers,
      ...restOptions,
    };

    if (body) {
      config.body = !isFormData && typeof body === 'object' 
        ? JSON.stringify(body) 
        : body;
    }

    const response = await fetch(`${this.baseURL}${path}`, config);
    return response;
  }

  async json(path, options = {}) {
    const response = await this.request(path, options);
    if (!response.ok) {
      const error = await response.json().catch(async () => {
        const text = await response.text().catch(() => "");
        return { message: text || response.statusText };
      });
      const err = new Error(error.error || error.message || 'Request failed');
      err.status = response.status;
      err.data = error;
      err.response = { data: error, status: response.status };
      throw err;
    }
    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text, success: true };
      }
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && !('data' in data)) {
      Object.defineProperty(data, 'data', {
        value: data,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }
    return data;
  }

  get(path, options = {}) {
    return this.json(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.json(path, { ...options, method: 'POST', body });
  }

  patch(path, body, options = {}) {
    return this.json(path, { ...options, method: 'PATCH', body });
  }

  put(path, body, options = {}) {
    return this.json(path, { ...options, method: 'PUT', body });
  }

  delete(path, options = {}) {
    return this.json(path, { ...options, method: 'DELETE' });
  }

  // For streaming/binary responses (file downloads, thumbnails, etc.)
  stream(path, options = {}) {
    return this.request(path, { ...options, method: options.method || 'GET' });
  }
}

const apiClient = new ApiClient(SERVER_URL);
export default apiClient;
export { SERVER_URL };
