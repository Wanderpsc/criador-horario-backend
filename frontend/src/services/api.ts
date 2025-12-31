import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Tenta pegar do zustand primeiro
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
        return config;
      }
    } catch (e) {
      // Ignora erro de parse
    }
  }
  
  // Fallback para token direto
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Converter _id para id (MongoDB para frontend)
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

// Handle auth errors and convert IDs
api.interceptors.response.use(
  (response) => {
    // Converter _id em id
    if (response.data) {
      response.data = convertIds(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile')
};

export const schoolAPI = {
  getAll: () => api.get('/schools'),
  getById: (id: string) => api.get(`/schools/${id}`),
  update: (id: string, data: any) => api.put(`/schools/${id}`, data),
  uploadLogo: (id: string, formData: FormData) => 
    api.post(`/schools/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
};

export const teacherAPI = {
  getAll: (schoolId: string) => api.get(`/teachers/school/${schoolId}`),
  getById: (id: string) => api.get(`/teachers/${id}`),
  create: (data: any) => api.post('/teachers', data),
  update: (id: string, data: any) => api.put(`/teachers/${id}`, data),
  delete: (id: string) => api.delete(`/teachers/${id}`)
};

export const subjectAPI = {
  getAll: () => api.get('/subjects'),
  getById: (id: string) => api.get(`/subjects/${id}`),
  create: (data: any) => api.post('/subjects', data),
  update: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  delete: (id: string) => api.delete(`/subjects/${id}`)
};

export const gradeAPI = {
  getAll: () => api.get('/grades'),
  getById: (id: string) => api.get(`/grades/${id}`),
  create: (data: any) => api.post('/grades', data),
  update: (id: string, data: any) => api.put(`/grades/${id}`, data),
  delete: (id: string) => api.delete(`/grades/${id}`)
};

export const scheduleAPI = {
  getAll: (schoolId: string) => api.get(`/schedules/school/${schoolId}`),
  getById: (id: string) => api.get(`/schedules/${id}`),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  generate: (id: string) => api.post(`/schedules/${id}/generate`),
  addSlot: (id: string, data: any) => api.post(`/schedules/${id}/slots`, data),
  updateSlot: (id: string, slotId: string, data: any) => 
    api.put(`/schedules/${id}/slots/${slotId}`, data),
  deleteSlot: (id: string, slotId: string) => 
    api.delete(`/schedules/${id}/slots/${slotId}`)
};

export const timeSlotAPI = {
  getAll: (schoolId: string) => api.get(`/timeslots/school/${schoolId}`),
  createBulk: (schoolId: string, data: any) => 
    api.post(`/timeslots/school/${schoolId}`, data),
  update: (id: string, data: any) => api.put(`/timeslots/${id}`, data)
};

export const licenseAPI = {
  getAll: () => api.get('/licenses'),
  create: (data: any) => api.post('/licenses', data),
  activate: (data: any) => api.post('/licenses/activate', data),
  deactivate: (id: string) => api.patch(`/licenses/${id}/deactivate`),
  delete: (id: string) => api.delete(`/licenses/${id}`),
  sendNotification: (id: string, type: 'created' | 'expiring' | 'expired' | 'renewed') => 
    api.post(`/licenses/${id}/notify`, { type }),
  checkExpiring: () => api.post('/licenses/check/expiring')
};

export const schoolDayAPI = {
  getAll: (schoolId: string, params?: any) => api.get(`/schooldays/school/${schoolId}`, { params }),
  getById: (id: string) => api.get(`/schooldays/${id}`),
  create: (data: any) => api.post('/schooldays', data),
  bulkCreate: (data: any) => api.post('/schooldays/bulk', data),
  update: (id: string, data: any) => api.put(`/schooldays/${id}`, data),
  delete: (id: string) => api.delete(`/schooldays/${id}`),
  getStatistics: (schoolId: string, params?: any) => 
    api.get(`/schooldays/school/${schoolId}/statistics`, { params })
};

export const emergencyScheduleAPI = {
  getAll: () => api.get('/emergency-schedules'),
  getByDate: (date: string) => api.get(`/emergency-schedules/date/${date}`),
  getById: (id: string) => api.get(`/emergency-schedules/${id}`),
  create: (data: any) => api.post('/emergency-schedules', data),
  update: (id: string, data: any) => api.put(`/emergency-schedules/${id}`, data),
  delete: (id: string) => api.delete(`/emergency-schedules/${id}`)
};
