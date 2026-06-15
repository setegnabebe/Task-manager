import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.notificationsService.findByUser(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(+id);
  }

  @Patch('read/all')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
