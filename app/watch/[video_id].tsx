import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions, Alert, Animated, FlatList, ScrollView} from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAuth } from '../(auth)/AuthContext';
import { API_BASE_URL } from '../(auth)/api';  // Assuming API_BASE_URL is imported from api
import { useFocusEffect } from '@react-navigation/native';

const ACCENT_COLOR = '#FFFFFF';
const ACCENT_BG_SUBTLE = 'rgba(255, 255, 255, 0.08)';
const ACCENT_BORDER_SUBTLE = 'rgba(255, 255, 255, 0.22)';

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
    profile_picture_url: string | null;
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
    creator: { id: '101', username: 'ReactNative', profile_picture_url: null },
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
    creator: { id: '102', username: 'TSGuru', profile_picture_url: null },
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

// Expandable description sheet component (YouTube-like)
const DescriptionSheet = ({ 
  visible, 
  onClose, 
  video, 
  screenHeight 
}: { 
  visible: boolean; 
  onClose: () => void; 
  video: VideoData; 
  screenHeight: number; 
}) => {
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.floor(screenHeight * 0.75);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  // Animate sheet in/out
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, sheetHeight, translateY]);

  // Handle touch gestures for drag-to-dismiss
  const handleTouchStart = (event: any) => {
    dragStartY.current = event.nativeEvent.pageY;
    isDragging.current = true;
  };

  const handleTouchMove = (event: any) => {
    if (!isDragging.current) return;
    
    const currentY = event.nativeEvent.pageY;
    const deltaY = Math.max(0, currentY - dragStartY.current);
    translateY.setValue(deltaY);
  };

  const handleTouchEnd = (event: any) => {
    if (!isDragging.current) return;
    
    const currentY = event.nativeEvent.pageY;
    const deltaY = Math.max(0, currentY - dragStartY.current);
    const shouldClose = deltaY > sheetHeight * 0.3;
    
    isDragging.current = false;
    
    if (shouldClose) {
      Animated.timing(translateY, {
        toValue: sheetHeight,
        duration: 200,
        useNativeDriver: true,
      }).start(onClose);
    } else {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  const formatViewCount = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.descriptionSheet,
          {
            height: sheetHeight,
            transform: [{ translateY }],
            paddingBottom: Math.max(20, insets.bottom),
          },
        ]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
        
        {/* Drag handle */}
        <View style={styles.sheetDragHandle} />

        {/* Content */}
        <ScrollView
          style={styles.sheetScrollView}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.sheetCloseButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" style={styles.highContrastIcon} />
          </TouchableOpacity>

          {/* Video title */}
          <Text style={[styles.sheetTitle, styles.highContrastText]}>
            {video.title}
          </Text>

          {/* Video stats */}
          <View style={styles.sheetStats}>
            <Text style={[styles.sheetStatsText, styles.highContrastText]}>
              {formatViewCount(video.views || 0)}
            </Text>
            <Text style={[styles.sheetStatsText, styles.highContrastText]}>
              {video.created_at ? formatDate(video.created_at) : ''}
            </Text>
          </View>

          {/* Channel info */}
          <TouchableOpacity style={styles.sheetChannelInfo}>
            {video.creator.profile_picture_url ? (
              <Image 
                source={{ uri: video.creator.profile_picture_url }} 
                style={styles.sheetChannelAvatar} 
              />
            ) : (
              <View style={styles.sheetAvatarPlaceholder}>
                <Text style={styles.sheetAvatarInitial}>
                  {video.creator.username ? video.creator.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.sheetChannelText}>
              <Text style={[styles.sheetChannelName, styles.highContrastText]}>
                {video.channel.name}
              </Text>
              <Text style={[styles.sheetChannelSubs, styles.highContrastText]}>
                {video.channel.subscribers_count 
                  ? `${video.channel.subscribers_count.toLocaleString()} subscribers`
                  : 'No subscribers yet'
                }
              </Text>
            </View>
          </TouchableOpacity>

          {/* Description */}
          {video.description && (
            <View style={styles.sheetDescriptionContainer}>
              <Text style={[styles.sheetDescriptionText, styles.highContrastText]}>
                {video.description}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
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
  const [isSubscribing, setIsSubscribing] = useState(false);
  // Animation for like button
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const [viewCount, setViewCount] = useState(video.views || 0);
  const [hasViewCounted, setHasViewCounted] = useState(false);
  const [isDescriptionSheetOpen, setIsDescriptionSheetOpen] = useState(false);
  
  // Video progress state for slider
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const [durationState, setDurationState] = useState(0);

  // Transient controls state
  const [controlsVisible, setControlsVisible] = useState(true);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewCountTimerRef = useRef<number | null>(null);
  
  // Use the exact same height as FlatList page size to avoid peeking/overlap
  const screenHeight = Dimensions.get('window').height;

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

  // expo-video player
  const player = useVideoPlayer(videoUrl, player => {
    player.loop = true;
    player.muted = isMuted;
  });

  // Get current time (seconds) from player events
  const [currentTime, setCurrentTime] = useState(0);
  
  // Listen to time updates and sync slider when not scrubbing
  useEventListener(player, 'timeUpdate', (payload) => {
    if (!isScrubbing && payload && typeof payload.currentTime === 'number') {
      setCurrentTime(payload.currentTime || 0);
    }
  });
  
  // Listen for duration change
  useEventListener(player, 'sourceLoad', (payload) => {
    if (payload.duration) {
      setDurationState(payload.duration);
    }
  });
  
  // Get duration from player directly or from state
  const duration = player.duration || durationState;
  
  // Reflect player events to local state
  const { isPlaying: playerIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });

  // Keep local isPlaying in sync
  useEffect(() => {
    setIsPlaying(!!playerIsPlaying);
  }, [playerIsPlaying]);

  // No need for the slider update effect anymore as we handle it in the timeUpdate event

  // Pause video when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setIsPlaying(false);
        try { player.pause(); } catch {}
        // Clear view count timer
        if (viewCountTimerRef.current) {
          clearTimeout(viewCountTimerRef.current);
          viewCountTimerRef.current = null;
        }
      };
    }, [player])
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

  // Format time for display (expects seconds)
  const formatTime = (timeInSeconds: number) => {
    if (!isNaN(timeInSeconds) && timeInSeconds > 0) {
      const totalSeconds = Math.floor(timeInSeconds);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '00:00';
  };

  // Handle slider value change during scrubbing (seconds)
  const handleSliderChange = (value: number | number[]) => {
    const newValue = Array.isArray(value) ? value[0] : value;
    setScrubTime(newValue);
    setCurrentTime(newValue); // Preview current time while dragging
  };

  // Handle seeking when user starts sliding
  const handleSlidingStart = () => {
    setIsScrubbing(true);
    setScrubTime(currentTime);
    showControlsTemporarily(5000); // Keep controls visible longer while scrubbing
  };

  // Handle seeking when user finishes sliding (seconds)
  const handleSlidingComplete = (value: number | number[]) => {
    const seekTime = Array.isArray(value) ? value[0] : value;
    const clamped = Math.max(0, Math.min(seekTime, duration || 0));
    
    try {
      if (duration && clamped <= duration) {
        setCurrentTime(clamped);
        player.currentTime = clamped;
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
    
    setIsScrubbing(false);
    setScrubTime(null);
    showControlsTemporarily();
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
  }, [video.channel.is_subscribed]);

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
      setCurrentTime(0);
      setScrubTime(null);
      setTimeout(() => {
        try { player.play(); } catch {}
      }, 100);
      showControlsTemporarily();
    } else {
      setIsPlaying(false);
      try { player.pause(); } catch {}
    }
  }, [isActive, showControlsTemporarily, player]);

  // Native controls show progress, no extra animation needed

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
    try { player.pause(); } catch {}
    router.push(`/channels/${video.channel.id}`);
  };

  // Keep mute in sync
  useEffect(() => {
    try { player.muted = isMuted; } catch {}
  }, [player, isMuted]);

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
      const response = await toggleSubscription(video.channel.id, token);
      if (response && response.is_subscribed !== undefined) {
        setIsSubscribed(response.is_subscribed);
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
      setIsSubscribed(!isSubscribed);
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const formatLikeCount = (likes: number) => {
    if (likes >= 1000000) return `${(likes / 1000000).toFixed(1)}M`;
    if (likes >= 1000) return `${(likes / 1000).toFixed(1)}K`;
    return likes.toString();
  };

  const handleChatWithNaidu = () => {
    router.push({
      pathname: '/chat' as any,
      params: { video_id: String(video.id) },
    });
  };

  return (
    <View style={[styles.videoContainer, { height: screenHeight }]}> 
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
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
            <Ionicons name="arrow-back" size={28} color="white" style={styles.highContrastIcon} />
          </TouchableOpacity>
          <View style={styles.spacer} />
          <TouchableOpacity 
            onPress={() => { 
              const newMutedState = !isMuted;
              setIsMuted(newMutedState);
              try { player.muted = newMutedState; } catch (e) { console.error(e); }
              showControlsTemporarily(); 
            }} 
            style={styles.iconButton}
          >
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={28} color="white" style={styles.highContrastIcon} />
          </TouchableOpacity>
        </View>

        {/* Center play/pause button */}
        <View style={styles.centerControls}>
          <TouchableOpacity
            onPress={() => {
              const newPlayingState = !isPlaying;
              setIsPlaying(newPlayingState);
              if (newPlayingState) {
                try { player.play(); } catch (e) { console.error(e); }
              } else {
                try { player.pause(); } catch (e) { console.error(e); }
              }
              showControlsTemporarily();
            }}
            style={styles.playPauseButton}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#121212" />
          </TouchableOpacity>
        </View>

        {/* Bottom content overlay */}
        <BlurView intensity={22} tint="dark" style={[styles.bottomOverlay, { paddingBottom: (insets.bottom || 0) + 10 }]}>
          {/* Custom Progress Slider */}
          <View style={styles.progressContainer}>
            <Slider
              containerStyle={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(1, duration || 1)}
              value={isScrubbing && scrubTime !== null ? scrubTime : currentTime}
              onValueChange={handleSliderChange}
              onSlidingStart={handleSlidingStart}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
              thumbTouchSize={{ width: 40, height: 40 }}
              animateTransitions
              renderThumbComponent={() => (
                <View style={styles.customThumb} />
              )}
            />
            <Text style={[styles.timeText, styles.highContrastText]}>
              {formatTime(isScrubbing && scrubTime !== null ? scrubTime : currentTime)}
            </Text>
          </View>
          {/* Channel info */}
          <TouchableOpacity 
            style={styles.channelInfo}
            onPress={handleOpenChannel}
            activeOpacity={0.7}
          >
            {video.creator.profile_picture_url ? (
              <Image 
                source={{ uri: video.creator.profile_picture_url }} 
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
              <Text style={[styles.channelName, styles.highContrastText]}>{video.channel.name}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.subscribeButton, isSubscribed && styles.unsubscribeButton]}
              onPress={handleSubscribe}
              disabled={isSubscribing}
            >
              {isSubscribing ? (
              <ActivityIndicator size="small" color={isSubscribed ? ACCENT_COLOR : '#000'} />
              ) : (
                <Text style={[styles.subscribeText, isSubscribed && styles.unsubscribeText]}>
                  {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Video title (tap to open details) */}
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setIsDescriptionSheetOpen(true)}
          >
            <Text style={[styles.videoTitle, styles.highContrastText]} numberOfLines={2}>
              {video.title}
            </Text>
          </TouchableOpacity>

          {/* Action bar pinned to bottom edge */}
          <View style={styles.actionBar}>
            <View style={styles.actionsLeft}>
              <TouchableOpacity style={styles.actionButton} onPress={handleLike} disabled={isLiking}>
              {isLiking ? (
                <ActivityIndicator size="small" color={ACCENT_COLOR} />
              ) : (
                <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                  <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? ACCENT_COLOR : 'white'} style={styles.highContrastIcon} />
                </Animated.View>
              )}
              <Text style={[styles.actionText, styles.highContrastText, isLiked && styles.likedText]}>
                {formatLikeCount(likeCount)}
              </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
              <ActivityIndicator size="small" color={ACCENT_COLOR} />
              ) : (
                <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? ACCENT_COLOR : 'white'} style={styles.highContrastIcon} />
              )}
              <Text style={[styles.actionText, styles.highContrastText, isSaved && styles.savedText]}>Save</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => onComment(video.id)}>
              <Ionicons name="chatbubble-outline" size={22} color="white" style={styles.highContrastIcon} />
              <Text style={[styles.actionText, styles.highContrastText]}>{video.comment_count || 0}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-social-outline" size={22} color="white" style={styles.highContrastIcon} />
              <Text style={[styles.actionText, styles.highContrastText]}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.naiduButton} onPress={handleChatWithNaidu}>
              <Ionicons name="hardware-chip" size={22} color={ACCENT_COLOR} style={styles.highContrastIcon} />
              <Text style={[styles.naiduText, styles.highContrastText]}>NAIDU</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* Description Sheet */}
      <DescriptionSheet
        visible={isDescriptionSheetOpen}
        onClose={() => setIsDescriptionSheetOpen(false)}
        video={video}
        screenHeight={screenHeight}
      />
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
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
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
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#000000',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingBottom: 10,
    width: '100%',
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
  slider: {
    flex: 1,
    marginHorizontal: 10,
    height: 20,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 1.5,
  },
  sliderThumb: {
    backgroundColor: 'transparent', // Make invisible since we use customThumb
    width: 1,
    height: 1,
  },
  customThumb: {
    width: 14, // Slightly larger for better visibility
    height: 14,
    borderRadius: 7,
    backgroundColor: ACCENT_COLOR,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3, // For Android shadow
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
    // Ensure top controls sit above bottom overlay for proper touch handling
    zIndex: 20,
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
    // Elevate play/pause button above overlays
    zIndex: 20,
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
    justifyContent: 'center',
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
  },
  viewCount: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subscribeText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  unsubscribeButton: {
    backgroundColor: '#333',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  unsubscribeText: {
    color: '#FFFFFF',
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: 'white',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  // High-contrast styling to keep white readable over bright footage
  highContrastText: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  highContrastIcon: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  naiduButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT_BG_SUBTLE,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT_BORDER_SUBTLE,
  },
  naiduText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  likedText: {
    color: '#FFFFFF',
  },
  savedText: {
    color: '#FFFFFF',
  },
  tapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  flatListContent: {
    flexGrow: 1,
  },
  // Description Sheet Styles
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  descriptionSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    zIndex: 101,
  },
  sheetDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sheetCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sheetTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  sheetStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetStatsText: {
    color: '#ccc',
    fontSize: 14,
    marginRight: 12,
  },
  sheetChannelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  sheetChannelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sheetAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetAvatarInitial: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sheetChannelText: {
    flex: 1,
    marginLeft: 12,
  },
  sheetChannelName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sheetChannelSubs: {
    color: '#aaa',
    fontSize: 14,
  },
  sheetDescriptionContainer: {
    marginBottom: 20,
  },
  sheetDescriptionText: {
    color: '#eee',
    fontSize: 15,
    lineHeight: 22,
  },
});
