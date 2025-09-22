import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Link, router } from 'expo-router';
import api from '../../(auth)/api';
import { useAuth } from '../../(auth)/AuthContext';
import { Ionicons } from '@expo/vector-icons';
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


export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
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
      console.error('Error refreshing subscriptions:', err);
      setError('Failed to refresh subscriptions. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setRefreshing(false);
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
    <TouchableOpacity
      style={styles.subscriptionCard}
      onPress={() => {
        router.push(`/channels/${item.channel.id}`);
      }}
    >
      <View style={styles.channelContent}>
        {item.channel.creator.profile_picture_url ? (
          <Image
            source={{ uri: item.channel.creator.profile_picture_url }}
            style={styles.channelAvatar}
          />
        ) : (
          <View style={[styles.channelAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0e0e0' }]}>
            <Ionicons name="person" size={32} color="white" />
          </View>
        )}
        <View style={styles.channelDetails}>
          <Text style={styles.channelName}>{item.channel.name}</Text>
          <Text style={styles.subscriberCount}>
            {formatSubscriberCount(item.channel.subscribers_count)} subscribers
          </Text>
        </View>
        <TouchableOpacity
          style={styles.unsubscribeButton}
          onPress={() => handleUnsubscribe(item.channel.id)}
        >
          <Text style={styles.unsubscribeButtonText}>Unsubscribe</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
          refreshing={refreshing}
          onRefresh={handleRefresh}
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
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  channelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subscriberCount: {
    color: '#888',
    fontSize: 13,
  },
  unsubscribeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  unsubscribeButtonText: {
    color: '#ff6b6b',
    fontSize: 11,
    fontWeight: '800',
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