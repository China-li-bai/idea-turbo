import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('invitation')
export class InvitationController {
  constructor(private invitationService: InvitationService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') inviterId: string, @Body() body: { inviteeId: string; activityId: string }) {
    return this.invitationService.createRecord(inviterId, body.inviteeId, body.activityId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyInvitations(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.invitationService.getMyInvitations(userId, { limit: limit ? +limit : 20, offset: offset ? +offset : 0 });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@CurrentUser('id') userId: string) {
    return this.invitationService.getInviteStats(userId);
  }
}
