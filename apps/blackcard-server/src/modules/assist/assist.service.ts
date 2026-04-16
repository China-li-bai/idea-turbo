import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class AssistService {
  constructor(private prisma: PrismaService) {}

  async createTask(initiatorId: string, activityId: string, data: { targetCount?: number; bonusPoints?: number }) {
    const targetCount = data.targetCount || 5;
    const bonusPoints = data.bonusPoints || 100;

    const activeTask = await this.prisma.assistTask.findFirst({
      where: { initiatorId, activityId, status: 'ACTIVE' },
    });
    if (activeTask) throw new BadRequestException('已有进行中的助力任务');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return this.prisma.assistTask.create({
      data: { activityId, initiatorId, targetCount, bonusPoints, status: 'ACTIVE', expiresAt },
    });
  }

  async assist(helperId: string, taskId: string) {
    const task = await this.prisma.assistTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('助力任务不存在');
    if (task.status !== 'ACTIVE') throw new BadRequestException('任务已结束');
    if (new Date() > task.expiresAt) throw new BadRequestException('任务已过期');
    if (task.initiatorId === helperId) throw new BadRequestException('不能助力自己的任务');
    if (task.currentCount >= task.targetCount) throw new BadRequestException('助力已满');

    const existing = await this.prisma.assistRecord.findUnique({
      where: { taskId_helperId: { taskId, helperId } },
    });
    if (existing) throw new BadRequestException('您已助力过');

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.assistRecord.create({
        data: { taskId, helperId },
      });

      const newCount = task.currentCount + 1;
      const isCompleted = newCount >= task.targetCount;

      await tx.assistTask.update({
        where: { id: taskId },
        data: {
          currentCount: newCount,
          status: isCompleted ? 'COMPLETED' : 'ACTIVE',
          completedAt: isCompleted ? new Date() : undefined,
        },
      });

      return { record, isCompleted, currentCount: newCount, targetCount: task.targetCount };
    });
  }

  async getTaskDetail(taskId: string) {
    const task = await this.prisma.assistTask.findUnique({
      where: { id: taskId },
      include: {
        initiator: { select: { nickname: true, avatar: true } },
        assists: { include: { helper: { select: { nickname: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!task) throw new NotFoundException('助力任务不存在');
    return task;
  }

  async getMyTasks(initiatorId: string, options: { limit?: number; offset?: number } = {}) {
    return this.prisma.assistTask.findMany({
      where: { initiatorId },
      include: { _count: { select: { assists: true } } },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 10,
      skip: options.offset || 0,
    });
  }

  async getMyAssistRecords(helperId: string, options: { limit?: number; offset?: number } = {}) {
    return this.prisma.assistRecord.findMany({
      where: { helperId },
      include: { task: { include: { initiator: { select: { nickname: true, avatar: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 10,
      skip: options.offset || 0,
    });
  }
}
