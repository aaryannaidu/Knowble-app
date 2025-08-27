import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Animated, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useAuth } from '../(auth)/AuthContext';
import { API_BASE_URL } from '../(auth)/api';  // Assuming API_BASE_URL is imported from api
import { useFocusEffect } from '@react-navigation/native';

// Define the video interface
interface VideoData {
  id: string | number;
  title: string;
  description: string;
  thumbnail: string | null;
  thumbnail_url: string | null;
  video_file: string | null;
  video_file_url: string | null;
  views: number;
  created_at: string;
  like_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  comment_count?: number;
  channel: {
    id: string | number;
    name: string;
    avatar: string | null;
    is_subscribed?: boolean;
    subscribers_count?: number;
  };
  creator: {
    id: string | number;
    username: string;
    profile_picture: string | null;
  };
  transcript?: string | null;
}

// Mock video data for fallback
const MOCK_VIDEOS: VideoData[] = [
  {
    id: '1',
    title: 'Introduction to React Native',
    description: 'Learn about React Native basics in just a minute!',
    thumbnail: null,
    thumbnail_url: null,
    video_file: null,
    video_file_url: 'https://res.cloudinary.com/demo/video/upload/v1689413554/samples/sea-turtle.mp4',
    views: 15000,
    like_count: 1200,
    is_liked: false,
    is_saved: false,
    comment_count: 50,
    created_at: new Date().toISOString(),
    channel: { id: '101', name: 'React Native Channel', avatar: null },
    creator: { id: '101', username: 'ReactNative', profile_picture: null },
  },
  {
    id: '2',
    title: 'Advanced TypeScript',
    description: 'Learn advanced TypeScript concepts for React',
    thumbnail: null,
    thumbnail_url: null,
    video_file: null,
    video_file_url: 'https://res.cloudinary.com/demo/video/upload/v1689413554/samples/elephants.mp4',
    views: 8700,
    like_count: 650,
    is_liked: false,
    is_saved: false,
    comment_count: 32,
    created_at: new Date().toISOString(),
    channel: { id: '102', name: 'TypeScript Guru', avatar: null },
    creator: { id: '102', username: 'TSGuru', profile_picture: null },
  },
];

// Define API functions inline to ensure token is passed correctly

const getVideoDetails = async (videoId: string, token: string | null) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch video details');
  }
  return response.json();
};
// start a timer after the video click to increment the view count after 5 seconds
const incrementViewCount = async (videoId: string, token: string | null) => {
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/increment_view/`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to increment view count');
  }
  return response.json();
};
const getRelatedVideos = async (videoId: string, contextType: string, token: string | null, contextId?: string) => {
  let url = `${API_BASE_URL}/videos/${videoId}/related/?context_type=${contextType}`;
  if (contextId) {
    url += `&context_id=${contextId}`;
  }
  const response = await fetch(url, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch related videos');
  }
  return response.json();
};

const toggleVideoLike = async (videoId: string | number, token: string | null) => {
  if (!token) {
    throw new Error('No authentication token available');
  }
  const response = await fetch(`${API_BASE_URL}/videos/${videoId}/toggle_like/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ like_type: 'like' }),
  });
  if (!response.ok) {
    throw new Error('Failed to toggle like');
  }
  return response.json();
};

const toggleSaveVideo = async (videoId: string | number, token: string | null) => {
  if (!token) {
    throw new Error('No authentication token available');
  }
  const response = await fetch(`${API_BASE_URL}/saved-videos/toggle/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ video_id: videoId }),
  });
  if (!response.ok) {
    throw new Error('Failed to toggle save');
  }
  return response.json();
};

const toggleSubscription = async (channelId: string | number, token: string | null) => {
  if (!token) {
    throw new Error('No authentication token available');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions/toggle/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ channel_id: channelId }),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle subscription');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error toggling subscription:', error);
    throw error;
  }
};

// Individual video player component
const VideoPlayer = ({ video, isActive, onUpdateLike, onUpdateSave, onComment, onUpdateViewCount, user, token }: {
  video: VideoData;
  isActive: boolean;
  onUpdateLike: (videoId: string | number, isLiked: boolean, likeCount: number) => void;
  onUpdateSave: (videoId: string | number, isSaved: boolean) => void;
  onComment: (videoId: string | number) => void;
  onUpdateViewCount: (videoId: string | number, newViewCount: number) => void;
  user: any;
  token: string | null;
}) => {
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(video.is_liked || false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [isSaved, setIsSaved] = useState(video.is_saved || false);
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(video.channel.is_subscribed || false);
  const [subscribersCount, setSubscribersCount] = useState(video.channel.subscribers_count || 0);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [viewCount, setViewCount] = useState(video.views || 0);
  const [hasViewCounted, setHasViewCounted] = useState(false);
  
  // Remember whether the video was playing before the user started scrubbing so we can resume correctly
  const wasPlayingRef = useRef(false);
  
  // Transient controls state
  const [controlsVisible, setControlsVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewCountTimerRef = useRef<number | null>(null);

  const videoRef = useRef<Video>(null);
  const likeAnimation = useRef(new Animated.Value(1)).current;
  
  // Use the exact same height as FlatList page size to avoid peeking/overlap
  const screenHeight = Dimensions.get('window').height;

  // Pause video when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setIsPlaying(false);
        const currentRef = videoRef.current;
        if (currentRef) {
          currentRef.pauseAsync().catch(() => {});
        }
        // Clear view count timer
        if (viewCountTimerRef.current) {
          clearTimeout(viewCountTimerRef.current);
          viewCountTimerRef.current = null;
        }
      };
    }, [])
  );

  // Transient controls helpers
  const hideControls = useCallback(() => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setControlsVisible(false);
    });
  }, [overlayOpacity]);

  // Show controls then auto-hide after a delay
  const showControlsTemporarily = useCallback((timeoutMs: number = 2500) => {
    setControlsVisible(true);
    Animated.timing(overlayOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current as unknown as number);
    controlsTimerRef.current = setTimeout(() => hideControls(), timeoutMs) as unknown as NodeJS.Timeout;
  }, [overlayOpacity, hideControls]);

  const toggleControls = () => {
    if (controlsVisible) {
      hideControls();
    } else {
      showControlsTemporarily();
    }
  };

  // Sync local state with incoming props
  useEffect(() => {
    setIsLiked(video.is_liked || false);
    setLikeCount(video.like_count || 0);
  }, [video.is_liked, video.like_count]);

  useEffect(() => {
    setIsSaved(video.is_saved || false);
  }, [video.is_saved]);

  useEffect(() => {
    setIsSubscribed(video.channel.is_subscribed || false);
    setSubscribersCount(video.channel.subscribers_count || 0);
  }, [video.channel.is_subscribed, video.channel.subscribers_count]);

  // Sync view count and reset view tracking when video changes
  useEffect(() => {
    setViewCount(video.views || 0);
  }, [video.views]);
  useEffect(() => {
    setHasViewCounted(false); // Reset view counting for new video
  }, [video.id]);
  // Auto play/pause based on active state
  useEffect(() => {
    if (isActive) {
      // Reset progress when switching to a new video
      setPlaybackPosition(0);
      setPlaybackDuration(0);
      setTimeout(() => setIsPlaying(true), 100);
      showControlsTemporarily();
    } else {
      setIsPlaying(false);
      const currentRef = videoRef.current;
      if (currentRef) {
        currentRef.pauseAsync();
      }
    }
  }, [isActive, showControlsTemporarily]);

  // Handle view count increment - start timer when video becomes active and is playing
  useEffect(() => {
    // Clear any existing timer first
    if (viewCountTimerRef.current) {
      clearTimeout(viewCountTimerRef.current);
      viewCountTimerRef.current = null;
    }

    // Start timer if video is active, playing, and view hasn't been counted yet
    if (isActive && isPlaying && !hasViewCounted) {
      console.log(`Starting 4-second view count timer for video ${video.id}`);
      viewCountTimerRef.current = setTimeout(async () => {
        try {
          console.log(`Incrementing view count for video ${video.id}`);
          await incrementViewCount(String(video.id), token);
          
          // Update local state
          const newViewCount = viewCount + 1;
          setViewCount(newViewCount);
          setHasViewCounted(true);
          
          // Notify parent component
          onUpdateViewCount(video.id, newViewCount);
          
          console.log(`View count incremented successfully for video ${video.id}. New count: ${newViewCount}`);
        } catch (error) {
          console.error('Error incrementing view count:', error);
          // Still mark as counted to prevent repeated attempts
          setHasViewCounted(true);
        }
      }, 4000); // 4 seconds
    }

    // Cleanup function
    return () => {
      if (viewCountTimerRef.current) {
        clearTimeout(viewCountTimerRef.current);
        viewCountTimerRef.current = null;
      }
    };
  }, [isActive, isPlaying, hasViewCounted, video.id, viewCount, token, onUpdateViewCount]);

  // Navigate to channel and pause video first
  const handleOpenChannel = () => {
    setIsPlaying(false);
    const currentRef = videoRef.current;
    if (currentRef) {
      currentRef.pauseAsync().catch(() => {});
    }
    router.push(`/channels/${video.channel.id}`);
  };

  // Get video URL
  const videoUrl = useMemo(() => {
    let url = video.video_file_url || (video.video_file && typeof video.video_file === 'string' ? video.video_file : null);
    if (url && url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }
    if (!url) {
      url = MOCK_VIDEOS[0].video_file_url || '';
    }
    return url;
  }, [video]);

  const handleLike = async () => {
    if (!user || !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to like videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    if (isLiking) return;
    showControlsTemporarily();
    try {
      setIsLiking(true);
      const newIsLiked = !isLiked;
      const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
      setIsLiked(newIsLiked);
      setLikeCount(Math.max(0, newLikeCount));
      if (newIsLiked) {
        Animated.sequence([
          Animated.timing(likeAnimation, { toValue: 1.3, duration: 150, useNativeDriver: true }),
          Animated.timing(likeAnimation, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
      }
      const response = await toggleVideoLike(video.id, token);
      if (response) {
        if (response.like_count !== undefined) setLikeCount(response.like_count);
        if (response.is_liked !== undefined) setIsLiked(response.is_liked);
        onUpdateLike(video.id, response.is_liked, response.like_count);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : Math.max(0, likeCount - 1));
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!user || !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to save videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    if (isSaving) return;
    showControlsTemporarily();
    try {
      setIsSaving(true);
      const newIsSaved = !isSaved;
      setIsSaved(newIsSaved);
      const response = await toggleSaveVideo(video.id, token);
      if (response && response.is_saved !== undefined) {
        setIsSaved(response.is_saved);
      }
      onUpdateSave(video.id, response.is_saved ?? newIsSaved);
    } catch (error) {
      console.error('Error toggling save:', error);
      setIsSaved(!isSaved);
      Alert.alert('Error', 'Failed to save video. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to subscribe to channels.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    if (isSubscribing) return;
    showControlsTemporarily();
    try {
      setIsSubscribing(true);
      const newIsSubscribed = !isSubscribed;
      setIsSubscribed(newIsSubscribed);
      setSubscribersCount(prev => newIsSubscribed ? prev + 1 : Math.max(0, prev - 1));
      const response = await toggleSubscription(video.channel.id, token);
      if (response && response.is_subscribed !== undefined && response.is_subscribed !== newIsSubscribed) {
        setIsSubscribed(response.is_subscribed);
        setSubscribersCount(prev => response.is_subscribed ? prev + 1 : Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      setIsSubscribed(!isSubscribed);
      setSubscribersCount(prev => isSubscribed ? prev + 1 : Math.max(0, prev - 1));
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const formatLikeCount = (likes: number) => {
    if (likes >= 1000000) return `${(likes / 1000000).toFixed(1)}M`;
    if (likes >= 1000) return `${(likes / 1000).toFixed(1)}K`;
    return likes.toString();
  };

  const formatSubscriberCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleChatWithNaidu = () => {
    router.push({
      pathname: '/chat' as any,
      params: { video_id: String(video.id) },
    });
  };

  return (
    <View style={[styles.videoContainer, { height: screenHeight }]}> 
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: videoUrl }}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay={isPlaying && isActive}
        isMuted={isMuted}
        useNativeControls={false}
        onError={(error) => {
          console.error('Video loading error:', error);
          const currentRef = videoRef.current;
          if (currentRef) {
            currentRef.loadAsync({ uri: videoUrl }, {}, false)
              .catch(reloadError => {
                console.error('Video reload failed:', reloadError);
              });
          }
        }}
        onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            // Update progress only when not scrubbing to avoid jumping
            if (!isScrubbing) {
              const currentPos = status.positionMillis ?? 0;
              const duration = status.durationMillis ?? 0;
              
              // Clamp position to duration to prevent overflow
              const clampedPos = duration > 0 ? Math.min(currentPos, duration) : currentPos;
              
              setPlaybackPosition(clampedPos);
              if (duration > 0) {
                setPlaybackDuration(duration);
              }
            }
          }
        }}
        onLoad={(status) => {
          const currentRef = videoRef.current;
          if (currentRef) {
            currentRef.setStatusAsync({
              shouldPlay: isPlaying && isActive,
              isMuted: isMuted,
              isLooping: true,
            });
            // Initialize with actual video duration if available
            if (status.isLoaded) {
              setPlaybackPosition(0);
              setPlaybackDuration(status.durationMillis ?? 0);
            }
          }
        }}
        positionMillis={isActive ? undefined : 0}
      />

      {/* Tap area: show/hide controls (Twitter/X-like) */}
      <TouchableOpacity 
        style={styles.tapArea}
        onPress={toggleControls}
        activeOpacity={1}
      />

      {/* Overlay controls with fade animation */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
        {/* Top controls */}
        <View style={[styles.topControls, { marginTop: (insets.top || 0) }]}>
          <TouchableOpacity onPress={() => { showControlsTemporarily(); router.back(); }} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.spacer} />
          <TouchableOpacity onPress={() => { setIsMuted(prev => !prev); showControlsTemporarily(); }} style={styles.iconButton}>
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Center play/pause button */}
        <View style={styles.centerControls}>
          <TouchableOpacity
            onPress={() => { setIsPlaying(prev => !prev); showControlsTemporarily(); }}
            style={styles.playPauseButton}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#121212" />
          </TouchableOpacity>
        </View>

        {/* Bottom content overlay */}
        <View style={[styles.bottomOverlay, { paddingBottom: (insets.bottom || 0) - 12}]}>
          {/* Seekable progress bar (Twitter-like) */}
          <View
            style={styles.progressContainer}
            onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              // Pause video and store playing state when scrubbing starts
              wasPlayingRef.current = isPlaying;
              if (isPlaying) {
                setIsPlaying(false);
                videoRef.current?.pauseAsync();
              }

              setIsScrubbing(true);
              const x = e.nativeEvent.locationX;
              if (progressWidth > 0 && playbackDuration > 0) {
                const ratio = Math.max(0, Math.min(1, x / progressWidth));
                const newPos = ratio * playbackDuration;
                setPlaybackPosition(newPos);
              }
            }}
            onResponderMove={(e) => {
              const x = e.nativeEvent.locationX;
              if (progressWidth === 0 || playbackDuration === 0) return;
              const ratio = Math.max(0, Math.min(1, x / progressWidth));
              const newPos = ratio * playbackDuration;
              setPlaybackPosition(newPos);
            }}
            onResponderRelease={(e) => {
              const x = e.nativeEvent.locationX;
              let newPos = playbackPosition;
              if (progressWidth > 0 && playbackDuration > 0) {
                const ratio = Math.max(0, Math.min(1, x / progressWidth));
                newPos = ratio * playbackDuration;
                setPlaybackPosition(newPos);
              }

              // Seek to final position and resume if it was playing
              videoRef.current?.setPositionAsync(newPos, { toleranceMillisBefore: 0, toleranceMillisAfter: 0 })
                .finally(() => {
                  if (wasPlayingRef.current) {
                    videoRef.current?.playAsync();
                    setIsPlaying(true);
                  }
                  setIsScrubbing(false);
                });

              showControlsTemporarily();
            }}
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: playbackDuration > 0 ? `${(playbackPosition / playbackDuration) * 100}%` : '0%' }]} />
            </View>
            <View
              style={[
                styles.progressHandle,
                { left: playbackDuration > 0 ? Math.max(0, Math.min(progressWidth - 8, (playbackPosition / playbackDuration) * progressWidth - 8)) : -8 },
              ]}
            />
          </View>
          {/* Channel info */}
          <TouchableOpacity 
            style={styles.channelInfo}
            onPress={handleOpenChannel}
            activeOpacity={0.7}
          >
            {video.creator.profile_picture ? (
              <Image 
                source={{ uri: video.creator.profile_picture }} 
                style={styles.channelAvatar} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {video.creator.username ? video.creator.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.channelTextContainer}>
              <Text style={styles.channelName}>{video.channel.name}</Text>
              <Text style={styles.viewCount}>
                {formatViewCount(viewCount)} • {formatSubscriberCount(subscribersCount)} subscribers
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.subscribeButton, isSubscribed && styles.unsubscribeButton]}
              onPress={handleSubscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? (
                <ActivityIndicator size="small" color={isSubscribed ? '#58e2bd' : '#000'} />
              ) : (
                <Text style={[styles.subscribeText, isSubscribed && styles.unsubscribeText]}>
                  {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Video title and description */}
          <Text style={styles.videoTitle}>{video.title}</Text>
          {video.description && (
            <Text style={styles.videoDescription} numberOfLines={2}>
              {video.description}
            </Text>
          )}

          {/* Action buttons pinned to bottom edge */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
              {isLiking ? (
                <ActivityIndicator size="small" color="#58e2bd" />
              ) : (
                <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                  <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#58e2bd' : 'white'} />
                </Animated.View>
              )}
              <Text style={[styles.actionText, isLiked && styles.likedText]}>
                {formatLikeCount(likeCount)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#58e2bd" />
              ) : (
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? '#58e2bd' : 'white'} />
              )}
              <Text style={[styles.actionText, isSaved && styles.savedText]}>Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={() => onComment(video.id)}>
              <Ionicons name="chatbubble-outline" size={22} color="white" />
              <Text style={styles.actionText}>{video.comment_count || 0}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-social-outline" size={22} color="white" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.naiduButton} onPress={handleChatWithNaidu}>
              <Ionicons name="hardware-chip" size={22} color="#58e2bd" />
              <Text style={styles.naiduText}>NAIDU</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

export default function WatchScreen() {
  const { video_id, videos: videosParam, currentIndex: currentIndexParam } = useLocalSearchParams();
  const { user, token } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const screenHeight = Dimensions.get('window').height;
  
  // Initialize videos and current index
  useEffect(() => {
    const initializeVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let videosList: VideoData[] = [];
        let initialIndex = 0;
        
        if (videosParam) {
          try {
            videosList = JSON.parse(videosParam as string);
            initialIndex = parseInt(currentIndexParam as string) || 0;
          } catch (parseError) {
            console.error('Error parsing videos param:', parseError);
          }
        }
        
        if (videosList.length === 0) {
          try {
            const relatedVideos = await getRelatedVideos(video_id as string, 'home', token);
            if (relatedVideos && relatedVideos.length > 0) {
              videosList = relatedVideos;
              initialIndex = videosList.findIndex(v => v.id.toString() === video_id);
              if (initialIndex === -1) {
                const currentVideo = await getVideoDetails(video_id as string, token);
                videosList = [currentVideo, ...videosList];
                initialIndex = 0;
              }
            } else {
              const currentVideo = await getVideoDetails(video_id as string, token);
              videosList = [currentVideo];
              initialIndex = 0;
            }
          } catch (apiError) {
            console.error('API fetch failed, using mock data:', apiError);
            videosList = MOCK_VIDEOS;
            initialIndex = 0;
          }
        }
        
        setVideos(videosList);
        setCurrentIndex(initialIndex);
        
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ 
            index: initialIndex, 
            animated: false 
          });
        }, 100);
        
      } catch (error) {
        console.error('Error initializing videos:', error);
        setError('Failed to load videos');
        setVideos(MOCK_VIDEOS);
        setCurrentIndex(0);
      } finally {
        setLoading(false);
      }
    };
    
    initializeVideos();
  }, [video_id, videosParam, currentIndexParam, token]);

  // Refresh current video details
  useEffect(() => {
    const refreshCurrentVideo = async () => {
      try {
        if (!video_id) return;
        const latest = await getVideoDetails(video_id as string, token);
        setVideos(prev => {
          const idx = prev.findIndex(v => v.id.toString() === video_id);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...latest } as any;
          return updated;
        });
      } catch (err) {
        console.error('Error refreshing video details:', err);
      }
    };
    const timeout = setTimeout(refreshCurrentVideo, 300);
    return () => clearTimeout(timeout);
  }, [video_id, token]);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const mostVisibleItem = viewableItems.reduce((prev: any, current: any) => {
        return (current.percent || 0) > (prev.percent || 0) ? current : prev;
      });
      if (mostVisibleItem && mostVisibleItem.index !== currentIndex) {
        setCurrentIndex(mostVisibleItem.index);
      }
    }
  }).current;

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 100,
    waitForInteraction: false,
  };

  const handleUpdateLike = (videoId: string | number, isLiked: boolean, likeCount: number) => {
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return { ...v, is_liked: isLiked, like_count: likeCount };
      }
      return v;
    }));
  };

  const handleUpdateSave = (videoId: string | number, isSaved: boolean) => {
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return { ...v, is_saved: isSaved };
      }
      return v;
    }));
  };

  const handleUpdateViewCount = (videoId: string | number, newViewCount: number) => {
    setVideos(prev => prev.map(v => {
      if (v.id === videoId) {
        return { ...v, views: newViewCount };
      }
      return v;
    }));
  };

  const handleComment = (videoId: string | number) => {
    if (!user && !token) {
      Alert.alert(
        'Authentication Required',
        'Please log in to view and post comments.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/login') }
        ]
      );
      return;
    }
    Alert.alert('Comments', 'Comments feature is coming soon!', [{ text: 'OK' }]);
  };

  const renderVideo = ({ item, index }: { item: VideoData; index: number }) => (
    <VideoPlayer
      video={item}
      isActive={index === currentIndex}
      onUpdateLike={handleUpdateLike}
      onUpdateSave={handleUpdateSave}
      onUpdateViewCount={handleUpdateViewCount}
      onComment={handleComment}
      user={user}
      token={token}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#58e2bd" />
      </View>
    );
  }

  if (error || videos.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>{error || 'No videos found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={(item) => item.id.toString()}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(data, index) => ({ length: screenHeight, offset: screenHeight * index, index })}
        initialScrollIndex={currentIndex}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
        contentContainerStyle={styles.flatListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#58e2bd',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  videoContainer: {
    width: '100%',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  progressContainer: {
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#58e2bd',
  },
  progressHandle: {
    position: 'absolute',
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#58e2bd',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.0)',
    zIndex: 10,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 8,
  },
  spacer: {
    flex: 1,
  },
  centerControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    alignItems: 'center',
  },
  playPauseButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    justifyContent: 'flex-end',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  channelTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  channelName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  viewCount: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: '#58e2bd',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subscribeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  unsubscribeButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#58e2bd',
  },
  unsubscribeText: {
    color: '#58e2bd',
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  videoDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minWidth: 56,
  },
  actionText: {
    color: 'white',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  naiduButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(88, 226, 189, 0.3)',
  },
  naiduText: {
    color: '#58e2bd',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  likedText: {
    color: '#58e2bd',
  },
  savedText: {
    color: '#58e2bd',
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  flatListContent: {
    flexGrow: 1,
  },
});