import { Drawer } from 'expo-router/drawer';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../(auth)/AuthContext';
import { router } from 'expo-router';
import { getUserProfile } from '../(auth)/api';
import { useEffect } from 'react';

function CustomDrawerContent(props: any) {
  const { user, logout, token } = useAuth();
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

  return (
    <View style={{ flex: 1, backgroundColor: 'rgb(0, 0, 0)' }}>
      {/* Profile Header */}
      <View style={{
        paddingTop: 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: 'rgb(0, 0, 0)',
        alignItems: 'center',
      }}>
        {/* Profile Image */}
        <View style={{ marginBottom: 15, alignItems: 'center', justifyContent: 'center' }}>
          {user?.profile_picture_url || user?.profile_picture ? (
            <Image 
              source={{ uri: ((user.profile_picture_url || user.profile_picture) as string).replace('http:', 'https:') }} 
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
              }}
            />
          ) : (
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 0,
              backgroundColor: 'rgb(0, 0, 0)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 28,
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
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 4,
          textAlign: 'center',
        }}>
          {user?.username || 'User'}
        </Text>
        
        {user?.bio && (
          <Text style={{
            color: '#aaa',
            fontSize: 14,
            marginBottom: 10,
            textAlign: 'center',
          }}>
            {user.bio}
          </Text>
        )}
      </View>

      {/* Menu Items */}
      <View style={{ flex: 1, paddingTop: 20 }}>
        {/* Profile */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginHorizontal: 10,
          }}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/(drawer)/profile');
          }}
        >
          <Ionicons name="person-outline" size={24} color="#fff" />
          <Text style={{
            color: '#fff',
            fontSize: 16,
            marginLeft: 15,
            fontWeight: '500',
          }}>
            Profile
          </Text>
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginHorizontal: 10,
          }}
          onPress={() => {
            props.navigation.closeDrawer();
            router.push('/(drawer)/settings');
          }}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={{
            color: '#fff',
            fontSize: 16,
            marginLeft: 15,
            fontWeight: '500',
          }}>
            Settings
          </Text>
        </TouchableOpacity>

        {/* Saved */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 15,
            paddingHorizontal: 20,
            borderRadius: 8,
            marginHorizontal: 10,
          }}
          onPress={() => {
            props.navigation.closeDrawer();
            // Navigate to saved videos (you can create this screen later)
            router.push('/(drawer)/saved');
          }}
        >
          <Ionicons name="bookmark-outline" size={24} color="#fff" />
          <Text style={{
            color: '#fff',
            fontSize: 16,
            marginLeft: 15,
            fontWeight: '500',
          }}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={{
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#333',
        paddingTop: 20,
      }}>
        <TouchableOpacity
          style={{
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 18,
            backgroundColor: '#2c2c2c',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#ff4757',
          }}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff4757" />
          <Text style={{
            color: '#ff4757',
            fontSize: 15,
            marginLeft: 10,
            fontWeight: '500',
          }}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: 'rgb(0, 0, 0)',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        drawerStyle: {
          backgroundColor: 'rgb(0, 0, 0)',
          width: 280,
        },
        drawerActiveTintColor: '#58e2bd',
        drawerInactiveTintColor: '#fff',
        headerShown: false, // Hide headers since we're using custom drawer content
      }}
    >
      <Drawer.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          drawerIcon: ({ color }) => <Ionicons name="person" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          drawerIcon: ({ color }) => <Ionicons name="settings" size={22} color={color} />,
        }}
      />
      <Drawer.Screen
        name="saved/index"
        options={{
          title: 'Saved',
          drawerIcon: ({ color }) => <Ionicons name="bookmark" size={22} color={color} />,
        }}
      />
    </Drawer>
  );
} 