import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('checkin')
export class CheckinController {
  constructor(private checkinService: CheckinService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  checkin(@CurrentUser('id') userId: string, @Body() body: { activityId: string; blackCardId: string }) {
    return this.checkinService.checkin(userId, body.activityId, body.blackCardId);
  }

  @Get('my/:activityId')
  @UseGuards(JwtAuthGuard)
  getMyCheckins(@CurrentUser('id') userId: string, @Param('activityId') activityId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.checkinService.getMyCheckins(userId, activityId, limit ? +limit : 30, offset ? +offset : 0);
  }

  @Get('today/:activityId')
  @UseGuards(JwtAuthGuard)
  getTodayStatus(@CurrentUser('id') userId: string, @Param('activityId') activityId: string) {
    return this.checkinService.getTodayStatus(userId, activityId);
  }
}
