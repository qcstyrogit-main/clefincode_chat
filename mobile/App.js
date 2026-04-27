import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';
import { theme } from './theme';

import LoginScreen from './screens/LoginScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatRoomScreen from './screens/ChatRoomScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Login');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user_data');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUserData(parsed);
          setInitialRoute('ChatList');
        }
      } catch (e) {
        console.error("Failed to load session", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkLoginStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ChatList" 
          component={ChatListScreen} 
          initialParams={{ user_email: userData?.email }}
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="ChatRoom" 
          component={ChatRoomScreen} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
