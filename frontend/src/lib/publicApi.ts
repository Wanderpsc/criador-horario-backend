import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cliente público sem autenticação — não redireciona para login em 401
const publicApi = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s – suficiente para o Render acordar do cold-start
  headers: {
    'Content-Type': 'application/json',
  },
});

export default publicApi;
