import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Required for completing auth session
WebBrowser.maybeCompleteAuthSession();

// Detect whether we are running inside Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure redirect URI based on environment
const getRedirectUri = () => {
  if (isExpoGo) {
    // For Expo Go, use the auth.expo.io proxy
    return 'https://auth.expo.io/@aaryannaidu/Knowble-app';
  } else {
    // For standalone apps, use the custom scheme
    return 'knowbleapp://';
  }
};

const redirectUri = getRedirectUri();
console.log('Using redirect URI:', redirectUri);
console.log('Is Expo Go:', isExpoGo);

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  // Google Auth Request using the expo-auth-session/providers/google package
  // Using the Google provider with correct configuration
  const webClientId = '238570610028-j8ni922nikv62bdlese8jibji02lpla3.apps.googleusercontent.com';
  const androidClientId = '238570610028-8qoktie491467kffu97tjug01rtij584.apps.googleusercontent.com';
  const iosClientId = '238570610028-amf9iue9t4mqihsbras06r0drdlouqgv.apps.googleusercontent.com';
  
  // Log the client ID we're using based on platform
  const activeClientId = isExpoGo ? webClientId : Platform.select({
    ios: iosClientId,
    android: androidClientId,
    default: webClientId
  });
  console.log('Using client ID:', activeClientId);
  
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: activeClientId,
    redirectUri,
    scopes: ['profile', 'email', 'openid'],
    usePKCE: false,
    responseType: 'id_token',
    extraParams: {
      access_type: 'offline',
    },
  });
  
  console.log('Using Google auth with', isExpoGo ? 'Expo Go (proxy)' : 'standalone app');

  // We'll handle the OAuth response after defining the exchange function below

  // Backend login using JWT endpoint
  const loginWithBackend = useCallback(async (idToken: string) => {
    try {
      console.log('Sending ID token to backend...');
      const res = await fetch('https://knowble.up.railway.app/v1-1509/api/auth/google/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }), // Changed from access_token to id_token
      });
      
      const responseText = await res.text();
      console.log('Backend response:', res.status, responseText);
      
      try {
        const data = JSON.parse(responseText);
        if (res.ok) {
          // Store JWTs and update auth state
          await SecureStore.setItemAsync('accessToken', data.access);
          await SecureStore.setItemAsync('refreshToken', data.refresh);
          await login(data.user.email, ''); // Pass email to AuthContext (password not needed)
          router.replace('/(tabs)/home');
        } else {
          Alert.alert('Login Error', data.error || 'Failed to authenticate with server');
        }
      } catch (parseError) {
        Alert.alert('Login Error', 'Invalid response from server');
        console.error('Failed to parse JSON response:', parseError);
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Server communication failed');
      console.error('Network error:', error);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [login, router]);

  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      setIsGoogleLoading(true);
      console.log('Handling Google response:', JSON.stringify(response, null, 2));
      
      if (response.type === 'success' && response.params?.id_token) {
        console.log('Got ID token from Google');
        await loginWithBackend(response.params.id_token);
      } else if (response.type === 'dismiss') {
        console.log('Google sign-in was dismissed by user');
        setIsGoogleLoading(false);
        // Don't show error for user dismissal
      } else if (response.type === 'cancel') {
        console.log('Google sign-in was cancelled by user');
        setIsGoogleLoading(false);
        // Don't show error for user cancellation
      } else if (response.type === 'error') {
        console.error('Google sign-in error:', response.error);
        Alert.alert('Authentication Error', response.error?.message || 'Google sign-in failed');
        setIsGoogleLoading(false);
      } else {
        console.error('Unexpected response from Google sign-in:', response);
        Alert.alert('Authentication Error', 'Unexpected response from Google sign-in. Please try again.');
        setIsGoogleLoading(false);
      }
    } catch (error: any) {
      console.error('Error in handleGoogleResponse:', error);
      Alert.alert('Google Sign-In Error', error.message || 'Failed to authenticate with Google');
      setIsGoogleLoading(false);
    }
  }, [loginWithBackend]);

  // Handle Google OAuth response
  useEffect(() => {
    if (response) {
      console.log('Google auth response received:', response.type);
      handleGoogleResponse(response);
    }
  }, [response, handleGoogleResponse]);

  

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      setIsLoading(true);
      await login(email, password);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed. Please try again.';
      Alert.alert('Login Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push('./register');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Knowble</Text>
          <Text style={styles.tagline}>Learn anything, anytime</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Log In</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#58e2bd" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#58e2bd" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#999"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => Alert.alert('Info', 'Password reset functionality coming soon!')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading || isGoogleLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleButton, !request && styles.disabledButton]}
            onPress={async () => {
              if (!request) {
                Alert.alert('Error', 'Google authentication not ready. Please wait and try again.');
                return;
              }

              setIsGoogleLoading(true);
              console.log('Attempting Google login...');
              console.log('Environment:', isExpoGo ? 'Expo Go' : 'Standalone');
              console.log('Using redirect URI:', redirectUri);
              console.log('Using client ID:', activeClientId);
              
              try {
                const result = await promptAsync();
                console.log('Prompt async result:', JSON.stringify(result, null, 2));
                
                // The response will be handled by the useEffect hook
                // So we don't need to manually handle it here
                if (result.type === 'dismiss' || result.type === 'cancel') {
                  setIsGoogleLoading(false);
                }
              } catch (error) {
                console.error('Google auth error:', error);
                Alert.alert('Authentication Error', 'Failed to start Google authentication. Please try again.');
                setIsGoogleLoading(false);
              }
            }}
            disabled={!request || isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={20} color="#fff" style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202020',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#58e2bd',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#ccc',
  },
  formContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#58e2bd',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#58e2bd',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#202020',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  registerText: {
    color: '#ccc',
    fontSize: 14,
  },
  registerLink: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;