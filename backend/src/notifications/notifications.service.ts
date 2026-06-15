import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../auth/user.entity';
import { FirebaseService } from './firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    private firebaseService: FirebaseService,
  ) {}

  async create(message: string, user: User) {
    const notification = this.notificationsRepository.create({ message, user });
    await this.notificationsRepository.save(notification);

    if (user.fcmtoken) {
      await this.firebaseService.sendPushNotification(
        user.fcmtoken,
        'Task Manager',
        message,
      );
    }

    return notification;
  }

  findByUser(userId: number): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { user: { id: userId } },
      order: { created_at: 'DESC' },
      take: 20,
    });
  }

  async markRead(id: number) {
    await this.notificationsRepository.update(id, { isRead: true });
    return { success: true };
  }

  async markAllRead(userId: number) {
    await this.notificationsRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}
