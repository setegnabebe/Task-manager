import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './activity-log.entity';
import { User } from '../auth/user.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private activityRepo: Repository<ActivityLog>,
  ) {}

  async log(action: string, details: string, user?: User) {
    const entry = this.activityRepo.create({
      action,
      details,
      performedBy: user,
    });
    await this.activityRepo.save(entry);
  }

  findAll(): Promise<ActivityLog[]> {
    return this.activityRepo.find({
      relations: ['performedBy'],
      order: { created_at: 'DESC' },
      take: 50,
    });
  }
}
