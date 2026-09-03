import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../loginscreen/Loginscreen';
import UserDashboard from '../userdashboard/UserDashboard';

import { View, Text, StyleSheet } from 'react-native';

export type RootStackParamList = {
  Login: undefined;

  UserDashboard: {
    user?: {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
    };
  } | undefined;

  WorkerDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function WorkerPlaceholder() {
  return (
    <View style={styles.workerContainer}>
      <Text style={styles.workerTitle}>Worker Dashboard</Text>

      <Text style={styles.workerText}>
        Worker dashboard will be added here.
      </Text>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="UserDashboard"
          component={UserDashboard}
        />

        <Stack.Screen
          name="WorkerDashboard"
          component={WorkerPlaceholder}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  workerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  workerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },

  workerText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
});