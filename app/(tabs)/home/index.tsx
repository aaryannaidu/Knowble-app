import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoCard from '../../components/VideoCard';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../(auth)/api';
import { useAuth } from '../../(auth)/AuthContext';

// Define the video type to match API response
interface Video {
  id: string | number;
  title: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
  channel: {
    id: string | number;
    name: string;
    avatar: string | null;
  };
  creator: {
    id: string | number;
    username: string;
    profile_picture: string | null;
    profile_picture_url: string | null;
  };
}

// Mock data for videos when API returns empty
const MOCK_VIDEOS: Video[] = [
  {
    id: '1',
    title: 'Introduction to React Native',
    thumbnail: null,
    thumbnail_url: null,
    views: 1050,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    channel: {
      id: '1',
      name: 'React Native Channel',
      avatar: null,
    },
    creator: {
      id: '1',
      username: 'ReactNative',
      profile_picture: null,
      profile_picture_url: null,
    },
  },
  {
    id: '2',
    title: 'Building Apps with Expo Router',
    thumbnail: null,
    thumbnail_url: null,
    views: 5200,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    channel: {
      id: '2',
      name: 'Expo Tips',
      avatar: null,
    },
    creator: {
      id: '2',
      username: 'ExpoTips',
      profile_picture: null,
      profile_picture_url: null,
    },
  },
  {
    id: '3',
    title: 'Advanced TypeScript for React',
    thumbnail: null,
    thumbnail_url: null,
    views: 8700,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    channel: {
      id: '3',
      name: 'TypeScript Guru',
      avatar: null,
    },
    creator: {
      id: '3',
      username: 'TSGuru',
      profile_picture: null,
      profile_picture_url: null,
    },
  },
];

export default function HomeScreen() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [apiAccessible, setApiAccessible] = useState<boolean | null>(null);
  const { token } = useAuth();

  // Function to check if the API is accessible
  const checkApiAccessibility = useCallback(async () => {
    try {
      console.log('Checking API accessibility...');
      console.log('API URL:', `${API_BASE_URL}/`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_BASE_URL}/`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API root response:', data);
        setApiAccessible(true);
        return true;
      } else {
        console.log(`API accessibility check failed with status: ${response.status}`);
        setApiAccessible(false);
        return false;
      }
    } catch (error: any) {
      console.error('API accessibility check failed:', error);
      
      if (error.name === 'AbortError') {
        console.log('API request timed out');
        setError('API request timed out. Please check your connection.');
      } else if (error.message === 'Network request failed') {
        console.log('Network request failed - server might be down or unreachable');
        setError('Cannot connect to server. Please check if the server is running.');
      } else {
        setError('Network error occurred');
      }
      
      setApiAccessible(false);
      return false;
    }
  }, [token]);

  // Function to fetch videos from the API
  const fetchVideos = useCallback(async () => {
    try {
      setError(null);
      setUseMockData(false);
      
      // Check if API is accessible first
      const isAccessible = await checkApiAccessibility();
      if (!isAccessible) {
        console.log('API not accessible, using mock data');
        setUseMockData(true);
        setVideos(MOCK_VIDEOS);
        return;
      }
      
      console.log('Fetching videos from:', `${API_BASE_URL}/videos/`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`${API_BASE_URL}/videos/`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response structure:', Object.keys(data));
      
      // Handle different response formats
      let videosData: Video[] = [];
      
      if (Array.isArray(data)) {
        // Direct array of videos
        videosData = data;
        console.log('Response is a direct array of videos');
      } else if (data.results && Array.isArray(data.results)) {
        // DRF paginated response
        videosData = data.results;
        console.log('Response is a paginated list with results array');
      } else if (data.count !== undefined && data.results) {
        // Another form of DRF pagination
        videosData = data.results;
        console.log('Response is a paginated list with count and results');
      } else {
        // Unknown format
        console.error('Unexpected API response format:', data);
        setError('Unexpected API response format');
        setUseMockData(true);
        setVideos(MOCK_VIDEOS);
        return;
      }
      
      console.log(`Found ${videosData.length} videos`);
      if (videosData.length > 0) {
        console.log('First video structure:', Object.keys(videosData[0]));
        console.log('Sample video:', JSON.stringify(videosData[0]).substring(0, 300) + '...');
        setVideos(videosData);
      } else {
        console.log('No videos returned from API, using mock data');
        setUseMockData(true);
        setVideos(MOCK_VIDEOS);
      }
    } catch (error: any) {
      console.error('Error fetching videos:', error);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.message === 'Network request failed') {
        setError('Cannot connect to server. Please check your connection and ensure the server is running.');
      } else {
        setError('Failed to load videos. Please try again later.');
      }
      
      setUseMockData(true);
      setVideos(MOCK_VIDEOS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, checkApiAccessibility]);

  // Fetch videos on component mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchVideos();
  };

  // formatting handled in VideoCard

  const renderVideoCard = ({ item, index }: { item: Video; index: number }) => {
    // Add safety checks for required fields
    if (!item || !item.id || !item.title) {
      console.warn('Invalid video item:', item);
      return null;
    }

    // Ensure channel and creator objects exist
    const channel = item.channel || { name: 'Unknown Channel', id: '0' };
    const creator = item.creator || { username: 'Unknown', id: '0', profile_picture: null, profile_picture_url: null  };
    
    // Get the thumbnail URL - try thumbnail_url first, then thumbnail
    const thumbnailUrl = item.thumbnail_url || item.thumbnail;
    
    const handleVideoPress = () => {
      // Pass the full video list and current index for scroll functionality
      router.push({
        pathname: `/watch/${item.id}` as any,
        params: {
          videos: JSON.stringify(videos),
          currentIndex: index.toString()
        }
      });
    };
    
    return (
      <VideoCard
        id={item.id}
        title={item.title}
        thumbnailUrl={thumbnailUrl}
        views={item.views}
        createdAt={item.created_at}
        channelName={channel.name}
        creatorUsername={creator.username}
        creatorAvatarUrl={creator.profile_picture_url || undefined}
        onPress={handleVideoPress}
        style={{ width: '48%' }}
      />
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      {error ? (
        <>
          <Ionicons name="alert-circle-outline" size={60} color="#58e2bd" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVideos}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : useMockData ? (
        <>
          <Ionicons name="information-circle-outline" size={60} color="#58e2bd" />
          <Text style={styles.emptyText}>Showing demo videos</Text>
          <Text style={styles.emptySubText}>
            {apiAccessible === false 
              ? 'API server is not accessible'
              : 'No videos found in the API'}
          </Text>
          {apiAccessible === false && (
            <TouchableOpacity style={styles.retryButton} onPress={fetchVideos}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <Ionicons name="videocam-outline" size={60} color="#58e2bd" />
          <Text style={styles.emptyText}>No videos found</Text>
        </>
      )}
    </View>
  );

  const navigateToNaidu = () => {
    router.push('/chat' as any);
  };

  // create video handled elsewhere

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* API Status Indicator */}
      {(useMockData || apiAccessible === false) && (
        <View style={styles.statusIndicator}>
          <Ionicons 
            name={apiAccessible === false ? "warning" : "information-circle"} 
            size={16} 
            color="#ff9500" 
          />
          <Text style={styles.statusText}>
            {apiAccessible === false 
              ? "Server offline - showing demo content" 
              : "Demo mode - limited content"}
          </Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#58e2bd" style={styles.loader} />
      ) : (
        <FlatList
          data={videos}
          renderItem={({ item, index }) => renderVideoCard({ item, index })}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.videoList}
          ListEmptyComponent={renderEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#58e2bd"]}
              tintColor="#58e2bd"
            />
          }
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
      
      {/* NAIDU floating button - smaller size */}
      <TouchableOpacity 
        style={styles.floatingNaiduButton}
        onPress={navigateToNaidu}
      >
        <Ionicons name="bulb-outline" size={30} color="#58e2bd" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoList: {
    padding: 8,
    flexGrow: 1,
  },
  videoCard: {
    backgroundColor: '#202020',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#333',
    height: 300, // Reduced height for grid layout
    width: '48%', // Take up almost half the screen width
  },
  thumbnailContainer: {
    position: 'relative',
    backgroundColor: '#101010',
    height: 220, // Reduced height for grid layout
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
    padding: 10,
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
  videoInfo: {
    padding: 12,
    backgroundColor: '#161616',
    flex: 1, // Take remaining space
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  channelAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  videoTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  channelName: {
    color: '#aaa',
    fontSize: 12,
  },
  videoMeta: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2,
  },
  naiduButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#58e2bd',
    zIndex: 10,
  },
  naiduIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  naiduText: {
    color: '#58e2bd',
    marginLeft: 8,
    fontWeight: '600',
  },
  createVideoButton: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#58e2bd',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    zIndex: 10,
  },
  createVideoText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#121212',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  emptySubText: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  floatingNaiduButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderWidth: 1,
    borderColor: '#58e2bd',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
}); 