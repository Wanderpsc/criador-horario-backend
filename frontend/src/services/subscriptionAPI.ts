import axios from 'axios';
import { API_URL } from './api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const subscriptionAPI = {
  getSchoolSubscription: (schoolId: string) => 
    axios.get(`${API_URL}/subscriptions/school/${schoolId}`, getAuthHeaders()),
  
  checkScheduleAccess: (schoolId: string) => 
    axios.get(`${API_URL}/subscriptions/school/${schoolId}/check-access`, getAuthHeaders()),
  
  getAvailablePlans: () => 
    axios.get(`${API_URL}/subscriptions/plans`, getAuthHeaders()),
  
  createSubscription: (data: any) => 
    axios.post(`${API_URL}/subscriptions`, data, getAuthHeaders()),
  
  signContract: (subscriptionId: string, data: any) => 
    axios.post(`${API_URL}/subscriptions/${subscriptionId}/sign-contract`, data, getAuthHeaders())
};
