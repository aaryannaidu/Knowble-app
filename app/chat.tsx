import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { sendChatMessage } from './(auth)/api';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const videoId = params.video_id as string | undefined;

  useEffect(() => {
    console.log('Chat screen loaded with videoId:', videoId);
  }, [videoId]);

  // Animated values for typing dots
  const dot1Animation = useRef(new Animated.Value(0)).current;
  const dot2Animation = useRef(new Animated.Value(0)).current;
  const dot3Animation = useRef(new Animated.Value(0)).current;

  // Suggestions for the welcome screen
  const suggestions = videoId 
    ? [
        'Explain this video to me',
        'Summarize the main points',
        'What should I learn next?'
      ]
    : [
        'What can you help me with?',
        'How do I create videos?',
        'Recommend me some videos'
      ];

  // Function to send a message
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text,
      isUser: true,
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setShowWelcome(false);
    setIsTyping(true);

    try {
      // Send message to API with video_id if available
      const response = await sendChatMessage(text, videoId);
      
      // Add bot response to chat
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response || 'Sorry, I couldn\'t process that request.',
        isUser: false,
      };
      
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I had trouble processing your request. Please try again.',
        isUser: false,
      };
      
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // Animate typing dots
  useEffect(() => {
    if (isTyping) {
      // Create animation sequence for each dot
      const animateDots = () => {
        Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(dot1Animation, {
                toValue: 1,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
              Animated.timing(dot1Animation, {
                toValue: 0,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(200),
              Animated.timing(dot2Animation, {
                toValue: 1,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
              Animated.timing(dot2Animation, {
                toValue: 0,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.delay(400),
              Animated.timing(dot3Animation, {
                toValue: 1,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
              Animated.timing(dot3Animation, {
                toValue: 0,
                duration: 400,
                easing: Easing.ease,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
      };

      animateDots();
    } else {
      // Reset animations when not typing
      dot1Animation.setValue(0);
      dot2Animation.setValue(0);
      dot3Animation.setValue(0);
    }
  }, [isTyping]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: videoId ? 'NAIDU - Video Assistant' : 'NAIDU',
          headerStyle: {
            backgroundColor: '#202020',
          },
          headerTintColor: '#58e2bd',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#58e2bd" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
        >
          {showWelcome ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.robotAvatar}>
                <Ionicons name="hardware-chip" size={48} color="#58e2bd" />
              </View>
              <Text style={styles.welcomeTitle}>Hey there! I'm NAIDU</Text>
              <Text style={styles.welcomeText}>
                {videoId 
                  ? "I can help you understand this video better. What would you like to know about it?"
                  : "I'm your friendly AI learning companion, here to help you navigate through Knowble's educational content. What can I help you with today?"}
              </Text>
              <Text style={styles.welcomeText}>Try asking me something like:</Text>
              <View style={styles.suggestionPills}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionPill}
                    onPress={() => handleSuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <>
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    message.isUser ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isUser ? styles.userMessageText : styles.botMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              ))}
              {isTyping && (
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>NAIDU is thinking</Text>
                  <View style={styles.dotContainer}>
                    <Animated.View 
                      style={[
                        styles.dot,
                        {
                          transform: [
                            { 
                              translateY: dot1Animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -5]
                              })
                            }
                          ]
                        }
                      ]} 
                    />
                    <Animated.View 
                      style={[
                        styles.dot,
                        {
                          transform: [
                            { 
                              translateY: dot2Animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -5]
                              })
                            }
                          ]
                        }
                      ]} 
                    />
                    <Animated.View 
                      style={[
                        styles.dot,
                        {
                          transform: [
                            { 
                              translateY: dot3Animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -5]
                              })
                            }
                          ]
                        }
                      ]} 
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#000' : '#666'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  chatContent: {
    flexGrow: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#58e2bd',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e1e1e',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#58e2bd',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#000',
  },
  botMessageText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1e1e1e',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  input: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#58e2bd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1e1e1e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#58e2bd',
  },
  typingText: {
    color: '#58e2bd',
    marginRight: 8,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#58e2bd',
    marginHorizontal: 2,
    opacity: 0.7,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 20,
  },
  robotAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#58e2bd',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#58e2bd',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  suggestionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  suggestionPill: {
    backgroundColor: 'rgba(88, 226, 189, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(88, 226, 189, 0.3)',
  },
  suggestionText: {
    color: '#fff',
  },
}); 