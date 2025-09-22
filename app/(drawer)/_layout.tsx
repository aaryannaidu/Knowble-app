import { Drawer } from 'expo-router/drawer';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../(auth)/AuthContext';
import { router } from 'expo-router';
import { getUserProfile } from '../(auth)/api';
import { useEffect, useCallback } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

function CustomDrawerContent(props: any) {
  const { user, logout, token } = useAuth();

  // Animation values
  const slideAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(0);

  // Start animations when component mounts
  const startAnimations = useCallback(() => {
    slideAnim.value = withTiming(1, { duration: 400 });
    fadeAnim.value = withTiming(1, { duration: 600 });
  }, [slideAnim, fadeAnim]);

  useEffect(() => {
    startAnimations();
  }, [startAnimations]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: interpolate(slideAnim.value, [0, 1], [-50, 0]) }],
      opacity: fadeAnim.value,
    };
  });

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (token) {
          const userData = await getUserProfile(token);
          console.log('User profile:', userData);
        }
      } catch (e) {
        console.log('Failed to fetch user profile:', e);
      }
    };
    fetchUserProfile();
  }, [token]);

  const MenuItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => {
    const itemAnim = useSharedValue(0);

    const animateItem = useCallback(() => {
      itemAnim.value = withTiming(1, { duration: 500 });
    }, [itemAnim]);

    useEffect(() => {
      animateItem();
    }, [animateItem]);

    const animatedItemStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: interpolate(itemAnim.value, [0, 1], [20, 0]) }],
        opacity: itemAnim.value,
      };
    });

    return (
      <Animated.View style={animatedItemStyle}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 16,
            paddingHorizontal: 24,
            borderRadius: 16,
            marginHorizontal: 16,
            marginVertical: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
          onPress={onPress}
        >
          <Ionicons name={icon as any} size={24} color="#58e2bd" />
          <Text style={{
            color: '#fff',
            fontSize: 16,
            marginLeft: 16,
            fontWeight: '600',
            letterSpacing: 0.3,
          }}>
            {label}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.4)" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f0f23']}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        {/* Profile Header */}
        <View style={{
          paddingTop: 50,
          paddingHorizontal: 24,
          paddingBottom: 24,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          {/* Profile Image */}
          <View style={{
            marginBottom: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#58e2bd',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {user?.profile_picture_url || user?.profile_picture ? (
              <Image
                source={{ uri: ((user.profile_picture_url || user.profile_picture) as string).replace('http:', 'https:') }}
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  borderWidth: 3,
                  borderColor: '#58e2bd',
                }}
              />
            ) : (
              <View style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: 'rgba(88, 226, 189, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#58e2bd',
              }}>
                <Text style={{
                  color: '#58e2bd',
                  fontSize: 32,
                  fontWeight: 'bold',
                }}>
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <Text style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: '700',
            marginBottom: 6,
            textAlign: 'center',
            letterSpacing: 0.5,
          }}>
            {user?.username || 'User'}
          </Text>

          {user?.bio && (
            <Text style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 14,
              marginBottom: 12,
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {user.bio}
            </Text>
          )}
        </View>

        {/* Menu Items */}
        <View style={{ flex: 1, paddingTop: 24 }}>
          <MenuItem
            icon="person-outline"
            label="Profile"
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(drawer)/profile');
            }}
          />

          <MenuItem
            icon="settings-outline"
            label="Settings"
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(drawer)/settings');
            }}
          />

          <MenuItem
            icon="bookmark-outline"
            label="Saved"
            onPress={() => {
              props.navigation.closeDrawer();
              router.push('/(drawer)/saved');
            }}
          />
        </View>

        {/* Logout Button */}
        <View style={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <TouchableOpacity
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
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
            }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#ff4757" />
            <Text style={{
              color: '#ff4757',
              fontSize: 16,
              marginLeft: 12,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: 'rgba(117, 172, 158, 0.1)',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        drawerStyle: {
          backgroundColor: 'transparent',
          width: 320,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        },
        drawerActiveTintColor: '#58e2bd',
        drawerInactiveTintColor: 'rgba(255, 255, 255, 0.7)',
        drawerActiveBackgroundColor: 'rgba(60, 160, 133, 0.1)',
        headerShown: false, // Hide headers since we're using custom drawer content
        drawerType: 'slide',
        overlayColor: 'rgba(8, 8, 8, 0.3)',
      }}
    >
      <Drawer.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          drawerIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          drawerIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="saved/index"
        options={{
          title: 'Saved',
          drawerIcon: ({ color }) => <Ionicons name="bookmark" size={24} color={color} />,
        }}
      />
    </Drawer>
  );
} 