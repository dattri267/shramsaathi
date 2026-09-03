import React from 'react';
import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import LoginScreen from '../loginscreen/Loginscreen';
import RegisterScreen from '../registerscreen/RegisterScreen';
import UserDashboard from '../userdashboard/UserDashboard';
import WorkerDashboard from '../worker/WorkerDashboard';

export type RootStackParamList = {
  Login: undefined;

  Register: undefined;

  UserDashboard:
    | {
        user?: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
        };
      }
    | undefined;

  WorkerDashboard:
    | {
        worker?: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
        };
      }
    | undefined;
};

const Stack =
  createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        <Stack.Screen
          name="UserDashboard"
          component={UserDashboard}
        />

        <Stack.Screen
          name="WorkerDashboard"
          component={WorkerDashboard}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}