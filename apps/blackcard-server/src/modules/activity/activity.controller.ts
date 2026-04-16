import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivityDto } from './dto/activity.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('kolId') kolId: string, @Body() dto: CreateActivityDto) {
    return this.activityService.create(kolId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findByKOL(@CurrentUser('kolId') kolId: string, @Query() query: QueryActivityDto) {
    return this.activityService.findByKOL(kolId, query);
  }

  @Get('public')
  findPublic(@Query() query: QueryActivityDto) {
    return this.activityService.findPublic(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.activityService.getStats(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('kolId') kolId: string, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activityService.update(kolId, id, dto);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@CurrentUser('kolId') kolId: string, @Param('id') id: string) {
    return this.activityService.publish(kolId, id);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  start(@CurrentUser('kolId') kolId: string, @Param('id') id: string) {
    return this.activityService.start(kolId, id);
  }

  @Post(':id/finish')
  @UseGuards(JwtAuthGuard)
  finish(@CurrentUser('kolId') kolId: string, @Param('id') id: string) {
    return this.activityService.finish(kolId, id);
  }
}
