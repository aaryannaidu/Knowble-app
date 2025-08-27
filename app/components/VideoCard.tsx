import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface VideoCardProps {
  id: string | number;
  title: string;
  thumbnailUrl?: string | null;
  views: number;
  createdAt?: string;
  channelName?: string;
  creatorUsername?: string;
  creatorAvatarUrl?: string | null;
  onPress: () => void;
  style?: ViewStyle;
}

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return '';
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

const VideoCard: React.FC<VideoCardProps> = ({
  title,
  thumbnailUrl,
  views,
  createdAt,
  channelName,
  creatorUsername,
  creatorAvatarUrl,
  onPress,
  style,
}) => {
  return (
    <TouchableOpacity style={[styles.videoCard, style]} onPress={onPress}>
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
            <Text style={styles.placeholderText}>{title.substring(0, 20)}{title.length > 20 ? '...' : ''}</Text>
          </View>
        )}
        <View style={styles.viewsTag}>
          <Text style={styles.viewsText}>{formatViewCount(views)} views</Text>
        </View>
      </View>

      <View style={styles.videoInfo}>
        <View style={styles.channelInfo}>
          {creatorAvatarUrl ? (
            <Image source={{ uri: creatorAvatarUrl }} style={styles.channelAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{(creatorUsername || channelName || 'U').charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.textContainer}>
            <Text style={styles.videoTitle} numberOfLines={2}>{title}</Text>
            {!!channelName && <Text style={styles.channelName}>{channelName}</Text>}
            {!!createdAt && <Text style={styles.videoMeta}>{formatTimeAgo(createdAt)}</Text>}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
    height: 300,
  },
  thumbnailContainer: {
    position: 'relative',
    backgroundColor: '#101010',
    height: 220,
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
    flex: 1,
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
  placeholderText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default VideoCard;


