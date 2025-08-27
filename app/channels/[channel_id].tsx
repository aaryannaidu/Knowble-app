import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Platform,
  StatusBar as RNStatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../(auth)/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../(auth)/api';

// Define interfaces for our data types
interface Video {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  views: number;
  duration: string;
  created_at: string;
  likes_count: number;
  channel?: { id: string | number; name: string; avatar: string | null };
  creator?: { id: string | number; username: string; profile_picture: string | null };
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

const ChannelDetailScreen = () => {
  const { channel_id } = useLocalSearchParams();
  const { user, token } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [microCourses, setMicroCourses] = useState<MicroCourse[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const checkSubscriptionStatus = useCallback(async (channelId: number) => {
    if (!user || !token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isSub = response.data.some((sub: any) => sub.channel === channelId);
      setIsSubscribed(isSub);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  }, [token, user]);

  const fetchChannelContent = useCallback(async (channelId: number) => {
    if (!channelId || !token) return;
    setIsLoadingContent(true);
    try {
      const videosResponse = await axios.get(`${API_BASE_URL}/channels/${channelId}/videos/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVideos(videosResponse.data);
      const coursesResponse = await axios.get(`${API_BASE_URL}/channels/${channelId}/micro_courses/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMicroCourses(coursesResponse.data);
    } catch (error) {
      console.error('Error fetching channel content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  }, [token]);

  const fetchChannelData = useCallback(async () => {
    if (!channel_id || !token) return;
    setIsLoading(true);
    try {
      const channelResponse = await axios.get(`${API_BASE_URL}/channels/${channel_id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChannel(channelResponse.data);
      await fetchChannelContent(channelResponse.data.id);
      if (user) {
        checkSubscriptionStatus(channelResponse.data.id);
      }
    } catch (error) {
      console.error('Error fetching channel data:', error);
      Alert.alert('Error', 'Failed to load channel data');
    } finally {
      setIsLoading(false);
    }
  }, [channel_id, token, user, fetchChannelContent, checkSubscriptionStatus]);

  useEffect(() => {
    if (channel_id) {
      fetchChannelData();
    }
  }, [channel_id, fetchChannelData]);

  const toggleSubscription = async () => {
    if (!user || !token || !channel) return;
    try {
      await axios.post(`${API_BASE_URL}/subscriptions/toggle/`, { channel_id: channel.id }, { headers: { Authorization: `Bearer ${token}` } });
      setIsSubscribed(!isSubscribed);
      setChannel(prev => prev ? { ...prev, subscribers_count: isSubscribed ? prev.subscribers_count - 1 : prev.subscribers_count + 1 } : null);
    } catch (error) {
      console.error('Error toggling subscription:', error);
      Alert.alert('Error', 'Failed to update subscription');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChannelData();
    setRefreshing(false);
  };

  // Grid-style video card with 9:16 thumbnail
  const renderGridVideoCard = ({ item, index }: { item: Video; index: number }) => {
    const thumbnailUrl = item.thumbnail_url || undefined;

    const cardChannel = item.channel || { id: channel?.id || 0, name: channel?.name || 'Channel', avatar: channel?.avatar || null };
    const cardCreator = item.creator || { id: channel?.creator.id || 0, username: channel?.creator.username || 'Creator', profile_picture: channel?.creator.profile_picture || null };

    const handlePress = () => {
      router.push({
        pathname: `/watch/${item.id}` as any,
        params: { videos: JSON.stringify(videos), currentIndex: index.toString() }
      });
    };

  return (
      <TouchableOpacity style={styles.videoCardGrid} onPress={handlePress}>
        <View style={styles.thumbnailContainerGrid}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailGrid} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholderGrid}>
              <Ionicons name="play-circle" size={50} color="#58e2bd" />
              <Text style={styles.placeholderText}>{item.title.substring(0, 20)}{item.title.length > 20 ? '...' : ''}</Text>
            </View>
          )}
          <View style={styles.viewsTag}>
            <Text style={styles.viewsText}>{formatViewCount(item.views || 0)} views</Text>
          </View>
        </View>
        <View style={styles.videoInfoGrid}>
          <View style={styles.videoChannelInfoRow}>
            {cardCreator.profile_picture ? (
              <Image source={{ uri: cardCreator.profile_picture }} style={styles.channelAvatarSmall} />
            ) : (
              <View style={styles.avatarPlaceholderSmall}>
                <Text style={styles.avatarInitialSmall}>{cardCreator.username ? cardCreator.username.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
            <View style={styles.textContainerSmall}>
              <Text style={styles.videoTitleGrid} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.channelNameGrid}>{cardChannel.name}</Text>
              <Text style={styles.videoMetaGrid}>{item.created_at ? formatTimeAgo(item.created_at) : 'Unknown time'}</Text>
            </View>
          </View>
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
      <View style={styles.courseFooter}>
        <Text style={styles.courseStats}>{item.videos.length} videos</Text>
        <Text style={styles.courseDate}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    return `${Math.floor(seconds)} seconds ago`;
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const renderEmptyContent = () => (
    <View style={styles.emptyContainer}>
      {activeTab === 'videos' ? (
        <>
          <Ionicons name="videocam-outline" size={50} color="#58e2bd" />
          <Text style={styles.emptyText}>No videos yet</Text>
          <Text style={styles.emptySubtext}>This channel hasn&apos;t uploaded any videos</Text>
        </>
      ) : (
        <>
          <Ionicons name="library-outline" size={50} color="#58e2bd" />
          <Text style={styles.emptyText}>No micro courses yet</Text>
          <Text style={styles.emptySubtext}>This channel hasn&apos;t created any micro courses</Text>
        </>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58e2bd" />
        <Text style={styles.loadingText}>Loading channel...</Text>
      </View>
    );
  }

  if (!channel) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#ff6b6b" />
        <Text style={styles.errorText}>Channel not found</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Channel Header */}
        <View style={[styles.header, { paddingTop: (Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0) + 8 }] }>
          <View style={styles.channelHeaderContent}>
            {/* Channel Avatar */}
            <View style={styles.avatarContainer}>
              {channel.avatar ? (
                <Image 
                  source={{ uri: channel.avatar }} 
                  style={styles.channelAvatar} 
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>
                    {channel.name ? channel.name.charAt(0).toUpperCase() : 'C'}
                  </Text>
                </View>
              )}
              {channel.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#58e2bd" />
                </View>
              )}
            </View>
            
            {/* Channel Info */}
            <View style={styles.channelInfo}>
              <View style={styles.channelNameRow}>
                <Text style={styles.channelName}>{channel.name}</Text>
                {channel.is_verified && (
                  <Ionicons name="checkmark-circle" size={16} color="#58e2bd" style={styles.verifiedIcon} />
                )}
              </View>
              <Text style={styles.subscriberCount}>
                {channel.subscribers_count} {channel.subscribers_count === 1 ? 'subscriber' : 'subscribers'}
              </Text>
              {channel.description && (
                <Text style={styles.channelDescription} numberOfLines={2}>
                  {channel.description}
                </Text>
              )}
            </View>
          </View>

          {/* Subscribe Button */}
          {user && user.id !== channel.creator.id && (
            <TouchableOpacity 
              style={[styles.subscribeButton, isSubscribed && styles.subscribedButton]}
              onPress={toggleSubscription}
            >
              <Text style={[styles.subscribeButtonText, isSubscribed && styles.subscribedButtonText]}>
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          )}
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
                  key="videos_grid_2cols"
                  data={videos}
                  renderItem={renderGridVideoCard}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  numColumns={2}
                  contentContainerStyle={styles.videoList}
                  columnWrapperStyle={styles.columnWrapper}
                />
              ) : renderEmptyContent()
            ) : (
              microCourses.length > 0 ? (
                <FlatList
                  key="courses_list_1col"
                  data={microCourses}
                  renderItem={renderMicroCourseItem}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={false}
                  nestedScrollEnabled={true}
                  numColumns={1}
                />
              ) : renderEmptyContent()
            )}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Knowble App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  loadingContentContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#202020',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  channelHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  channelAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#58e2bd',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#58e2bd',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 2,
  },
  channelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  channelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 5,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  subscriberCount: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#ddd',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  subscribedButton: {
    backgroundColor: '#333',
  },
  subscribeButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  subscribedButtonText: {
    color: '#fff',
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
    paddingTop: 15,
    paddingHorizontal: 10,
    backgroundColor: '#121212',
    minHeight: 200,
  },
  // Grid styles for videos (match home style)
  videoList: {
    paddingVertical: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  videoCardGrid: {
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
    height: 300,
    width: '48%',
  },
  thumbnailContainerGrid: {
    position: 'relative',
    backgroundColor: '#101010',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbnailGrid: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#101010',
  },
  thumbnailPlaceholderGrid: {
    width: '100%',
    height: '100%',
    backgroundColor: '#101010',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  placeholderText: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
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
  videoInfoGrid: {
    padding: 12,
    backgroundColor: '#161616',
    flex: 1,
  },
  videoChannelInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  channelAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholderSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialSmall: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textContainerSmall: {
    flex: 1,
  },
  videoTitleGrid: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  channelNameGrid: {
    color: '#aaa',
    fontSize: 12,
  },
  videoMetaGrid: {
    color: '#aaa',
    fontSize: 10,
    marginTop: 2,
  },
  // Legacy horizontal list styles kept for micro-courses
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
    lineHeight: 20,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseStats: {
    color: '#aaa',
    fontSize: 12,
  },
  courseDate: {
    color: '#777',
    fontSize: 11,
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
    marginBottom: 5,
  },
  emptySubtext: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});

export default ChannelDetailScreen;