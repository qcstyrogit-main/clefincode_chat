import { io } from 'socket.io-client';
import { getBaseUrl } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;

export const initSocket = async (userEmail) => {
  let baseUrl = await getBaseUrl();
  
  // Frappe socket.io usually runs on port 9000
  // If baseUrl has port 8000, swap it for 9000
  if (baseUrl.includes(':8000')) {
    baseUrl = baseUrl.replace(':8000', ':9000');
  } else if (!baseUrl.includes(':')) {
    // If no port, try appending :9000
    baseUrl = `${baseUrl}:9000`;
  }

  const userStr = await AsyncStorage.getItem('user_data');
  let auth = {};
  
  if (userStr) {
    const user = JSON.parse(userStr);
    auth = {
      api_key: user.api_key,
      api_secret: user.api_secret
    };
  }
  
  if (socket) {
    socket.disconnect();
  }

  // Try connecting with both polling and websocket for better compatibility
  socket = io(baseUrl, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    auth: auth,
    extraHeaders: {
      'Authorization': `token ${auth.api_key}:${auth.api_secret}`
    },
    withCredentials: true,
    query: {
      user: userEmail
    }
  });

  socket.on('connect', () => {
    console.log('✅ Socket Connected to:', baseUrl);
    socket.emit('subscribe_user', userEmail);
  });

  socket.onAny((event, ...args) => {
    console.log(`📣 GLOBAL EVENT [${event}]:`, args);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket Connection Error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('⚠️ Socket Disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
