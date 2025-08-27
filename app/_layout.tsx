// import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { AuthProvider } from './(auth)/AuthContext';
import { NotificationProvider } from './components/NotificationProvider';
import { useFonts } from 'expo-font';
// import * as SplashScreen from 'expo-splash-screen';

export default function RootLayout() {
  
  // Load any resources or data needed for app
  const [loaded] = useFonts({
    // Add any custom fonts here if needed
  });
  
  // Prevent rendering until the font has loaded
  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen 
            name="(tabs)" 
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="(drawer)" 
            options={{
              headerShown: false,
              presentation: 'modal',
            }}
          />
          <Stack.Screen 
            name="watch/[video_id]" 
            options={{ 
              headerShown: false // Hide the header completely
            }} 
          />
          <Stack.Screen 
            name="microcourses/[micro_course_id]" 
            options={{ 
              headerShown: true,
              headerTitle: "Micro Course",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }} 
          />
          <Stack.Screen 
            name="categories/[category_id]" 
            options={{ 
              headerShown: true,
              headerTitle: "Category",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }} 
          />
          <Stack.Screen 
            name="create-video"
            options={{
              headerShown: true,
              headerTitle: "Create Video",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="processing-video"
            options={{
              headerShown: true,
              headerTitle: "Processing",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="chat"
            options={{
              headerShown: true,
              headerTitle: "NAIDU Assistant",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }}
          />
          <Stack.Screen 
            name="comments/[video_id]"
            options={{
              headerShown: true,
              headerTitle: "Comments",
              headerStyle: {
                backgroundColor: '#202020',
              },
              headerTintColor: '#fff',
            }}
          />
          </Stack>
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
