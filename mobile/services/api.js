import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default fallback
const DEFAULT_URL = 'https://erp.qcstyro.com';

const api = axios.create({
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Helper to get current base URL
export const getBaseUrl = async () => {
  const savedUrl = await AsyncStorage.getItem('server_url');
  return savedUrl || DEFAULT_URL;
};

// Interceptor to add auth headers and dynamically set baseURL
api.interceptors.request.use(async (config) => {
  // Set baseURL dynamically
  const baseUrl = await getBaseUrl();
  config.baseURL = baseUrl;

  // Set Auth tokens
  const userStr = await AsyncStorage.getItem('user_data');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.api_key && user.api_secret) {
      config.headers.Authorization = `token ${user.api_key}:${user.api_secret}`;
    }
  }
  return config;
});

export const frappeCall = async (method, args = {}) => {
  try {
    const response = await api.post(`/api/method/${method}`, args);
    return response.data.message;
  } catch (error) {
    console.error(`API Error (${method}):`, error.response?.data || error.message);
    throw error;
  }
};

export const login = async (usr, pwd, serverUrl) => {
  try {
    // Save the server URL first so the interceptor uses it
    if (serverUrl) {
      // Ensure the URL doesn't have a trailing slash
      const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
      await AsyncStorage.setItem('server_url', cleanUrl);
    }
    
    const res = await api.post('/api/method/clefincode_chat.api.api_1_2_1.api.login', { email: usr, password: pwd });
    
    const responseData = res.data.message[0];
    if (responseData.status === 1) {
      const keys = responseData.data[0];
      await AsyncStorage.setItem('user_data', JSON.stringify({
        email: usr,
        api_key: keys.api_key,
        api_secret: keys.api_secret,
        full_name: keys.full_name
      }));
      return responseData;
    } else {
      throw new Error(responseData.description);
    }
  } catch (error) {
    console.error("Login Error:", error);
    throw error;
  }
};

export const getChannels = async (user_email) => {
  const data = await frappeCall('clefincode_chat.api.api_1_2_1.api.get_channels_list', {
    user_email: user_email,
    limit: 20,
    offset: 0
  });
  return data?.results || []; // Correctly extract results array
};

export const getMessages = async (room, user_email) => {
  const data = await frappeCall('clefincode_chat.api.api_1_2_1.api.get_messages', {
    room: room,
    user_email: user_email,
    limit: 20,
    offset: 0,
    room_type: 'Group'
  });
  return data?.results || []; // Correctly extract results array
};

export const sendMessage = async (content, room, user_email) => {
  return frappeCall('clefincode_chat.api.api_1_3_1.api.send', {
    content: content,
    room: room,
    email: user_email,
    user: user_email
  });
};

export default api;
