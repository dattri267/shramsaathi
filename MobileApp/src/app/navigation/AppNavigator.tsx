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


// ==================================================
// BOOKING TYPES
// ==================================================

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'completed'
  | 'payment_pending'
  | 'paid'
  | 'cancelled';


// ==================================================
// BOOKING TYPE
// ==================================================

export type Booking = {
  id?: string;

  // Customer
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;

  // Worker
  workerId?: string;
  workerName?: string;
  workerPhone?: string;
  workerEmail?: string;

  // Service
  service?: string;
  additionalSkills?: string[];

  // Schedule
  date?: string;
  time?: string;

  // Location
  address?: {
    house?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };

  // Pricing
  estimatedPrice?: number;
  finalPrice?: number;

  // Payment
  paymentStatus?:
    | 'pending'
    | 'processing'
    | 'paid'
    | 'failed';

  customerAmount?: number;

  workerAmount?: number;

  commissionAmount?: number;

  commissionPercentage?: number;

  // Booking status
  status?: BookingStatus;

  // Job information
  workStartedAt?: string;
  workCompletedAt?: string;

  // Cancellation
  cancellationReason?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
};


// ==================================================
// USER TYPE
// ==================================================

export type UserData = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};


// ==================================================
// WORKER TYPE
// ==================================================

export type WorkerData = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};


// ==================================================
// NAVIGATION PARAM LIST
// ==================================================

export type RootStackParamList = {

  // ----------------------------------------------
  // Authentication
  // ----------------------------------------------

  Login: undefined;

  Register: undefined;


  // ----------------------------------------------
  // Worker Details
  // ----------------------------------------------

  WorkerDetails: {
    email?: string;
    mobile?: string;
  };


  // ----------------------------------------------
  // Customer Details
  // ----------------------------------------------

  CustomerDetails: {
    email?: string;
    mobile?: string;
  };


  // ----------------------------------------------
  // Customer Dashboard
  // ----------------------------------------------

  UserDashboard:
    | {
        user?: UserData;

        // Optional booking data.
        // Useful later when backend integration
        // starts passing booking information.
        booking?: Booking;
      }
    | undefined;


  // ----------------------------------------------
  // Worker Dashboard
  // ----------------------------------------------

  WorkerDashboard:
    | {
        worker?: WorkerData;

        // Optional booking selected/opened
        // from the worker dashboard.
        booking?: Booking;
      }
    | undefined;
};


// ==================================================
// STACK
// ==================================================

const Stack =
  createNativeStackNavigator<RootStackParamList>();


// ==================================================
// APP NAVIGATOR
// ==================================================

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

        {/* ======================================== */}
        {/* LOGIN */}
        {/* ======================================== */}

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />


        {/* ======================================== */}
        {/* REGISTER */}
        {/* ======================================== */}

        <Stack.Screen
          name="Register"
          component={RegisterScreen}
        />


        {/* ======================================== */}
        {/* WORKER DETAILS */}
        {/* ======================================== */}

        <Stack.Screen
          name="WorkerDetails"
          component={WorkerDetailsScreen}
        />


        {/* ======================================== */}
        {/* CUSTOMER DETAILS */}
        {/* ======================================== */}

        <Stack.Screen
          name="CustomerDetails"
          component={CustomerDetailsScreen}
        />


        {/* ======================================== */}
        {/* CUSTOMER DASHBOARD */}
        {/* ======================================== */}

        <Stack.Screen
          name="UserDashboard"
          component={UserDashboard}
        />


        {/* ======================================== */}
        {/* WORKER DASHBOARD */}
        {/* ======================================== */}

        <Stack.Screen
          name="WorkerDashboard"
          component={WorkerDashboard}
        />

      </Stack.Navigator>

    </NavigationContainer>
  );
}