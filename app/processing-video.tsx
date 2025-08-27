import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ActivityIndicator,
  TouchableOpacity,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from './(auth)/api';
import { useAuth } from './(auth)/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotification } from './components/NotificationProvider';

export default function ProcessingVideoScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { showNotification } = useNotification();
  const [status, setStatus] = useState('pending'); // pending, success, rejected
  const [message, setMessage] = useState('Your video is being processed...');
  const pollingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const spinValue = React.useRef(new Animated.Value(0)).current;

  const checkVideoStatus = React.useCallback(async () => {
    if (!token) return;
    
    try {
      // Get the task ID from AsyncStorage
      const taskId = await AsyncStorage.getItem('processing_task_id');
      if (!taskId) {
        // No task to check; stop polling quietly
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      const response = await axios.post(`${API_BASE_URL}/videos/check_task_status/`, {
        task_id: taskId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const { status: videoStatus, message: statusMessage } = response.data;
      
      if (videoStatus === 'success') {
        setStatus('success');
        setMessage('Your video has been processed successfully!');
        showNotification('Video uploaded successfully', 'success');
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Clean up the stored task ID
        await AsyncStorage.removeItem('processing_task_id');
        
        // Redirect after a delay
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 3000);
      } else if (videoStatus === 'rejected') {
        setStatus('rejected');
        setMessage(statusMessage || 'Your video was rejected because it does not meet our educational content guidelines.');
        showNotification('Video rejected', 'error');
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Clean up the stored task ID
        await AsyncStorage.removeItem('processing_task_id');
      } else if (videoStatus === 'error') {
        setStatus('rejected');
        setMessage('An error occurred while processing your video. Please try again.');
        showNotification('Processing error for your video', 'error');
        
        // Stop polling
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
        // Clean up the stored task ID
        await AsyncStorage.removeItem('processing_task_id');
      }
      // If still pending, continue polling
    } catch (error) {
      console.error('Error checking video status:', error);
      // If we get an error, it might be because the task is still processing
      // Continue polling unless it's a persistent error
    }
  }, [router, showNotification, token]);

  useEffect(() => {
    // Start polling for video status
    const interval = setInterval(checkVideoStatus, 5000); // Check every 5 seconds
    pollingIntervalRef.current = interval;

    // Clean up interval on unmount or when deps change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [checkVideoStatus]);

  useEffect(() => {
    // Start rotation animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    return () => {
      // Stop any ongoing animation on unmount
      spinValue.stopAnimation();
    };
  }, [spinValue]);

  // Interpolate the spin value to a rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  

  const goToHome = () => {
    router.replace('/(tabs)/home');
  };

  const goToCreateVideo = () => {
    router.replace('/create-video');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.processingContainer}>
          {status === 'pending' && (
            <>
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color="#58e2bd" />
              </View>
              <Text style={styles.title}>Processing Your Video</Text>
              <Text style={styles.description}>
                Please wait while we analyze your video to ensure it meets our educational content guidelines.
              </Text>
              <View style={styles.stepsContainer}>
                <View style={[styles.step, styles.activeStep]}>
                  <Ionicons name="checkmark-circle" size={24} color="#58e2bd" />
                  <Text style={styles.stepText}>Upload complete</Text>
                </View>
                <View style={[styles.step, styles.activeStep]}>
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <Ionicons name="sync" size={24} color="#58e2bd" />
                  </Animated.View>
                  <Text style={styles.stepText}>Processing video</Text>
                </View>
                <View style={styles.step}>
                  <Ionicons name="ellipse-outline" size={24} color="#777" />
                  <Text style={[styles.stepText, { color: '#777' }]}>Publishing</Text>
                </View>
              </View>
            </>
          )}
          
          {status === 'success' && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={80} color="#58e2bd" />
              </View>
              <Text style={styles.title}>Video Approved!</Text>
              <Text style={styles.description}>
                Your video has been processed and published successfully.
              </Text>
              <TouchableOpacity style={styles.button} onPress={goToHome}>
                <Text style={styles.buttonText}>Go to Home</Text>
              </TouchableOpacity>
            </>
          )}
          
          {status === 'rejected' && (
            <>
              <View style={styles.iconContainer}>
                <Ionicons name="close-circle" size={80} color="#ff4757" />
              </View>
              <Text style={styles.title}>Video Rejected</Text>
              <Text style={styles.description}>
                {message}
              </Text>
              <Text style={styles.helpText}>
                Please ensure your content is educational and try again.
              </Text>
              <TouchableOpacity style={styles.button} onPress={goToCreateVideo}>
                <Text style={styles.buttonText}>Upload Another Video</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <View style={styles.homeButton}>
        <TouchableOpacity onPress={goToHome}>
          <Text style={styles.homeButtonText}>Go to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingContainer: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 24,
  },
  helpText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#58e2bd',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  stepsContainer: {
    width: '100%',
    marginTop: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeStep: {
    opacity: 1,
  },
  stepText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  homeButton: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 