import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './(auth)/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  // Navigate to chat with NAIDU
  const navigateToNaidu = () => {
    router.push('/chat' as any);
  };

  // Navigate to create video
  const navigateToCreateVideo = () => {
    router.push('/create-video' as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#58e2bd" />
      </View>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If user is authenticated, redirect to home tab
  return (
    <>
      <Redirect href="/(tabs)/home" />
      
      {/* Floating action buttons */}
      <View style={styles.floatingButtonsContainer}>
        {/* Create Video button */}
        <TouchableOpacity 
          style={styles.createVideoButton}
          onPress={navigateToCreateVideo}
        >
          <Ionicons name="add" size={24} color="#000" />
          <Text style={styles.createVideoText}>Create Video</Text>
        </TouchableOpacity>
        
        {/* NAIDU button */}
        <TouchableOpacity 
          style={styles.naiduButton}
          onPress={navigateToNaidu}
        >
          <Ionicons name="hardware-chip" size={24} color="#58e2bd" />
          <Text style={styles.naiduText}>NAIDU</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#202020',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  createVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#58e2bd',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginRight: 10,
  },
  createVideoText: {
    color: '#000',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  naiduButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#58e2bd',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  naiduText: {
    color: '#58e2bd',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
}); 