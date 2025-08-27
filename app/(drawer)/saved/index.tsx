import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../(auth)/AuthContext';
import { API_BASE_URL } from '../../(auth)/api';
import VideoCard from '../../components/VideoCard';
// merged Platform, StatusBar import above

interface Video {
  id: string | number;
  title: string;
  thumbnail_url: string | null;
  views: number;
  created_at: string;
  channel?: { id: string | number; name: string; avatar: string | null };
  creator?: { id: string | number; username: string; profile_picture: string | null };
}

interface SavedItem {
  id: string | number;
  video: Video;
}

const SavedScreen = () => {
  const { token } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSaved = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_BASE_URL}/saved-videos/`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Failed to fetch saved videos');
      const data = await response.json();
      setSavedItems(Array.isArray(data) ? data : (data.results || []));
    } catch {
      setSavedItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSaved();
  };

  const renderVideoCard = ({ item }: { item: SavedItem }) => {
    if (!item?.video) return null;
    const v = item.video;
    const onPress = () => router.push(`/watch/${v.id}` as any);
    const channel = v.channel || { name: 'Unknown', id: '0', avatar: null };
    const creator = v.creator && 'profile_picture_url' in v.creator ? v.creator : { username: channel.name, id: '0', profile_picture_url: null } as any;
    return (
      <VideoCard
        id={v.id}
        title={v.title}
        thumbnailUrl={v.thumbnail_url}
        views={v.views}
        createdAt={v.created_at}
        channelName={channel.name}
        creatorUsername={creator.username}
        creatorAvatarUrl={creator.profile_picture_url || undefined}
        onPress={onPress}
        style={{ width: '48%' }}
      />
    );
  };

  // time formatting handled in VideoCard

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="bookmark-outline" size={80} color="#666" />
      <Text style={styles.emptyText}>No saved videos yet</Text>
      <Text style={styles.emptySubText}>Save videos to watch them later</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}> 
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
          <Ionicons name="bookmark" size={22} color="#58e2bd" style={{ marginRight: 1 }} />
          <Text style={styles.headerTitle}>Saved Videos</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#58e2bd" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={savedItems}
          renderItem={renderVideoCard}
          keyExtractor={(it) => it.id.toString()}
          ListEmptyComponent={renderEmpty}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.videoList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#58e2bd"]} tintColor="#58e2bd" />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0) + 30, // Increased from 10 to 30
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#202020',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  videoList: {
    padding: 8,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  // Styles for card content now come from shared VideoCard
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
});

export default SavedScreen;