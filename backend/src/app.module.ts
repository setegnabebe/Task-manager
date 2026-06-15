import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { Task } from './tasks/task.entity';
import { Subtask } from './tasks/subtask.entity';
import { User } from './auth/user.entity';
import { Notification } from './notifications/notification.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { ActivityModule } from './activity/activity.module';
import { ActivityLog } from './activity/activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'localdb',
      database: 'taskmanager',
      entities: [Task, Subtask, User, Notification, ActivityLog],
      synchronize: true,
    }),
    TasksModule,
    AuthModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
