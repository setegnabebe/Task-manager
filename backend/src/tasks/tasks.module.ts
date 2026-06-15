import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { Subtask } from './subtask.entity';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Subtask]),
    AuthModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
