import { Controller, Get, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../auth/roles.decorator';

@Controller('activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Role('admin')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  findAll() {
    return this.activityService.findAll();
  }
}
