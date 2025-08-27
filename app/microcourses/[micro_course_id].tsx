import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Link, router } from 'expo-router';
import api from '../(auth)/api';

// Define types
interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration: string;
  views: number;
  created_at: string;
}

interface MicroCourse {
  id: string;
  name: string;
  description: string;
  channel: {
    id: string;
    name: string;
    avatar: string | null;
    creator: {
      id: string;
      username: string;
    };
  };
  videos: Video[];
  created_at: string;
}

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const videoDate = new Date(dateString);
  const diffInMs = now.getTime() - videoDate.getTime();
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

export default function MicroCourseDetailScreen() {
  const { micro_course_id } = useLocalSearchParams();
  const [microCourse, setMicroCourse] = useState<MicroCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMicroCourseDetails();
  }, [micro_course_id]);

  const fetchMicroCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/micro-courses/${micro_course_id}/`);
      setMicroCourse(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching micro course details:', err);
      setError('Failed to load micro course details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58e2bd" />
          <Text style={styles.loadingText}>Loading micro course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !microCourse) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error || 'Micro course not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchMicroCourseDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.retryButton, styles.backButton]} 
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Course Header */}
        <View style={styles.courseHeader}>
          {/* Course thumbnail - using first video's thumbnail or placeholder */}
          <View style={styles.thumbnailContainer}>
            {microCourse.videos.length > 0 && microCourse.videos[0].thumbnail_url ? (
              <Image 
                source={{ uri: microCourse.videos[0].thumbnail_url }} 
                style={styles.courseThumbnail} 
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderThumbnail}>
                <Ionicons name="library-outline" size={60} color="#58e2bd" />
              </View>
            )}
            <View style={styles.headerOverlay}>
              <Text style={styles.courseName}>{microCourse.name}</Text>
              <Text style={styles.videoCount}>{microCourse.videos.length} videos</Text>
            </View>
          </View>
        </View>
        
        {/* Course Info */}
        <View style={styles.courseInfo}>
          <View style={styles.creatorInfo}>
            <Image 
              source={{ 
                uri: microCourse.channel.avatar || 'https://via.placeholder.com/40' 
              }} 
              style={styles.creatorAvatar} 
            />
            <View style={styles.creatorDetails}>
              <Text style={styles.creatorName}>{microCourse.channel.name}</Text>
              <Text style={styles.courseDate}>Created {formatRelativeTime(microCourse.created_at)}</Text>
            </View>
          </View>
          
          {microCourse.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About this Course</Text>
              <Text style={styles.courseDescription}>{microCourse.description}</Text>
            </View>
          )}
        </View>
        
        {/* Course Content */}
        <View style={styles.courseContent}>
          <Text style={styles.sectionTitle}>Course Content</Text>
          
          {microCourse.videos.length > 0 ? (
            <>
              {/* Start Learning Button */}
              <Link href={`/watch/${microCourse.videos[0].id}?micro_course=${micro_course_id}`} asChild>
                <TouchableOpacity style={styles.startButton}>
                  <Ionicons name="play-circle" size={24} color="#000" />
                  <Text style={styles.startButtonText}>Start First Video</Text>
                </TouchableOpacity>
              </Link>
              
              {/* Videos List */}
              <View style={styles.videosSection}>
                {microCourse.videos.map((video, index) => (
                  <Link 
                    key={video.id} 
                    href={`/watch/${video.id}?micro_course=${micro_course_id}`} 
                    asChild
                  >
                    <TouchableOpacity style={styles.videoItem}>
                      <View style={styles.videoNumber}>
                        <Text style={styles.videoNumberText}>{index + 1}</Text>
                      </View>
                      
                      <View style={styles.videoThumbnailContainer}>
                        <Image 
                          source={{ uri: video.thumbnail_url || 'https://via.placeholder.com/120x68' }} 
                          style={styles.videoThumbnail} 
                          resizeMode="cover"
                        />
                        {video.duration && (
                          <View style={styles.durationTag}>
                            <Text style={styles.durationText}>{video.duration}</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                        <Text style={styles.videoDescription} numberOfLines={2}>
                          {video.description}
                        </Text>
                        <Text style={styles.videoMeta}>
                          {video.views} views • {formatRelativeTime(video.created_at)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Link>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyVideos}>
              <Ionicons name="videocam-off-outline" size={48} color="#444" />
              <Text style={styles.emptyVideosText}>No videos in this course yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  courseHeader: {
    position: 'relative',
  },
  thumbnailContainer: {
    position: 'relative',
    height: 200,
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
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
  },
  courseName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoCount: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: '500',
  },
  courseInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '500',
  },
  courseDate: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  courseDescription: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
  },
  courseContent: {
    padding: 16,
  },
  startButton: {
    backgroundColor: '#58e2bd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 24,
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  videosSection: {
    gap: 12,
  },
  videoItem: {
    flexDirection: 'row',
    backgroundColor: '#202020',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#333',
  },
  videoNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#58e2bd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  videoNumberText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  videoThumbnailContainer: {
    position: 'relative',
    width: 120,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  durationTag: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  videoInfo: {
    flex: 1,
    paddingTop: 2,
  },
  videoTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  videoDescription: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  videoMeta: {
    color: '#666',
    fontSize: 12,
  },
  emptyVideos: {
    alignItems: 'center',
    padding: 40,
  },
  emptyVideosText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 12,
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
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#444',
  },
  retryButtonText: {
    color: '#121212',
    fontWeight: '600',
  },
}); 