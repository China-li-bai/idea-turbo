import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { CreateTaskDto, SubmitTaskDto } from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        activityId: dto.activityId,
        title: dto.title,
        description: dto.description,
        type: dto.type as any,
        points: dto.points || 10,
        dailyLimit: dto.dailyLimit || 1,
        totalLimit: dto.totalLimit,
        verificationType: (dto.verificationType || 'MANUAL') as any,
        status: 'ACTIVE',
      },
    });
  }

  async findByActivity(activityId: string) {
    return this.prisma.task.findMany({ where: { activityId, status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    return task;
  }

  async submit(userId: string, dto: SubmitTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== 'ACTIVE') throw new BadRequestException('任务未开放');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySubmissions = await this.prisma.taskSubmission.count({
      where: { taskId: dto.taskId, userId, createdAt: { gte: today, lt: tomorrow } },
    });
    if (todaySubmissions >= task.dailyLimit) throw new BadRequestException('今日提交次数已达上限');

    return this.prisma.taskSubmission.create({
      data: {
        taskId: dto.taskId,
        userId,
        blackCardId: dto.blackCardId,
        proofImages: dto.proofImages || [],
        proofText: dto.proofText,
        status: 'PENDING',
        pointsAwarded: 0,
      },
    });
  }

  async getMySubmissions(userId: string, query: { activityId?: string; limit?: number; offset?: number }) {
    const where: any = { userId };
    if (query.activityId) where.task = { activityId: query.activityId };
    return this.prisma.taskSubmission.findMany({
      where,
      include: { task: { select: { title: true, type: true, points: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
      skip: query.offset || 0,
    });
  }

  async review(submissionId: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
    const submission = await this.prisma.taskSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('提交不存在');

    const updateData: any = { status, reviewedAt: new Date(), reviewNote };
    if (status === 'APPROVED') {
      const task = await this.prisma.task.findUnique({ where: { id: submission.taskId } });
      updateData.pointsAwarded = task?.points || 0;
      updateData.pointsAwardedAt = new Date();
    }

    return this.prisma.taskSubmission.update({ where: { id: submissionId }, data: updateData });
  }
}
