import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { searchContent } from '../../(auth)/api';

// Define types for API responses
interface Creator {
  id: string | number;
  username: string;
  profile_picture: string | null;
}

interface Channel {
  id: string | number;
  name: string;
  description: string;
  avatar: string | null;
  subscribers_count: number;
  is_verified: boolean;
  total_views?: number;
  video_count?: number;
  creator?: Creator;
}

interface Video {
  id: string | number;
  title: string;
  description: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
  channel: Channel;
  creator: Creator;
}

interface MicroCourse {
  id: string | number;
  name: string;
  description: string;
  channel: Channel;
  total_views?: number;
  video_count?: number;
  created_at: string;
}

interface SearchResults {
  videos: Video[];
  channels: Channel[];
  micro_courses: MicroCourse[];
  counts: {
    videos?: number;
    channels?: number;
    micro_courses?: number;
  };
}

// Tab type
type TabType = 'videos' | 'channels' | 'micro_courses';

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({
    videos: [],
    channels: [],
    micro_courses: [],
    counts: {}
  });
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 10; // Number of items per page

  // Function to handle search
  const handleSearch = async (resetOffset = true) => {
    if (!searchQuery.trim()) return;
    
    if (resetOffset) {
      setOffset(0);
      setResults({
        videos: [],
        channels: [],
        micro_courses: [],
        counts: {}
      });
    }
    
    setIsSearching(true);
    setError(null);
    
    try {
      const searchResults = await searchContent(
        searchQuery,
        'all', // Fetch all content types at once
        limit,
        resetOffset ? 0 : offset
      );
      
      // If loading more, append to existing results
      if (!resetOffset && offset > 0) {
        setResults(prev => ({
          videos: [...prev.videos, ...searchResults.videos],
          channels: [...prev.channels, ...searchResults.channels],
          micro_courses: [...prev.micro_courses, ...searchResults.micro_courses],
          counts: searchResults.counts
        }));
      } else {
        // Otherwise replace results
        setResults(searchResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  // Load more results when reaching the end of the list
  const handleLoadMore = () => {
    const currentCount = getCurrentTabResults().length;
    const totalCount = getCurrentTabCount();
    
    if (currentCount < totalCount && !isLoadingMore && !isSearching) {
      setIsLoadingMore(true);
      setOffset(offset + limit);
      handleSearch(false);
    }
  };

  // Get results for current tab
  const getCurrentTabResults = () => {
    switch (activeTab) {
      case 'videos':
        return results.videos;
      case 'channels':
        return results.channels;
      case 'micro_courses':
        return results.micro_courses;
      default:
        return results.videos;
    }
  };


  // Get count for current tab
  const getCurrentTabCount = () => {
    switch (activeTab) {
      case 'videos':
        return results.counts.videos || 0;
      case 'channels':
        return results.counts.channels || 0;
      case 'micro_courses':
        return results.counts.micro_courses || 0;
      default:
        return results.counts.videos || 0;
    }
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // No need to refetch data, just filter existing results
  };

  // Format view count with K, M, etc.
  const formatViewCount = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    } else {
      return views.toString();
    }
  };

  // Format timestamp to relative time (e.g., "2 days ago")
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000; // seconds in a year
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    
    interval = seconds / 2592000; // seconds in a month
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    
    interval = seconds / 86400; // seconds in a day
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    
    interval = seconds / 3600; // seconds in an hour
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    
    interval = seconds / 60; // seconds in a minute
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    
    return `${Math.floor(seconds)} seconds ago`;
  };

  // Render a video card
  const renderVideoCard = (item: Video, index: number) => {
    // Get the thumbnail URL - try thumbnail_url first, then thumbnail
    const thumbnailUrl = item.thumbnail_url || item.thumbnail;

    const handleVideoPress = () => {
      router.push({
        pathname: `/watch/${item.id}` as any,
        params: {
          videos: JSON.stringify(results.videos),
          currentIndex: index.toString()
        }
      });
    };

    return (
      <TouchableOpacity style={styles.videoCard} onPress={handleVideoPress}>
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="play-circle" size={50} color="#58e2bd" />
              <Text style={styles.placeholderText}>{item.title.substring(0, 20)}{item.title.length > 20 ? '...' : ''}</Text>
            </View>
          )}
          <View style={styles.viewsTag}>
            <Text style={styles.viewsText}>{formatViewCount(item.views || 0)} views</Text>
          </View>
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.channelInfo}>
            {item.creator.profile_picture ? (
              <Image
                source={{ uri: item.creator.profile_picture }}
                style={styles.channelAvatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{item.creator.username ? item.creator.username.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.channelName}>{item.channel.name}</Text>
              <Text style={styles.videoMeta}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a channel card
  const renderChannelCard = (item: Channel) => {
    const handleChannelPress = () => {
      router.push(`/channels/${item.id}` as any);
    };

    return (
      <TouchableOpacity style={styles.channelCard} onPress={handleChannelPress}>
        <View style={styles.channelCardContent}>
          {item.avatar ? (
            <Image
              source={{ uri: item.avatar }}
              style={styles.channelCardAvatar}
            />
          ) : (
            <View style={styles.channelAvatarPlaceholder}>
              <Text style={styles.channelAvatarInitial}>{item.name ? item.name.charAt(0).toUpperCase() : 'C'}</Text>
            </View>
          )}

          <View style={styles.channelCardInfo}>
            <View style={styles.channelCardHeader}>
              <Text style={styles.channelCardName}>{item.name}</Text>
              {item.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color="#58e2bd" style={styles.verifiedIcon} />
              )}
            </View>

            <Text style={styles.channelCardStats}>
              {formatViewCount(item.total_views || 0)} views • {item.video_count || 0} videos • {formatViewCount(item.subscribers_count)} subscribers
            </Text>

            <Text style={styles.channelCardDescription} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a microcourse card
  const renderMicroCourseCard = (item: MicroCourse) => {
    const handleMicroCoursePress = () => {
      router.push(`/microcourses/${item.id}` as any);
    };

    return (
      <TouchableOpacity style={styles.microCourseCard} onPress={handleMicroCoursePress}>
        <View style={styles.microCourseCardContent}>
          <View style={styles.microCourseIconContainer}>
            <Ionicons name="school" size={32} color="#58e2bd" />
          </View>

          <View style={styles.microCourseCardInfo}>
            <Text style={styles.microCourseCardName}>{item.name}</Text>

            <Text style={styles.microCourseCardStats}>
              {formatViewCount(item.total_views || 0)} views • {item.video_count || 0} videos
            </Text>

            <Text style={styles.microCourseCardDescription} numberOfLines={2}>
              {item.description || 'No description available'}
            </Text>

            <Text style={styles.microCourseCardChannel}>
              {item.channel.name}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render an item based on its type
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if ('title' in item && 'channel' in item) {
      return renderVideoCard(item as Video, index);
    } else if ('subscribers_count' in item) {
      return renderChannelCard(item as Channel);
    } else if ('name' in item && 'channel' in item) {
      return renderMicroCourseCard(item as MicroCourse);
    }
    return null;
  };

  // Generate unique key for each item based on its type
  const getItemKey = (item: any, index: number) => {
    if ('title' in item && 'channel' in item) {
      return `video-${item.id}`;
    } else if ('subscribers_count' in item) {
      return `channel-${item.id}`;
    } else if ('name' in item && 'channel' in item) {
      return `microcourse-${item.id}`;
    }
    return `unknown-${index}`;
  };

  // Render the empty state
  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#58e2bd" />
          <Text style={styles.emptyStateText}>Searching...</Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#333" />
          <Text style={styles.emptyStateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => handleSearch(true)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (searchQuery.trim() === '') {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={64} color="#333" />
          <Text style={styles.emptyStateText}>Search for videos, courses, or channels</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={64} color="#333" />
        <Text style={styles.emptyStateText}>No results found for &quot;{searchQuery}&quot;</Text>
      </View>
    );
  };

  // Render the footer for loading more results
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#58e2bd" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos, courses, channels..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => handleSearch(true)}
          returnKeyType="search"
        />
        
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={() => handleSearch(true)}
          disabled={!searchQuery.trim()}
        >
          <Ionicons 
            name="search" 
            size={24} 
            color={searchQuery.trim() ? "#58e2bd" : "#777"} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      {searchQuery.trim() !== '' && !isSearching && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => handleTabChange('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Videos ({results.counts.videos || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'channels' && styles.activeTab]}
            onPress={() => handleTabChange('channels')}
          >
            <Text style={[styles.tabText, activeTab === 'channels' && styles.activeTabText]}>
              Channels ({results.counts.channels || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'micro_courses' && styles.activeTab]}
            onPress={() => handleTabChange('micro_courses')}
          >
            <Text style={[styles.tabText, activeTab === 'micro_courses' && styles.activeTabText]}>
              Courses ({results.counts.micro_courses || 0})
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Results */}
      <FlatList
        data={getCurrentTabResults()}
        renderItem={renderItem}
        keyExtractor={getItemKey}
        contentContainerStyle={styles.resultsList}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        key={activeTab} // Force re-render when switching between layouts
        numColumns={activeTab === 'videos' ? 2 : 1}
        columnWrapperStyle={activeTab === 'videos' ? styles.columnWrapper : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#202020',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#202020',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#58e2bd',
  },
  tabText: {
    color: '#aaa',
    fontSize: 14,
  },
  activeTabText: {
    color: '#58e2bd',
    fontWeight: '500',
  },
  resultsList: {
    flexGrow: 1,
    paddingHorizontal: 8,
  },
  horizontalResultsList: {
    paddingHorizontal: 8,
  },
  // Video card styles
  videoCard: {
    backgroundColor: '#202020',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 300, // Fixed height for grid layout
    width: '48%', // Take up almost half the screen width for 2-column layout
  },
  thumbnailContainer: {
    position: 'relative',
    backgroundColor: '#101010',
    height: 220, // Adjusted height for grid layout
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
  placeholderText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
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
  // Channel card styles
  channelCard: {
    backgroundColor: '#202020',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  channelCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  channelAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  channelAvatarInitial: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  channelCardInfo: {
    flex: 1,
  },
  channelCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  channelCardName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  channelCardStats: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
  },
  channelCardDescription: {
    color: '#ddd',
    fontSize: 14,
  },
  // Horizontal channel card styles
  channelCardHorizontal: {
    backgroundColor: '#202020',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
    width: 140,
    alignItems: 'center',
  },
  channelCardContentHorizontal: {
    alignItems: 'center',
  },
  channelCardAvatarHorizontal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  channelAvatarPlaceholderHorizontal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  channelAvatarInitialHorizontal: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  channelCardInfoHorizontal: {
    alignItems: 'center',
    width: '100%',
  },
  channelCardHeaderHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  channelCardNameHorizontal: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  verifiedIconHorizontal: {
    marginLeft: 4,
  },
  channelCardStatsHorizontal: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
  },
  // Microcourse card styles
  microCourseCard: {
    backgroundColor: '#202020',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  microCourseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  microCourseIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  microCourseCardInfo: {
    flex: 1,
  },
  microCourseCardName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
  },
  microCourseCardStats: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 6,
  },
  microCourseCardDescription: {
    color: '#ddd',
    fontSize: 14,
    marginBottom: 4,
  },
  microCourseCardChannel: {
    color: '#58e2bd',
    fontSize: 12,
    fontWeight: '500',
  },
  // Horizontal microcourse card styles
  microCourseCardHorizontal: {
    backgroundColor: '#202020',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
    width: 140,
    alignItems: 'center',
  },
  microCourseCardContentHorizontal: {
    alignItems: 'center',
  },
  microCourseIconContainerHorizontal: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  microCourseCardInfoHorizontal: {
    alignItems: 'center',
    width: '100%',
  },
  microCourseCardNameHorizontal: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  microCourseCardStatsHorizontal: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  microCourseCardChannelHorizontal: {
    color: '#58e2bd',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
    paddingTop: 60,
  },
  emptyStateText: {
    color: '#aaa',
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
  // Footer loader styles
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    color: '#aaa',
    marginLeft: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});