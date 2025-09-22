import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API
export const API_BASE_URL = 'https://knowble.up.railway.app/v1-1509/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Making API request to:', config.url);
    console.log('Request headers:', config.headers);
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.log('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Login function
export const loginUser = async (credentials: { email: string; password: string }) => {
  try {
    console.log('Attempting login with:', credentials.email);
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Google login function
export const googleLogin = async (idToken: string) => {
  try {
    console.log('Attempting Google login with ID token');
    const response = await api.post('/auth/google/', { id_token: idToken });
    return response.data;
  } catch (error) {
    console.error('Google login error:', error);
    throw error;
  }
};

// Register function
export const registerUser = async (userData: { 
  username: string; 
  email: string; 
  password: string; 
  bio?: string;
}) => {
  try {
    console.log('Attempting registration with:', userData.username, userData.email);
    const response = await api.post('/auth/register/', userData);
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

// Refresh token
export const refreshUserToken = async (refreshToken: string) => {
  try {
    const response = await api.post('/auth/refresh/', { refresh: refreshToken });
    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (token?: string) => {
  try {
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const response = await api.get('/users/me/', { headers });
    return response.data;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Edit username
export const editUsername = async (username: string) => {
  try {
    const response = await api.post('/users/edit_username/', { username });
    return response.data;
  } catch (error) {
    console.error('Edit username error:', error);
    throw error;
  }
};

// Edit bio
export const editBio = async (bio: string) => {
  try {
    const response = await api.post('/users/edit_bio/', { bio });
    return response.data;
  } catch (error) {
    console.error('Edit bio error:', error);
    throw error;
  }
};

// Edit profile picture (expects URL or base64 string per backend contract)
export const editProfilePicture = async (profile_picture: string) => {
  try {
    const response = await api.post('/users/edit_profile_picture/', { profile_picture });
    return response.data;
  } catch (error) {
    console.error('Edit profile picture error:', error);
    throw error;
  }
};

// Edit profile picture with file upload (multipart/form-data)
export const editProfilePictureFile = async (file: { uri: string; name?: string; type?: string }) => {
  try {
    const formData = new FormData();
    const filename = file.name || `profile_${Date.now()}.jpg`;
    const mime = file.type || 'image/jpeg';
    
    console.log('Uploading profile picture:', { uri: file.uri, filename, mime });
    
    // React Native FormData file object shape
    formData.append('profile_picture', {
      uri: file.uri,
      name: filename,
      type: mime,
    } as any);
    
    const response = await api.post('/users/edit_profile_picture/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('Profile picture upload successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Edit profile picture (file) error:', error);
    throw error;
  }
};

// Toggle like on video
export const toggleVideoLike = async (videoId: string | number) => {
  try {
    console.log('Toggling like for video:', videoId);
    // Send an empty JSON body to satisfy content-type header
    const response = await api.post(`/videos/${videoId}/toggle_like/`, {});
    console.log('Toggle like response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Toggle like error:', error);
    throw error;
  }
};

// Toggle save video
export const toggleSaveVideo = async (videoId: string | number) => {
  try {
    console.log('Toggling save for video:', videoId);
    // Note: backend route uses hyphen, not underscore
    const response = await api.post(`/saved-videos/toggle/`, { video_id: videoId });
    console.log('Toggle save response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Toggle save error:', error);
    throw error;
  }
};

// Get video details with like status
export const getVideoDetails = async (videoId: string | number) => {
  try {
    console.log('Fetching video details for:', videoId);
    const response = await api.get(`/videos/${videoId}/`);
    return response.data;
  } catch (error) {
    console.error('Get video details error:', error);
    throw error;
  }
};

// Send message to NAIDU chat assistant
export const sendChatMessage = async (message: string, videoId?: string | number) => {
  try {
    console.log('Sending chat message to NAIDU:', message);
    const payload = videoId ? { message, video_id: videoId } : { message };
    const response = await api.post('/chat/', payload);
    return response.data;
  } catch (error) {
    console.error('Chat message error:', error);
    throw error;
  }
};

// Get related videos for scroll functionality
export const getRelatedVideos = async (videoId: string | number, contextType?: string, contextId?: string) => {
  try {
    console.log('Fetching related videos for:', videoId, contextType, contextId);
    let url = `/videos/${videoId}/related/`;
    
    // Add query parameters based on context
    const params = new URLSearchParams();
    if (contextType) params.append('context_type', contextType);
    if (contextId) params.append('context_id', contextId);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Get related videos error:', error);
    // If the endpoint doesn't exist, fallback to getting all videos
    try {
      console.log('Falling back to general videos list');
      const response = await api.get('/videos/');
      return Array.isArray(response.data) ? response.data : response.data.results || [];
    } catch (fallbackError) {
      console.error('Fallback videos fetch failed:', fallbackError);
      throw error;
    }
  }
};

// Search API
export const searchContent = async (query: string, type: string = 'all', limit: number = 10, offset: number = 0) => {
  try {
    console.log('Searching for:', query, 'type:', type);
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('type', type);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    const url = `/search/?${params.toString()}`;
    console.log('Search URL:', url);
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

export default api; 