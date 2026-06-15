import { initializeApp } from 'firebase/app';
import type { MessagePayload } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA1KCeOxbeXdSNAgbrUkrE4O0Epq9Ozqgw",
  authDomain: "task-manager-fc649.firebaseapp.com",
  projectId: "task-manager-fc649",
  storageBucket: "task-manager-fc649.firebasestorage.app",
  messagingSenderId: "192374049032",
  appId: "1:192374049032:web:a76872bafb4c5088d984bd",
};

const app = initializeApp(firebaseConfig);

const VAPID_KEY = 'BFHth9w310s6bP4T-F0xL4yK_RwONBgUXD0XHjcgJ6_XMrdU99zfb8p-6M2lVWS3zp-h-AVRBCg8KVO6pJt-LoU';

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    return token;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

export async function onForegroundMessage(callback: (payload: MessagePayload) => void) {
  if (typeof window === 'undefined') return;

  const { getMessaging, onMessage } = await import('firebase/messaging');
  const messaging = getMessaging(app);
  onMessage(messaging, callback);
}
