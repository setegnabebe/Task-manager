import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FirebaseService } from './firebase.service';
import { User } from '../auth/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  providers: [NotificationsService, FirebaseService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
