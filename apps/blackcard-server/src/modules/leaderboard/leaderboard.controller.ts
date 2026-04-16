import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get(':activityId/top')
  getTopN(@Param('activityId') activityId: string, @Query('limit') limit?: number) {
    return this.leaderboardService.getTopN(activityId, limit ? +limit : 100);
  }

  @Get(':activityId/me')
  @UseGuards(JwtAuthGuard)
  getMyRank(@CurrentUser('id') userId: string, @Param('activityId') activityId: string) {
    return this.leaderboardService.getMyRankInfo(activityId, userId);
  }

  @Get(':activityId/around-me')
  @UseGuards(JwtAuthGuard)
  getAroundMe(@CurrentUser('id') userId: string, @Param('activityId') activityId: string, @Query('range') range?: number) {
    return this.leaderboardService.getAroundMe(activityId, userId, range ? +range : 5);
  }
}
