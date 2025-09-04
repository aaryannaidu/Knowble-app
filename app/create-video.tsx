import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { useAuth } from './(auth)/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './(auth)/api';

export default function CreateVideoScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [video, setVideo] = useState<any>(null);
  const [thumbnail, setThumbnail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [videoInfo, setVideoInfo] = useState<{size?: string, duration?: number}>({});

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/categories/`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const pickVideo = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your media library to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 180, // Max 3 minutes (180 seconds)
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedVideo = result.assets[0];
        
        // Check file size (max 100MB)
        const fileSize = selectedVideo.fileSize || 0;
        if (fileSize > 100 * 1024 * 1024) { // 100MB in bytes
          Alert.alert('File Too Large', 'Video file must be less than 100MB');
          return;
        }

        // Format file size for display
        const formattedSize = formatFileSize(fileSize);
        
        setVideo(selectedVideo);
        setVideoInfo({
          size: formattedSize,
          duration: selectedVideo.duration || undefined
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to select video');
    }
  };

  const pickThumbnail = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant access to your media library to upload a thumbnail.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16], // enforce vertical crop for thumbnails
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setThumbnail(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking thumbnail:', error);
      Alert.alert('Error', 'Failed to select thumbnail');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!video) {
        Alert.alert('Video Required', 'Please select a video to upload');
        return false;
      }
      return true;
    }
    
    if (step === 2) {
      if (!title.trim()) {
        Alert.alert('Title Required', 'Please enter a title for your video');
        return false;
      }
      if (!description.trim()) {
        Alert.alert('Description Required', 'Please enter a description for your video');
        return false;
      }
      return true;
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    if (!video) {
      Alert.alert('Error', 'Please select a video to upload');
      return;
    }

    try {
      setIsLoading(true);

      // Create form data for multipart/form-data upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      
      if (category) {
        formData.append('category', category);
      }

      // Add video file
      const videoUri = Platform.OS === 'ios' ? video.uri.replace('file://', '') : video.uri;
      const videoName = video.fileName || `video_${Date.now()}.mp4`;
      formData.append('video_file', {
        uri: videoUri,
        name: videoName,
        type: 'video/mp4',
      } as any);

      // Add thumbnail if selected
      if (thumbnail) {
        const thumbnailUri = Platform.OS === 'ios' ? thumbnail.uri.replace('file://', '') : thumbnail.uri;
        const thumbnailName = thumbnail.fileName || `thumbnail_${Date.now()}.jpg`;
        formData.append('thumbnail', {
          uri: thumbnailUri,
          name: thumbnailName,
          type: 'image/jpeg',
        } as any);
      }

      // Send the request with authentication
      const response = await axios.post(`${API_BASE_URL}/videos/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setIsLoading(false);
      
      // Check if the video needs processing
      if (response.data && response.data.is_published === false) {
        // Store task ID for processing status checking
        if (response.data.task_id) {
          await AsyncStorage.setItem('processing_task_id', response.data.task_id);
        }
        // Redirect to processing screen
        router.push('/processing-video');
      } else {
        // Video was published immediately (verified user)
        Alert.alert(
          'Success', 
          'Your video has been uploaded and published successfully!',
          [{ text: 'OK', onPress: () => router.push('/(tabs)/home') }]
        );
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error uploading video:', error);
      Alert.alert('Upload Failed', 'There was an error uploading your video. Please try again.');
    }
  };

  // Render different steps based on currentStep
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select a Video</Text>
            <Text style={styles.stepDescription}>
              Choose an educational video to upload. Videos must be educational and less than 3 minutes long.
            </Text>
            
            <TouchableOpacity 
              style={[styles.verticalFrame, styles.verticalUploadZone]} 
              onPress={pickVideo}
              activeOpacity={0.8}
            >
              {video ? (
                <Video
                  source={{ uri: video.uri }}
                  style={styles.verticalMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={false}
                  isLooping={false}
                  useNativeControls
                />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={38} color="#58e2bd" />
                  <Text style={styles.uploadText}>Tap to select a video</Text>
                  <Text style={styles.uploadSubtext}>MP4, MOV, or other video formats</Text>
                </>
              )}
            </TouchableOpacity>

            {video && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileInfoText}>
                  Size: {videoInfo.size || 'Unknown'}
                </Text>
                <Text style={styles.fileInfoText}>
                  Duration: {formatDuration(videoInfo.duration)}
                </Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => router.back()}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton, !video && styles.disabledButton]} 
                onPress={nextStep}
                disabled={!video}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Video Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter a title for your video"
                placeholderTextColor="#777"
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Your description here"
                placeholderTextColor="#777"
                multiline
                numberOfLines={4}
                maxLength={200}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Thumbnail (9:16)</Text>
              <TouchableOpacity 
                style={[styles.verticalFrame, styles.verticalUploadZone]} 
                onPress={pickThumbnail}
                activeOpacity={0.8}
              >
                {thumbnail ? (
                  <Image source={{ uri: thumbnail.uri }} style={styles.verticalMedia} />
                ) : (
                  <>
                    <Ionicons name="image" size={32} color="#58e2bd" />
                    <Text style={styles.uploadText}>Tap to select a thumbnail</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={prevStep}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={nextStep}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Final Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category (Optional)</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesContainer}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      category === cat.id && styles.selectedCategoryItem
                    ]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Text 
                      style={[
                        styles.categoryText,
                        category === cat.id && styles.selectedCategoryText
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.reviewContainer}>
              <Text style={styles.reviewTitle}>Review Your Video</Text>
              
              <View style={styles.videoReview}>
                <View style={styles.videoReviewThumbnail}>
                  {thumbnail ? (
                    <Image source={{ uri: thumbnail.uri }} style={styles.reviewThumbnailImage} />
                  ) : (
                    <View style={styles.reviewThumbnailPlaceholder}>
                      <Ionicons name="videocam" size={24} color="#444" />
                    </View>
                  )}
                </View>
                <View style={styles.videoReviewDetails}>
                  <Text style={styles.videoReviewTitle} numberOfLines={1}>{title || "Untitled Video"}</Text>
                  <Text style={styles.videoReviewDescription} numberOfLines={2}>{description || "No description"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={prevStep}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Upload Video</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Upload Educational Video</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, currentStep >= 1 && styles.activeStep]} />
          <View style={[styles.progressLine, currentStep >= 2 && styles.activeLine]} />
          <View style={[styles.progressStep, currentStep >= 2 && styles.activeStep]} />
          <View style={[styles.progressLine, currentStep >= 3 && styles.activeLine]} />
          <View style={[styles.progressStep, currentStep >= 3 && styles.activeStep]} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, currentStep >= 1 && styles.activeLabel]}>Upload</Text>
          <Text style={[styles.progressLabel, currentStep >= 2 && styles.activeLabel]}>Details</Text>
          <Text style={[styles.progressLabel, currentStep >= 3 && styles.activeLabel]}>Finish</Text>
        </View>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderStep()}
      </ScrollView>
      
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#58e2bd" />
            <Text style={styles.loadingText}>Uploading video...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we process your file</Text>
          </View>
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressStep: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  activeStep: {
    backgroundColor: '#58e2bd',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#333',
    marginHorizontal: 5,
  },
  activeLine: {
    backgroundColor: '#58e2bd',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  progressLabel: {
    fontSize: 12,
    color: '#777',
  },
  activeLabel: {
    color: '#58e2bd',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 24,
  },
  uploadZone: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    height: 200,
  },
  uploadText: {
    color: '#58e2bd',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  uploadSubtext: {
    color: '#777',
    fontSize: 12,
    marginTop: 4,
  },
  videoPreviewContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  verticalPreviewSection: {
    marginTop: 16,
  },
  verticalPreviewTitle: {
    color: '#aaa',
    marginBottom: 8,
  },
  verticalFrame: {
    height: 320,
    aspectRatio: 9 / 16,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#101010',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  verticalUploadZone: {
    alignSelf: 'center',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  verticalMedia: {
    width: '100%',
    height: '100%',
  },
  fileInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    borderRadius: 8,
  },
  fileInfoText: {
    color: '#aaa',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#58e2bd',
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2c2c2c',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  thumbnailUpload: {
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    height: 120,
  },
  thumbnailPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#2c2c2c',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedCategoryItem: {
    backgroundColor: 'rgba(88, 226, 189, 0.2)',
    borderColor: '#58e2bd',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#58e2bd',
    fontWeight: '500',
  },
  reviewContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  reviewTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  videoReview: {
    flexDirection: 'row',
    backgroundColor: '#202020',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoReviewThumbnail: {
    width: 100,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  reviewThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  reviewThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoReviewDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  videoReviewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  videoReviewDescription: {
    color: '#aaa',
    fontSize: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#202020',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
}); 