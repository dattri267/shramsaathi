import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
/*
|--------------------------------------------------------------------------
| API CONFIGURATION
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Change this IP address to the IPv4 address of the computer running
| your Express backend.
|
| Example:
|   http://192.168.1.5:8000
|
| DO NOT use localhost when testing Expo Go on a physical phone.
|
*/

export const API_BASE_URL = 'http://10.64.72.168:8000';

const TOKEN_KEY = '@shramsaathi_auth_token';

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type UserRole = 'customer' | 'worker';

export type LoginResponse = {
  message: string;
  access_token: string;
  token: string;
  expires_in: number;

  user: {
    id: string;
    email: string;
  };

  profile: {
    id: string;
    role: UserRole;
    full_name?: string | null;
    phone?: string | null;
  };
};

export type SignupResponse = {
  message: string;
  access_token: string;
  token: string;
  expires_in: number;

  user: {
    id: string;
    email: string;
  };

  profile: {
    id: string;
    role: UserRole;
    full_name?: string | null;
    phone?: string | null;
  };
};

/*
|--------------------------------------------------------------------------
| TOKEN HELPERS
|--------------------------------------------------------------------------
*/

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/*
|--------------------------------------------------------------------------
| GENERIC API REQUEST
|--------------------------------------------------------------------------
*/

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    console.log('========== API REQUEST FAILED ==========');
    console.log('URL:', `${API_BASE_URL}${endpoint}`);
    console.log('ERROR:', error);
    console.log(
      'ERROR MESSAGE:',
      error instanceof Error ? error.message : String(error)
    );
    console.log('=========================================');

    throw new Error(
      error instanceof Error
        ? `Network error: ${error.message}`
        : `Network error: ${String(error)}`
    );
  }

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

/**
 * Register a new customer or worker.
 *
 * Backend:
 * POST /auth/signup
 */

export async function signup(params: {
  email: string;
  password: string;
  phone: string;
  full_name: string;
  role: UserRole;
}): Promise<SignupResponse> {
  const data = await apiRequest<SignupResponse>(
    '/auth/signup',
    {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        phone: params.phone,
        full_name: params.full_name,
        role: params.role,
      }),
    }
  );

  const token =
    data.access_token ||
    data.token;

  if (token) {
    await saveToken(token);
  }

  return data;
}

/**
 * Login existing customer or worker.
 *
 * Backend:
 * POST /auth/login
 */

export async function login(params: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        password: params.password,
      }),
    }
  );

  const token =
    data.access_token ||
    data.token;

  if (token) {
    await saveToken(token);
  }

  return data;
}

/**
 * Logout.
 */

export async function logout() {
  await clearToken();
}

/*
|--------------------------------------------------------------------------
| CUSTOMER PROFILE
|--------------------------------------------------------------------------
*/

/**
 * Get logged-in customer profile.
 *
 * Backend:
 * GET /api/customer/profile
 */

export async function getCustomerProfile() {
  return apiRequest<{
    profile: any;
  }>('/api/customer/profile');
}

/**
 * Update logged-in customer profile.
 *
 * Backend:
 * PATCH /api/customer/profile
 */

export async function updateCustomerProfile(data: {
  full_name?: string;
  phone?: string;
  avatar_url?: string | null;

  address_details?: {
    house?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
    formatted_address?: string;
    latitude?: number | null;
    longitude?: number | null;
  };

  latitude?: number;
  longitude?: number;
}) {
  return apiRequest<{
    message: string;
    profile: any;
  }>(
    '/api/customer/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

/*
|--------------------------------------------------------------------------
| WORKER PROFILE
|--------------------------------------------------------------------------
*/

/**
 * Get logged-in worker profile.
 *
 * Backend:
 * GET /api/worker/profile
 */

export async function getWorkerProfile() {
  return apiRequest<{
    profile: any;
  }>('/api/worker/profile');
}

/**
 * Update logged-in worker profile.
 *
 * Backend:
 * PATCH /api/worker/profile
 */

export async function updateWorkerProfile(data: {
  full_name?: string;
  phone?: string;
  avatar_url?: string | null;

  bio?: string;

  primary_skill?: string;
  additional_skills?: string[];

  years_experience?: number;

  service_radius_km?: number;
  hourly_rate?: number;

  working_days?: string[];
  working_hours?: string[];

  service_address?: {
    house?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };

  latitude?: number;
  longitude?: number;

  documents?: Array<{
    file_type:
      | 'certificate'
      | 'work_evidence'
      | 'invoice'
      | 'identity_proof'
      | 'address_proof';

    title?: string;
    storage_path: string;
    public_url?: string | null;
  }>;
}) {
  return apiRequest<{
    message: string;
    profile: any;
  }>(
    '/api/worker/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

/*
|--------------------------------------------------------------------------
| FILE UPLOADS
|--------------------------------------------------------------------------
*/

/**
 * Upload worker profile photo.
 *
 * Backend:
 * POST /api/profile/avatar
 *
 * Multipart field:
 * avatar
 */

export async function uploadWorkerAvatar(
  uri: string,
  fileName: string = 'profile.jpg',
  mimeType: string = 'image/jpeg'
) {
  const token = await getToken();

  const formData = new FormData();

  formData.append(
    'avatar',
    {
      uri,
      name: fileName,
      type: mimeType,
    } as any
  );

  let response: Response;

  try {
    console.log('========== AVATAR UPLOAD ==========');
    console.log(
      'URL:',
      `${API_BASE_URL}/api/profile/avatar`
    );
    console.log('URI:', uri);
    console.log('FILE NAME:', fileName);
    console.log('MIME TYPE:', mimeType);
    console.log('TOKEN EXISTS:', !!token);

    response = await fetch(
      `${API_BASE_URL}/api/profile/avatar`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );
  } catch (error) {
    console.log('========== AVATAR FETCH FAILED ==========');
    console.log('ERROR:', error);
    console.log(
      'ERROR MESSAGE:',
      error instanceof Error
        ? error.message
        : String(error)
    );
    console.log('==========================================');

    throw new Error(
      error instanceof Error
        ? `Profile photo upload network error: ${error.message}`
        : `Profile photo upload network error: ${String(error)}`
    );
  }

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      `Profile photo upload failed with status ${response.status}`
    );
  }

  return data;
}

/**
 * Upload a worker document.
 *
 * Backend:
 * POST /api/worker/documents
 *
 * Multipart field:
 * file
 */

export async function uploadWorkerDocument(params: {
  uri: string;
  fileName: string;
  mimeType: string;
  fileType:
    | 'certificate'
    | 'work_evidence'
    | 'invoice'
    | 'identity_proof'
    | 'address_proof';
  title?: string;
}) {
  const token = await getToken();

  if (!token) {
    throw new Error('Authentication token is missing. Please log in again.');
  }

  console.log('==========================================');
  console.log('       WORKER DOCUMENT UPLOAD');
  console.log('==========================================');

  console.log(
    'URL:',
    `${API_BASE_URL}/api/worker/documents`
  );

  console.log('URI:', params.uri);
  console.log('FILE NAME:', params.fileName);
  console.log('MIME TYPE:', params.mimeType);
  console.log('FILE TYPE:', params.fileType);
  console.log('TOKEN EXISTS:', !!token);

  try {
    /*
     * Expo SDK 57:
     * Convert the local URI into a real Expo File object.
     */
    const file = new File(params.uri);

    console.log('FILE OBJECT CREATED');
    console.log('FILE URI:', file.uri);
    console.log('FILE NAME:', file.name);
    console.log('FILE TYPE:', file.type);
    console.log('FILE EXISTS:', file.exists);

    /*
     * Use the File object as the FormData part.
     * This avoids the old React Native
     * { uri, name, type } FormDataPart implementation.
     */
    const formData = new FormData();

    formData.append('file', file);

    formData.append(
      'file_type',
      params.fileType
    );

    if (params.title) {
      formData.append(
        'title',
        params.title
      );
    }

    console.log('FORM DATA CREATED');
    console.log('STARTING FETCH...');

    const response = await expoFetch(
      `${API_BASE_URL}/api/worker/documents`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${token}`,
        },

        /*
         * DO NOT manually set Content-Type.
         * Expo generates the multipart boundary.
         */
        body: formData,
      }
    );

    console.log('DOCUMENT RESPONSE STATUS:', response.status);
    console.log('DOCUMENT RESPONSE OK:', response.ok);

    let data: any = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    console.log('DOCUMENT RESPONSE DATA:', data);

    if (!response.ok) {
      throw new Error(
        data?.error ||
        data?.message ||
        `Document upload failed with status ${response.status}`
      );
    }

    console.log('DOCUMENT UPLOAD SUCCESS');
    console.log('==========================================');

    return data;
  } catch (error) {
    console.log('==========================================');
    console.log('   DOCUMENT UPLOAD FAILED');
    console.log('==========================================');

    console.log('ERROR:', error);

    console.log(
      'ERROR MESSAGE:',
      error instanceof Error
        ? error.message
        : String(error)
    );

    console.log(
      'ERROR NAME:',
      error instanceof Error
        ? error.name
        : 'unknown'
    );

    console.log('==========================================');

    throw new Error(
      error instanceof Error
        ? `Document upload failed: ${error.message}`
        : `Document upload failed: ${String(error)}`
    );
  }
}

/*
|--------------------------------------------------------------------------
| WORKER AVAILABILITY
|--------------------------------------------------------------------------
*/

export async function updateWorkerAvailability(
  availability: string
) {
  return apiRequest<{
    message: string;
    worker: any;
  }>(
    '/api/worker/availability',
    {
      method: 'PATCH',

      body: JSON.stringify({
        availability,
      }),
    }
  );
}

/*
|--------------------------------------------------------------------------
| SKILLS
|--------------------------------------------------------------------------
*/

/**
 * Get all available services/skills.
 *
 * Backend:
 * GET /api/skills
 */

export async function getSkills() {
  const response = await apiRequest<any>(
    '/api/skills'
  );

  console.log(
    'GET /api/skills response:',
    response
  );

  /*
   * Backend normally returns:
   *
   * {
   *   skills: [...]
   * }
   */

  if (
    response &&
    Array.isArray(response.skills)
  ) {
    return response.skills;
  }

  /*
   * Fallback if backend returns
   * the array directly.
   */

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

/*
|--------------------------------------------------------------------------
| CUSTOMER BOOKINGS
|--------------------------------------------------------------------------
*/

/**
 * Create a normal customer booking.
 *
 * Backend:
 * POST /api/customer/booking/create
 */

export async function createBooking(data: {
  skill_slug?: string;
  skill_id?: string;

  booking_type?: 'normal' | 'emergency';

  service_address: string;

  latitude: number;
  longitude: number;

  scheduled_start_at: string;

  estimated_amount?: number;

  customer_notes?: string;
}) {
  return apiRequest<any>(
    '/api/customer/booking/create',
    {
      method: 'POST',

      body: JSON.stringify(data),
    }
  );
}

/**
 * Get bookings belonging to logged-in customer.
 *
 * Backend:
 * GET /api/customer/bookings
 */

export async function getCustomerBookings() {
  return apiRequest<{
    bookings: any[];
  }>('/api/customer/bookings');
}

/**
 * Get one booking.
 *
 * Backend:
 * GET /api/booking/:id
 */

export async function getBooking(
  bookingId: string
) {
  return apiRequest<any>(
    `/api/booking/${bookingId}`
  );
}

/**
 * Cancel customer booking.
 *
 * Backend:
 * PATCH /api/customer/booking/:id/cancel
 */

export async function cancelCustomerBooking(
  bookingId: string
) {
  return apiRequest<any>(
    `/api/customer/booking/${bookingId}/cancel`,
    {
      method: 'PATCH',
    }
  );
}

/*
|--------------------------------------------------------------------------
| WORKER BOOKINGS
|--------------------------------------------------------------------------
*/

/**
 * Get jobs visible to logged-in worker.
 *
 * Backend:
 * GET /api/worker/bookings
 */

export async function getWorkerBookings() {
  return apiRequest<{
    bookings?: any[];
    jobs?: any[];
  }>('/api/worker/bookings');
}

/**
 * Accept a booking.
 *
 * Backend:
 * PATCH /api/worker/booking/:id/accept
 */

export async function acceptBooking(
  bookingId: string
) {
  return apiRequest<any>(
    `/api/worker/booking/${bookingId}/accept`,
    {
      method: 'PATCH',
    }
  );
}

/**
 * Start a booking.
 *
 * Backend:
 * PATCH /api/worker/booking/:id/start
 */

export async function startBooking(
  bookingId: string
) {
  return apiRequest<any>(
    `/api/worker/booking/${bookingId}/start`,
    {
      method: 'PATCH',
    }
  );
}

/**
 * Complete a booking.
 *
 * Backend:
 * PATCH /api/worker/booking/:id/complete
 */

export async function completeBooking(
  bookingId: string,
  finalAmount?: number
) {
  return apiRequest<any>(
    `/api/worker/booking/${bookingId}/complete`,
    {
      method: 'PATCH',

      body: JSON.stringify(
        finalAmount !== undefined
          ? {
              final_amount: finalAmount,
            }
          : {}
      ),
    }
  );
}