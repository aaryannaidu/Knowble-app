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
    avatar: string | null;
    creator: {
      username: string;
    };
  };
  videos: any[]; // Array of videos
  created_at: string;
}

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const courseDate = new Date(dateString);
  const diffInMs = now.getTime() - courseDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export default function MicroCoursesScreen() {
  const [microCourses, setMicroCourses] = useState<MicroCourse[]>([]);
  const [loading, setLoading] = useState(true);
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

  const renderMicroCourseItem = ({ item }: { item: MicroCourse }) => (
    <Link href={`/microcourses/${item.id}`} asChild>
      <TouchableOpacity style={styles.courseCard}>
        {/* Course thumbnail - using first video's thumbnail or placeholder */}
        <View style={styles.thumbnailContainer}>
          {item.videos.length > 0 && item.videos[0].thumbnail_url ? (
            <Image 
              source={{ uri: item.videos[0].thumbnail_url }} 
              style={styles.courseThumbnail} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Ionicons name="play-circle-outline" size={40} color="#58e2bd" />
            </View>
          )}
          <View style={styles.videoCountBadge}>
            <Text style={styles.videoCountText}>{item.videos.length} videos</Text>
          </View>
        </View>
        
        {/* Course info */}
        <View style={styles.courseInfo}>
          <Text style={styles.courseName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.courseDescription} numberOfLines={3}>
            {item.description || 'Learn with this comprehensive micro course.'}
          </Text>
          
          <View style={styles.creatorInfo}>
            <Image 
              source={{ 
                uri: item.channel.avatar || 'https://via.placeholder.com/30' 
              }} 
              style={styles.creatorAvatar} 
            />
            <View style={styles.creatorDetails}>
              <Text style={styles.creatorName}>{item.channel.name}</Text>
              <Text style={styles.courseDate}>Created {formatRelativeTime(item.created_at)}</Text>
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
          refreshing={loading}
          onRefresh={fetchMicroCourses}
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
    backgroundColor: '#202020',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  courseThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoCountText: {
    color: '#58e2bd',
    fontSize: 12,
    fontWeight: '600',
  },
  courseInfo: {
    padding: 16,
  },
  courseName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  courseDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '500',
  },
  courseDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
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