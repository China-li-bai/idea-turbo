import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AssistService } from './assist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('assist')
export class AssistController {
  constructor(private assistService: AssistService) {}

  @Post('task')
  @UseGuards(JwtAuthGuard)
  createTask(@CurrentUser('id') userId: string, @Body() body: { activityId: string; targetCount?: number; bonusPoints?: number }) {
    return this.assistService.createTask(userId, body.activityId, body);
  }

  @Post('help/:taskId')
  @UseGuards(JwtAuthGuard)
  assist(@CurrentUser('id') userId: string, @Param('taskId') taskId: string) {
    return this.assistService.assist(userId, taskId);
  }

  @Get('task/:taskId')
  getTaskDetail(@Param('taskId') taskId: string) {
    return this.assistService.getTaskDetail(taskId);
  }

  @Get('my-tasks')
  @UseGuards(JwtAuthGuard)
  getMyTasks(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.assistService.getMyTasks(userId, { limit: limit ? +limit : 10, offset: offset ? +offset : 0 });
  }

  @Get('my-records')
  @UseGuards(JwtAuthGuard)
  getMyAssistRecords(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.assistService.getMyAssistRecords(userId, { limit: limit ? +limit : 10, offset: offset ? +offset : 0 });
  }
}
