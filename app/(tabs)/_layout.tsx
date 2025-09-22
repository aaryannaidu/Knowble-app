import { Tabs } from 'expo-router/tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text, Image, Modal, StyleSheet, Animated, Alert, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../(auth)/AuthContext';
import { useState, useEffect, useRef, useMemo } from 'react';

// Custom Drawer Component
function CustomDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();

  // Animation values
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const menuItemAnim1 = useRef(new Animated.Value(0)).current;
  const menuItemAnim2 = useRef(new Animated.Value(0)).current;
  const menuItemAnim3 = useRef(new Animated.Value(0)).current;
  const menuItemAnims = useMemo(() => [
    menuItemAnim1,
    menuItemAnim2,
    menuItemAnim3,
  ], [menuItemAnim1, menuItemAnim2, menuItemAnim3]);

  useEffect(() => {
    if (visible) {
      // Slide in and fade in drawer
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Stagger menu item animations
        menuItemAnims.forEach((anim, index) => {
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay: index * 60,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        });
      });
    } else {
      // Fade out and slide out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -320,
          duration: 400,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim, menuItemAnims]);

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              onClose();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
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

  const MenuItem = ({
    icon,
    label,
    onPress,
    animValue
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    animValue: Animated.Value;
  }) => (
    <Animated.View
      style={{
        transform: [{
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          }),
        }],
        opacity: animValue,
      }}
    >
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons name={icon as any} size={24} color="#fff" />
        <Text style={styles.menuItemText}>{label}</Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color="rgba(255, 255, 255, 0.4)"
          style={{ marginLeft: 'auto' }}
        />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.drawerContent,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <LinearGradient
            colors={['#0d0d0d', '#1a1a1a', '#0f0f0f']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
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
              </View>
              <Text style={styles.username}>{user?.username || 'User'}</Text>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              <MenuItem
                icon="person-outline"
                label="Profile"
                onPress={navigateToProfile}
                animValue={menuItemAnims[0]}
              />

              <MenuItem
                icon="settings-outline"
                label="Settings"
                onPress={navigateToSettings}
                animValue={menuItemAnims[1]}
              />

              <MenuItem
                icon="bookmark-outline"
                label="Saved"
                onPress={navigateToSaved}
                animValue={menuItemAnims[2]}
              />
            </View>

            {/* Logout Button */}
            <View style={styles.logoutContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color="#ff4757" />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Background overlay - tap to close */}
        <Animated.View
          style={[
            styles.modalBackground,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            }
          ]}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>
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
            ...(drawerVisible ? { display: 'none' } : {} as any),
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
    left: 320,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  drawerContent: {
    width: 320,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#fff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  gradientBackground: {
    flex: 1,
    paddingTop: 20,
  },
  profileHeader: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileImageContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileImagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileImageText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  bio: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  menuItems: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  logoutContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 234, 234, 0.03)',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: '#ff4757',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
}); 