import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Image, Modal, StyleSheet, Animated } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../(auth)/AuthContext';
import { useState, useEffect, useRef } from 'react';

// Custom Drawer Component
function CustomDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const slideAnim = useRef(new Animated.Value(-280)).current; // Start off-screen to the left

  useEffect(() => {
    if (visible) {
      // Slide in from left
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide out to left
      Animated.timing(slideAnim, {
        toValue: -280,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateToProfile = () => {
    onClose();
    router.push('/(drawer)/profile');
  };

  const navigateToSettings = () => {
    onClose();
    router.push('/(drawer)/settings');
  };

  const navigateToSaved = () => {
    onClose();
    router.push('/(drawer)/saved');
  };

  return (
    <Modal
      visible={visible}
      animationType="none" // We'll handle animation manually
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.drawerContent,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {user?.profile_picture_url || user?.profile_picture ? (
              <Image 
                source={{ uri: (user.profile_picture_url || user.profile_picture || '').replace('http:', 'https:') }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImageText}>
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.username}>{user?.username || 'User'}</Text>
            {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <TouchableOpacity style={styles.menuItem} onPress={navigateToProfile}>
              <Ionicons name="person-outline" size={24} color="#fff" />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={navigateToSettings}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={navigateToSaved}>
              <Ionicons name="bookmark-outline" size={24} color="#fff" />
              <Text style={styles.menuItemText}>Saved</Text>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#ff4757" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
        
        {/* Background overlay - tap to close */}
        <TouchableOpacity 
          style={styles.modalBackground} 
          onPress={onClose}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Function to handle navigation to create video screen
  const navigateToCreateVideo = () => {
    router.push('/create-video' as any);
  };

  // Function to open drawer
  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#58e2bd',
          tabBarInactiveTintColor: '#aaa',
          tabBarStyle: {
            backgroundColor: '#202020',
            borderTopColor: '#333',
          },
          headerStyle: {
            backgroundColor: '#202020',
          },
          headerTintColor: '#fff',
          headerTitle: '', // Hide the screen name in header
          headerLeft: () => (
            <TouchableOpacity 
              onPress={openDrawer}
              style={styles.headerButton}
            >
              {user?.profile_picture_url || user?.profile_picture ? (
                <Image 
                  source={{ uri: (user.profile_picture_url || user.profile_picture || '').replace('http:', 'https:') }} 
                  style={styles.headerProfileImage}
                />
              ) : (
                <View style={styles.headerProfilePlaceholder}>
                  <Text style={styles.headerProfileText}>
                    {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={navigateToCreateVideo}
              style={styles.headerCreateButton}
            >
              <Ionicons name="add" size={20} color="#58e2bd" />
              <Text style={styles.headerCreateText}>Create</Text>
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search/index"
          options={{
            title: 'Search',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="search" size={size} color={color} />
            ),
          }}
        />  
        <Tabs.Screen
          name="categories/index"
          options={{
            title: 'Categories',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="microcourses/index"
          options={{
            title: 'Micro Courses',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="library" size={size} color={color} />
            ),
          }}
        />
      
        <Tabs.Screen
          name="subscriptions/index"
          options={{
            title: 'Subscriptions',
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      
      <CustomDrawer visible={drawerVisible} onClose={closeDrawer} />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    marginLeft: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCreateButton: {
    marginRight: 15,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCreateText: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  headerProfileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  headerProfilePlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 280, // Start after the drawer width
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContent: {
    width: 280,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    height: '100%',
    paddingTop: 20,
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: 'rgba(7, 7, 7, 0.84)',
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignSelf: 'center',
    marginBottom: 15,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImageText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    alignSelf: 'center',
  },
  bio: {
    color: '#aaa',
    fontSize: 14,
    alignSelf: 'center',
  },
  menuItems: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2c2c2c',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  logoutText: {
    color: '#ff4757',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
}); 