import React, { useState } from 'react';
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
import { googleLogin } from './api';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

// Google OAuth configuration
GoogleSignin.configure({
  webClientId: "238570610028-j8ni922nikv62bdlese8jibji02lpla3.apps.googleusercontent.com",
  scopes: ["email", "profile"],
  forceCodeForRefreshToken: true,
  iosClientId: "238570610028-amf9iue9t4mqihsbras06r0drdlouqgv.apps.googleusercontent.com",
});

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const router = useRouter();
  const { login, loginWithTokens } = useAuth();

  // Get Google ID token
  const getGoogleIdToken = async (): Promise<string> => {
    try {
      // Check if Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();
      console.log('Google Sign-In successful:', userInfo);

      // Prefer ID token from the sign-in response; fallback to getTokens()
      const idTokenFromUser = (userInfo as any)?.idToken;
      const idToken = idTokenFromUser || (await GoogleSignin.getTokens()).idToken;

      if (!idToken) {
        throw new Error('No ID token received from Google');
      }

      return idToken;
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            throw new Error('SIGN_IN_CANCELLED');
          case statusCodes.IN_PROGRESS:
            throw new Error('SIGN_IN_IN_PROGRESS');
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error('PLAY_SERVICES_NOT_AVAILABLE');
          default:
            throw new Error('GOOGLE_SIGN_IN_ERROR');
        }
      } else {
        throw error;
      }
    }
  };

  // Send ID token to backend and complete login
  const authenticateWithBackend = async (idToken: string) => {
    try {
      console.log('Sending ID token to backend...');

      // Send ID token to backend
      const data = await googleLogin(idToken);

      // Persist tokens and user data
      await loginWithTokens(data.access, data.refresh);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Backend authentication error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to authenticate with Google';
      Alert.alert('Login Error', errorMessage);
      throw error;
    }
  };

  // Handle Google Sign-In (combines both functions)
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);

      // Ensure previous Google session is cleared so the account chooser shows up
      try {
        await GoogleSignin.signOut();
      } catch {}
      try {
        await GoogleSignin.revokeAccess();
      } catch {}

      // Step 1: Get Google ID token
      const idToken = await getGoogleIdToken();

      // Step 2: Send to backend and complete authentication
      await authenticateWithBackend(idToken);
    } catch (error: any) {
      // Handle Google-specific errors with user-friendly messages
      if (error.message === 'SIGN_IN_CANCELLED') {
        Alert.alert('Sign In Cancelled', 'Google Sign-In was cancelled by the user.');
      } else if (error.message === 'SIGN_IN_IN_PROGRESS') {
        Alert.alert('Sign In In Progress', 'Google Sign-In is already in progress.');
      } else if (error.message === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Play Services Not Available', 'Google Play Services are not available on this device.');
      } else if (error.message === 'GOOGLE_SIGN_IN_ERROR') {
        Alert.alert('Google Sign-In Error', 'An unexpected error occurred during Google Sign-In.');
      }
      // Backend errors are already handled in authenticateWithBackend
    } finally {
      setIsGoogleLoading(false);
    }
  };
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
            style={[styles.googleButton, (isLoading || isGoogleLoading) && styles.disabledButton]}
            onPress={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
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
