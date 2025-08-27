import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import api from '../../(auth)/api';
import { useAuth } from '../../(auth)/AuthContext';

// Define subscription types
interface Subscription {
  id: string;
  channel: {
    id: string;
    name: string;
    description: string;
    avatar: string | null;
    is_verified: boolean;
    subscribers_count: number;
    creator: {
      id: string;
      username: string;
      profile_picture_url: string | null;
    };
  };
  created_at: string;
}

// Helper function to format subscriber count
const formatSubscriberCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  } else {
    return count.toString();
  }
};

// Helper function to format relative time
const formatRelativeTime = (dateString: string): string => {
  const now = new Date();
  const subDate = new Date(dateString);
  const diffInMs = now.getTime() - subDate.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

  if (diffInDays > 0) {
    return `Subscribed ${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `Subscribed ${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMinutes > 0) {
    return `Subscribed ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just subscribed';
  }
};

export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      // Get all subscriptions for the current user using the new endpoint
      const response = await api.get('/users/subscriptions/');
      
      // Remove any potential duplicates based on channel ID
      const uniqueSubscriptions = response.data.filter(
        (sub: Subscription, index: number, self: Subscription[]) => {
          return sub.channel && sub.channel.id && 
                 self.findIndex(s => s.channel?.id === sub.channel?.id) === index;
        }
      );
      
      setSubscriptions(uniqueSubscriptions);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (channelId: string) => {
    try {
      await api.post('/subscriptions/toggle/', { channel_id: channelId });
      // Remove the subscription from the list with a smooth animation
      setSubscriptions(prev => prev.filter(sub => sub.channel.id !== channelId));
    } catch (err) {
      console.error('Error unsubscribing:', err);
      setError('Failed to unsubscribe. Please try again.');
      // Reset error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderSubscriptionItem = ({ item }: { item: Subscription }) => (
    <View style={styles.subscriptionCard}>
      <View style={styles.channelHeader}>
        <TouchableOpacity 
          style={styles.channelInfo}
          onPress={() => {
            router.push(`/channels/${item.channel.id}`);
          }}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={
                { uri: item.channel.creator.profile_picture_url || 'https://via.placeholder.com/60/58e2bd/000000?text=' + encodeURIComponent(item.channel.name.charAt(0).toUpperCase()) }
              }
              style={styles.channelAvatar}
            />
            {item.channel.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="#000" />
              </View>
            )}
          </View>
          <View style={styles.channelDetails}>
            <Text style={styles.channelName}>{item.channel.name}</Text>
            <Text style={styles.channelCreator}>@{item.channel.creator.username}</Text>
            <Text style={styles.subscriberCount}>
              {formatSubscriberCount(item.channel.subscribers_count)} subscribers
            </Text>
            <Text style={styles.subscriptionDate}>
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={() => handleUnsubscribe(item.channel.id)}
        >
          <Ionicons name="notifications" size={16} color="#58e2bd" />
          <Text style={styles.subscribedText}>Subscribed</Text>
        </TouchableOpacity>
      </View>
      
      {item.channel.description && (
        <Text style={styles.channelDescription} numberOfLines={2}>
          {item.channel.description}
        </Text>
      )}
      
      <View style={styles.channelActions}>
        <TouchableOpacity 
          style={styles.viewChannelButton}
          onPress={() => {
            router.push(`/channels/${item.channel.id}`);
          }}
        >
          <Text style={styles.viewChannelText}>View Channel</Text>
          <Ionicons name="arrow-forward" size={16} color="#58e2bd" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color="#666" />
          <Text style={styles.errorText}>Please log in to view your subscriptions</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#58e2bd" />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSubscriptions}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <Text style={styles.heading}>Subscriptions</Text>
      <Text style={styles.subheading}>Channels you follow</Text>
      
      {subscriptions.length > 0 ? (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscriptionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.subscriptionsList}
          refreshing={loading}
          onRefresh={fetchSubscriptions}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#58e2bd" />
          </View>
          <Text style={styles.emptyText}>No subscriptions yet</Text>
          <Text style={styles.emptySubtext}>Subscribe to channels to see their latest content and updates here</Text>
          <Link href="/(tabs)/home" asChild>
            <TouchableOpacity style={styles.discoverButton}>
              <Ionicons name="search" size={18} color="#121212" style={{ marginRight: 8 }} />
              <Text style={styles.discoverButtonText}>Discover Channels</Text>
            </TouchableOpacity>
          </Link>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  heading: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subheading: {
    color: '#aaa',
    fontSize: 16,
    marginBottom: 24,
  },
  subscriptionsList: {
    paddingBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: '#202020',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(88, 226, 189, 0.1)',
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  channelAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#58e2bd',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#58e2bd',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  channelCreator: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
  },
  subscriberCount: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
  },
  subscriptionDate: {
    color: '#666',
    fontSize: 12,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(88, 226, 189, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#58e2bd',
  },
  subscribedText: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  channelDescription: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  channelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  viewChannelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewChannelText: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
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
  emptyIconContainer: {
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    padding: 20,
    borderRadius: 50,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#aaa',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  discoverButton: {
    backgroundColor: '#58e2bd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#58e2bd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  discoverButtonText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '700',
  },
}); 