import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoCard from '../components/VideoCard';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Link, router } from 'expo-router';
import api from '../(auth)/api';

// Define types
interface Video {
  id: string;
  title: string;
  thumbnail_url: string;
  channel: {
    name: string;
    avatar: string;
  };
  views: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

// time formatting handled in VideoCard

export default function CategoryDetailScreen() {
  const { category_id } = useLocalSearchParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryDetails = useCallback(async () => {
    try {
      setLoading(true);
      const categoryResponse = await api.get(`/categories/${category_id}/`);
      setCategory(categoryResponse.data);
      const videosResponse = await api.get(`/categories/${category_id}/videos/`);
      setVideos(videosResponse.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching category details:', err);
      setError('Failed to load category details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [category_id]);

  useEffect(() => {
    fetchCategoryDetails();
  }, [fetchCategoryDetails]);

  // Map category name to an Ionicons name for display
  const getCategoryIcon = (categoryName: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      'Programming': 'code-slash',
      'Design': 'color-palette',
      'Business': 'briefcase',
      'Marketing': 'megaphone',
      'Photography': 'camera',
      'Music': 'musical-notes',
      'Cooking': 'restaurant',
      'Fitness': 'fitness',
      'Physics': 'nuclear-outline',
      'Science': 'flask-outline',
      'Mathematics': 'calculator-outline',
      'Chemistry': 'beaker-outline',
      'Biology': 'leaf-outline',
      // Add more mappings as needed
    };
    
    return iconMap[categoryName] || 'grid-outline';
  };

  const renderVideoCard = ({ item }: { item: Video }) => (
    <Link href={`/watch/${item.id}?category_id=${category_id}`} asChild>
      <VideoCard
        id={item.id}
        title={item.title}
        thumbnailUrl={item.thumbnail_url}
        views={item.views}
        createdAt={item.created_at}
        channelName={item.channel?.name}
        creatorUsername={item.channel?.name}
        creatorAvatarUrl={item.channel?.avatar}
        onPress={() => router.push(`/watch/${item.id}?category_id=${category_id}` as any)}
        style={{ width: '48%' }}
      />
    </Link>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58e2bd" />
          <Text style={styles.loadingText}>Loading category details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !category) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error || 'Category not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchCategoryDetails}>
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
      
      <View style={styles.categoryHeader}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={getCategoryIcon(category.name)} size={24} color="#58e2bd" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.categoryName}>{category.name}</Text>
            <Text style={styles.videoCount}>{videos.length} videos</Text>
          </View>
        </View>
      </View>
      
      {videos.length > 0 ? (
        <FlatList
          data={videos}
          renderItem={renderVideoCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.videoList}
          refreshing={loading}
          onRefresh={fetchCategoryDetails}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={64} color="#444" />
          <Text style={styles.emptyText}>No videos in this category yet</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  categoryHeader: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(88, 226, 189, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  categoryName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  videoCount: {
    color: '#aaa',
    fontSize: 13,
  },
  videoList: {
    padding: 12,
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
  },
  thumbnailContainer: {
    position: 'relative',
    aspectRatio: 16/9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
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
  textContainer: {
    flex: 1,
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  channelName: {
    color: '#aaa',
    fontSize: 14,
  },
  videoMeta: {
    color: '#aaa',
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
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#444',
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
    fontSize: 16,
    marginTop: 12,
  },
}); 