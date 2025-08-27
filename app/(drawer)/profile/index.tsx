import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useAuth } from '../../(auth)/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import axios from 'axios';
import { API_BASE_URL } from '../../(auth)/api';

const { width } = Dimensions.get('window');

// Define interfaces for our data types
interface Video {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  views: number;
  duration: string;
  created_at: string;
}

interface MicroCourse {
  id: number;
  name: string;
  description: string;
  videos: Video[];
  created_at: string;
}

interface Channel {
  id: number;
  name: string;
  description: string;
  avatar: string | null;
  subscribers_count: number;
  is_verified: boolean;
  creator: {
    id: string | number;
    username: string;
    profile_picture: string | null;
  };
}

const goToEditProfile = () => {
  router.push('/edit_profile');
}

const ProfileScreen = () => {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState<Video[]>([]);
  const [microCourses, setMicroCourses] = useState<MicroCourse[]>([]);
  const [userChannel, setUserChannel] = useState<Channel | null>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserChannel();
    }
  }, [user]);

  const fetchUserChannel = async () => {
    if (!user || !token) return;
    
    setIsLoadingContent(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/users/${user.id}/channel/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUserChannel(response.data);
      fetchChannelContent(response.data.id);
    } catch (error) {
      console.error('Error fetching user channel:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const fetchChannelContent = async (channelId: number) => {
    if (!channelId || !token) return;
    
    try {
      // Fetch videos
      const videosResponse = await axios.get(`${API_BASE_URL}/channels/${channelId}/videos/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(videosResponse.data);
      
      // Fetch micro courses
      const coursesResponse = await axios.get(`${API_BASE_URL}/channels/${channelId}/micro_courses/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMicroCourses(coursesResponse.data);
    } catch (error) {
      console.error('Error fetching channel content:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserChannel();
    setRefreshing(false);
  };

  const renderVideoItem = ({ item }: { item: Video }) => {
    const thumbnailUrl = item.thumbnail_url;
    const handlePress = () => router.push(`/watch/${item.id}`);
    return (
      <TouchableOpacity style={styles.videoCard} onPress={handlePress}>
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image 
              source={{ uri: thumbnailUrl }} 
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="play-circle" size={44} color="#58e2bd" />
            </View>
          )}
          <View style={styles.viewsTag}>
            <Text style={styles.viewsText}>{(item.views || 0)} views</Text>
          </View>
          {item.duration ? (
            <View style={styles.durationTag}>
              <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.videoInfo}> 
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMicroCourseItem = ({ item }: { item: MicroCourse }) => (
    <TouchableOpacity 
      style={styles.courseCard}
      onPress={() => router.push(`/microcourses/${item.id}`)}
    >
      <View style={styles.courseHeader}>
        <Ionicons name="library" size={24} color="#58e2bd" />
        <Text style={styles.courseTitle} numberOfLines={2}>{item.name}</Text>
      </View>
      <Text style={styles.courseDescription} numberOfLines={2}>{item.description}</Text>
      <Text style={styles.courseStats}>{item.videos.length} videos</Text>
    </TouchableOpacity>
  );

  const formatDuration = (durationString: string | undefined): string => {
    if (!durationString) return '0:00';
    
    // Parse the duration string (e.g., "00:03:45" or "PT3M45S")
    let minutes = 0;
    let seconds = 0;
    
    if (durationString.includes(':')) {
      const parts = durationString.split(':');
      if (parts.length >= 2) {
        minutes = parseInt(parts[parts.length - 2], 10);
        seconds = parseInt(parts[parts.length - 1], 10);
      }
    } else if (durationString.startsWith('PT')) {
      // ISO 8601 duration format
      const minutesMatch = durationString.match(/(\d+)M/);
      const secondsMatch = durationString.match(/(\d+)S/);
      
      if (minutesMatch) minutes = parseInt(minutesMatch[1], 10);
      if (secondsMatch) seconds = parseInt(secondsMatch[1], 10);
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderEmptyContent = () => (
    <View style={styles.emptyContainer}>
      {activeTab === 'videos' ? (
        <>
          <Ionicons name="videocam-outline" size={50} color="#58e2bd" />
          <Text style={styles.emptyText}>No videos yet</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/create-video')}
          >
            <Text style={styles.createButtonText}>Create Video</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="library-outline" size={50} color="#58e2bd" />
          <Text style={styles.emptyText}>No micro courses yet</Text>
        </>
      )}
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58e2bd" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Profile Header - YouTube Style */}
        <View style={styles.header}>
          <View style={styles.profileHeaderContent}>
            {/* Profile Image on Left */}
            <View style={styles.profileImageContainer}>
              {user.profile_picture ? (
                <Image 
                  source={{ uri: user.profile_picture_url.replace('http://', 'https://') }} 
                  style={styles.profileImage} 
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileImagePlaceholderText}>
                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Name and Bio on Right */}
            <View style={styles.profileTextContainer}>
              <Text style={styles.username}>{user.username}</Text>
              {user.bio ? (
                <Text style={styles.bio}>{user.bio}</Text>
              ) : (
                <Text style={styles.noBio}>the mathematician</Text>
              )}
              <View style={styles.editProfileContainer}>
                <TouchableOpacity onPress={goToEditProfile}>
                  <Text style={styles.editProfileButton}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>Videos</Text>
            {activeTab === 'videos' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
            onPress={() => setActiveTab('courses')}
          >
            <Text style={[styles.tabText, activeTab === 'courses' && styles.activeTabText]}>Micro Courses</Text>
            {activeTab === 'courses' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {isLoadingContent ? (
          <View style={styles.loadingContentContainer}>
            <ActivityIndicator size="large" color="#58e2bd" />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        ) : (
          <View style={styles.tabContent}>
            {activeTab === 'videos' ? (
              videos.length > 0 ? (
                <FlatList
                  data={videos}
                  renderItem={renderVideoItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  numColumns={2}
                  columnWrapperStyle={{ justifyContent: 'space-between' }}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              ) : renderEmptyContent()
            ) : (
              microCourses.length > 0 ? (
                <FlatList
                  data={microCourses}
                  renderItem={renderMicroCourseItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                />
              ) : renderEmptyContent()
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Knowble App v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  loadingContentContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 30, // Increased from 10 to 30
    paddingBottom: 40, // Increased from 20 to 40
    paddingHorizontal: 10,
    backgroundColor: '#202020',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
  },
  profileImageContainer: {
    marginRight: 18,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  profileImagePlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  bio: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 6,
  },
  noBio: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#58e2bd',
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '50%',
    backgroundColor: '#58e2bd',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabContent: {
    paddingTop: 20,
    paddingHorizontal: 12,
    backgroundColor: '#121212',
    minHeight: 280,
  },
  videoCard: {
    backgroundColor: '#202020',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#333',
    height: 280,
    width: '48%',
  },
  thumbnailContainer: {
    position: 'relative',
    backgroundColor: '#101010',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#101010',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#101010',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewsTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  viewsText: {
    color: 'white',
    fontSize: 12,
  },
  durationTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: 'white',
    fontSize: 12,
  },
  videoInfo: {
    padding: 12,
    backgroundColor: '#161616',
    flex: 1,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  videoStats: {
    color: '#aaa',
    fontSize: 12,
  },
  courseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  courseDescription: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 10,
  },
  courseStats: {
    color: '#aaa',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  editProfileButton: {
    color: '#58e2bd',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editProfileContainer: {
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});

export default ProfileScreen;