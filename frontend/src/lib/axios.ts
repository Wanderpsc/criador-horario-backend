import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔧 [API CONFIG] Base URL:', API_URL);
console.log('🔧 [API CONFIG] Ambiente:', import.meta.env.MODE);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const { state } = JSON.parse(token);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch (error) {
      console.error('❌ Erro ao parsear auth-storage:', error);
    }
  }
  return config;
}, (error) => {
  console.error('❌ Erro no request interceptor:', error);
  return Promise.reject(error);
});

// Interceptor para converter _id em id (MongoDB para frontend)
api.interceptors.response.use((response) => {
  console.log('📥 Response recebida:', response.config.url, response.data);
  
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
    console.log('📤 Response após conversão:', response.data);
  }
  return response;
}, (error) => {
  console.error('❌ Erro na resposta:', error.config?.url, error.response?.data || error.message);
  
  // Se receber erro 401 (não autorizado), limpar token e redirecionar para login
  if (error.response?.status === 401) {
    console.warn('⚠️ Token expirado ou inválido. Redirecionando para login...');
    localStorage.removeItem('auth-storage');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
