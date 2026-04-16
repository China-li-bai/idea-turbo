import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SeasonService } from './season.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('season')
export class SeasonController {
  constructor(private seasonService: SeasonService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('kolId') kolId: string, @Body() body: { activityId: string; name: string; startDate: string; endDate: string; demotionRules?: any }) {
    return this.seasonService.createSeason(body.activityId, kolId, body);
  }

  @Get('activity/:activityId')
  getSeasons(@Param('activityId') activityId: string) {
    return this.seasonService.getSeasons(activityId);
  }

  @Get('current/:activityId')
  getCurrentSeason(@Param('activityId') activityId: string) {
    return this.seasonService.getCurrentSeason(activityId);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  startSeason(@Param('id') id: string) {
    return this.seasonService.startSeason(id);
  }

  @Post(':id/settle')
  @UseGuards(JwtAuthGuard)
  settleSeason(@Param('id') id: string) {
    return this.seasonService.settleSeason(id);
  }

  @Get(':id/my-rank')
  @UseGuards(JwtAuthGuard)
  getMyRank(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.seasonService.getMySeasonRank(userId, id);
  }
}
