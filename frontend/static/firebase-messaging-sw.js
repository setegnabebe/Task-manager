importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA1KCeOxbeXdSNAgbrUkrE4O0Epq9Ozqgw",
  authDomain: "task-manager-fc649.firebaseapp.com",
  projectId: "task-manager-fc649",
  storageBucket: "task-manager-fc649.firebasestorage.app",
  messagingSenderId: "192374049032",
  appId: "1:192374049032:web:a76872bafb4c5088d984bd",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.png',
  });
});