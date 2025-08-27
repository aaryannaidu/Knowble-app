import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type NotificationType = 'success' | 'error' | 'info';

type NotificationContextValue = {
  showNotification: (message: string, type?: NotificationType) => void;
};

const NotificationContext = React.createContext<NotificationContextValue | undefined>(undefined);

export const useNotification = (): NotificationContextValue => {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [type, setType] = React.useState<NotificationType>('info');
  const translateY = React.useRef(new Animated.Value(-100)).current;

  const showNotification = (msg: string, t: NotificationType = 'info') => {
    setMessage(msg);
    setType(t);
    setVisible(true);

    Animated.timing(translateY, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 2500);
    });
  };

  const backgroundColor = type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db';

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      <View style={{ flex: 1 }}>
        {children}
        {visible && (
          <Animated.View style={[styles.toast, { backgroundColor, transform: [{ translateY }] }]}> 
            <Text style={styles.toastText}>{message}</Text>
          </Animated.View>
        )}
      </View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});


