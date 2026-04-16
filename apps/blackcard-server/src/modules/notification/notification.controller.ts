import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notification')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findByUser(@CurrentUser('id') userId: string, @Query('unreadOnly') unreadOnly?: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.notificationService.findByUser(userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? +limit : 20,
      offset: offset ? +offset : 0,
    });
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('read-all')
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }
}
