import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    const { state } = JSON.parse(token);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Interceptor para converter _id em id (MongoDB para frontend)
api.interceptors.response.use((response) => {
  if (response.data) {
    // Função recursiva para converter _id em id
    const convertIds = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(convertIds);
      } else if (obj && typeof obj === 'object') {
        const newObj: any = {};
        for (const key in obj) {
          if (key === '_id') {
            newObj.id = obj[key];
          } else {
            newObj[key] = convertIds(obj[key]);
          }
        }
        return newObj;
      }
      return obj;
    };
    
    response.data = convertIds(response.data);
  }
  return response;
}, (error) => {
  // Se receber erro 401 (não autorizado), limpar token e redirecionar para login
  if (error.response?.status === 401) {
    console.warn('⚠️ Token expirado ou inválido. Redirecionando para login...');
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
