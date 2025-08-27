import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getUserProfile, editUsername, editBio, editProfilePictureFile } from '../../(auth)/api';
import { useAuth } from '../../(auth)/AuthContext';
import { useNotification } from '../../components/NotificationProvider';

const EditProfileScreen = () => {
  const router = useRouter();
  const { token } = useAuth();
  const { showNotification } = useNotification();

  const [username, setUsername] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [profilePic, setProfilePic] = React.useState<string | null>(null);
  const [profilePicFile, setProfilePicFile] = React.useState<{ uri: string; name?: string; type?: string } | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const me = await getUserProfile(token || undefined);
        setUsername(me?.username || '');
        setBio(me?.bio || '');
        setProfilePic(me?.profile_picture || null);
      } catch {
        showNotification('Failed to load profile', 'error');
      }
    };
    load();
  }, [token, showNotification]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      showNotification('Permission to access gallery is required', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.uri) {
        setProfilePic(asset.uri);
        setProfilePicFile({ uri: asset.uri, type: asset.mimeType || 'image/jpeg', name: asset.fileName || 'profile.jpg' });
      }
    }
  };

  const onSave = async () => {
    setLoading(true);
    try {
      if (username) await editUsername(username);
      await editBio(bio || '');
      if (profilePicFile) {
        const result = await editProfilePictureFile(profilePicFile);
        // Update the profile picture URL from the server response if available
        if (result.user?.profile_picture_url) {
          setProfilePic(result.user.profile_picture_url);
        }
      }
      showNotification('Profile updated', 'success');
      router.back();
    } catch (error) {
      console.error('Profile update error:', error);
      showNotification('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update your info to keep things fresh</Text>
      </View>

      <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
          </View>
        )}
        <Text style={styles.changePhotoText}>Change profile picture</Text>
      </TouchableOpacity>

      <View style={styles.field}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          placeholderTextColor="#777"
          style={styles.input}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about you"
          placeholderTextColor="#777"
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={4}
          maxLength={200}
        />
        <Text style={styles.charCount}>{bio.length}/200</Text>
      </View>

      <TouchableOpacity style={[styles.saveButton, loading && { opacity: 0.7 }]} onPress={onSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    color: '#aaa',
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    color: '#777',
  },
  changePhotoText: {
    color: '#58e2bd',
    marginTop: 10,
    fontWeight: '600',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    color: '#bbb',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#202020',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#777',
    marginTop: 6,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#58e2bd',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});