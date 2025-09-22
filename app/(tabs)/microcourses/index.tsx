import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import api from '../../(auth)/api';

// Define the micro course type
interface MicroCourse {
  id: string;
  name: string;
  description: string;
  channel: {
    id: string;
    name: string;
    creator: {
      profile_picture_url: string | null;
    };
    username: string;
  };
  videos: any[]; // Array of videos
  created_at: string;
}


export default function MicroCoursesScreen() {
  const [microCourses, setMicroCourses] = useState<MicroCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMicroCourses();
  }, []);

  const fetchMicroCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/micro-courses/');
      setMicroCourses(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching micro courses:', err);
      setError('Failed to load micro courses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const response = await api.get('/micro-courses/');
      setMicroCourses(response.data);
      setError(null);
    } catch (err) {
      console.error('Error refreshing micro courses:', err);
      setError('Failed to refresh micro courses. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const renderMicroCourseItem = ({ item }: { item: MicroCourse }) => (
    <Link href={`/microcourses/${item.id}`} asChild>
      <TouchableOpacity style={styles.courseCard}>
        <View style={styles.courseContent}>
          {item.channel.creator.profile_picture_url ? (
            <Image
              source={{ uri: item.channel.creator.profile_picture_url }}
              style={styles.creatorAvatar}
            />
          ) : (
            <View style={[styles.creatorAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          )}
          <View style={styles.courseDetails}>
            <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.courseDescription} numberOfLines={2}>
              {item.description || 'Learn with this comprehensive micro course.'}
            </Text>
            <View style={styles.courseMeta}>
              <Text style={styles.creatorName}>{item.channel.name}</Text>
              <Text style={styles.videoCountText}>{item.videos.length} videos</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58e2bd" />
          <Text style={styles.loadingText}>Loading micro courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMicroCourses}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Text style={styles.heading}>Micro Courses</Text>
      <Text style={styles.subheading}>Curated learning paths for focused skill development</Text>
      
      {microCourses.length > 0 ? (
        <FlatList
          data={microCourses}
          renderItem={renderMicroCourseItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.coursesList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={64} color="#444" />
          <Text style={styles.emptyText}>No micro courses available yet</Text>
          <Text style={styles.emptySubtext}>Check back later for new courses!</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  heading: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subheading: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 24,
  },
  coursesList: {
    paddingBottom: 16,
  },
  courseCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  courseContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  courseDetails: {
    flex: 1,
  },
  courseName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  courseDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  courseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorName: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  videoCountText: {
    color: '#58e2bd',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#121212',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
}); 