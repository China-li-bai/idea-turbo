import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto, SubmitTaskDto, QueryTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTaskDto) {
    return this.taskService.create(dto);
  }

  @Get('activity/:activityId')
  findByActivity(@Param('activityId') activityId: string) {
    return this.taskService.findByActivity(activityId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taskService.findOne(id);
  }

  @Post('submit')
  @UseGuards(JwtAuthGuard)
  submit(@CurrentUser('id') userId: string, @Body() dto: SubmitTaskDto) {
    return this.taskService.submit(userId, dto);
  }

  @Get('submissions/my')
  @UseGuards(JwtAuthGuard)
  getMySubmissions(@CurrentUser('id') userId: string, @Query() query: QueryTaskDto) {
    return this.taskService.getMySubmissions(userId, query);
  }
}
