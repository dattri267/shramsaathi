import React from 'react';
import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import WorkerDetailsScreen from '../workerdetails/workerdetailsscreen';
import LoginScreen from '../loginscreen/Loginscreen';
import RegisterScreen from '../registerscreen/RegisterScreen';
import CustomerDetailsScreen from '../customerdetails/CustomerDetailsScreen';
import UserDashboard from '../userdashboard/UserDashboard';
import WorkerDashboard from '../worker/WorkerDashboard';

export type RootStackParamList = {
  Login: undefined;

  Register: undefined;
WorkerDetails: {
  email?: string;
  mobile?: string;
};
  CustomerDetails: {
    email?: string;
    mobile?: string;
  };

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
        {/* Login */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
<Stack.Screen
  name="WorkerDetails"
  component={WorkerDetailsScreen}
/>
        {/* Registration */}
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />

        {/* Customer Personal Details */}
        <Stack.Screen
          name="CustomerDetails"
          component={CustomerDetailsScreen}
        />

        {/* Customer Dashboard */}
        <Stack.Screen
          name="UserDashboard"
          component={UserDashboard}
        />

        {/* Worker Dashboard */}
        <Stack.Screen
          name="WorkerDashboard"
          component={WorkerDashboard}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}