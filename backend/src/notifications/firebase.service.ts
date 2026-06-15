import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as serviceAccount from '../firebase-service-account.json';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    }
  }

  async sendPushNotification(token: string, title: string, body: string) {
    if (!token) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        webpush: {
          notification: {
            title,
            body,
            icon: '/favicon.png',
          },
        },
      });
    } catch (err) {
      console.error('Push notification error:', err);
    }
  }
}
