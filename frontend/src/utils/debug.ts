/**
 * Debug utility for frontend
 * @param component - Name of the component or module
 * @param message - Debug message
 * @param data - Optional data to log
 */
export const debug = (component: string, message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`\n[${new Date().toISOString()}] [${component}]`, message);
    if (data) {
      console.log('Data:', JSON.parse(JSON.stringify(data, (key, value) => {
        // Handle circular references and large data
        if (typeof value === 'object' && value !== null) {
          if (key === 'photo' && typeof value === 'string' && value.length > 50) {
            return `[Photo Data: ${value.length} chars]`;
          }
        }
        return value;
      })));
    }
  }
};

/**
 * Debug API calls
 */
export const debugApi = {
  request: (config: any) => {
    debug('API Request', `${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  response: (response: any) => {
    debug('API Response', `${response.status} ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  error: (error: any) => {
    if (error.response) {
      debug('API Error', `${error.response.status} ${error.config?.url}`, {
        status: error.response.status,
        data: error.response.data,
        config: {
          method: error.config?.method,
          url: error.config?.url,
          params: error.config?.params
        }
      });
    } else {
      debug('API Error', error.message, error);
    }
    return Promise.reject(error);
  }
};
