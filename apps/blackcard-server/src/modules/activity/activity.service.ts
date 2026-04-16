import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivityDto } from './dto/activity.dto';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async create(kolId: string, dto: CreateActivityDto) {
    return this.prisma.activity.create({
      data: {
        kolId,
        title: dto.title,
        description: dto.description,
        coverImage: dto.coverImage,
        prizeName: dto.prizeName,
        prizeImage: dto.prizeImage,
        prizeValue: dto.prizeValue,
        blackCardQuota: dto.blackCardQuota,
        qualificationDays: dto.qualificationDays || 7,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'DRAFT',
      },
    });
  }

  async findByKOL(kolId: string, query: QueryActivityDto) {
    const where: any = { kolId };
    if (query.status) where.status = query.status;

    return this.prisma.activity.findMany({
      where,
      include: { _count: { select: { blackCards: true, tasks: true, seasons: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 10,
      skip: query.offset || 0,
    });
  }

  async findOne(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        kol: { select: { name: true, avatar: true, platform: true } },
        tasks: { where: { status: 'ACTIVE' } },
        seasons: { orderBy: { seasonNumber: 'desc' }, take: 3 },
        _count: { select: { blackCards: true } },
      },
    });
    if (!activity) throw new NotFoundException('活动不存在');
    return activity;
  }

  async update(kolId: string, activityId: string, dto: UpdateActivityDto) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.kolId !== kolId) throw new ForbiddenException('无权修改此活动');
    if (activity.status === 'ONGOING' || activity.status === 'FINISHED') throw new BadRequestException('活动进行中或已结束，无法修改');

    const updateData: any = { ...dto };
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);

    return this.prisma.activity.update({ where: { id: activityId }, data: updateData });
  }

  async publish(kolId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId }, include: { tasks: true } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.kolId !== kolId) throw new ForbiddenException('无权发布此活动');
    if (activity.status !== 'DRAFT') throw new BadRequestException('只有草稿状态的活动可以发布');
    if (activity.tasks.length === 0) throw new BadRequestException('请先添加任务');

    return this.prisma.activity.update({ where: { id: activityId }, data: { status: 'PUBLISHED' } });
  }

  async start(kolId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.kolId !== kolId) throw new ForbiddenException('无权启动此活动');
    if (activity.status !== 'PUBLISHED') throw new BadRequestException('只有已发布的活动可以启动');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.activity.update({ where: { id: activityId }, data: { status: 'ONGOING' } });
      await tx.season.create({
        data: { activityId, seasonNumber: 1, name: '第1赛季', startDate: activity.startDate, endDate: activity.endDate, status: 'ACTIVE' },
      });
      return updated;
    });
  }

  async finish(kolId: string, activityId: string) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.kolId !== kolId) throw new ForbiddenException('无权结束此活动');
    return this.prisma.activity.update({ where: { id: activityId }, data: { status: 'FINISHED' } });
  }

  async findPublic(query: QueryActivityDto) {
    const where: any = { status: { in: ['PUBLISHED', 'ONGOING'] } };
    return this.prisma.activity.findMany({
      where,
      include: { kol: { select: { name: true, avatar: true, platform: true } }, _count: { select: { blackCards: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
      skip: query.offset || 0,
    });
  }

  async getStats(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { _count: { select: { blackCards: true, tasks: true, seasons: true } } },
    });
    if (!activity) throw new NotFoundException('活动不存在');

    const totalSubmissions = await this.prisma.taskSubmission.count({ where: { task: { activityId } } });
    const pendingSubmissions = await this.prisma.taskSubmission.count({ where: { task: { activityId }, status: 'PENDING' } });

    return {
      blackCardsIssued: activity._count.blackCards,
      tasksCount: activity._count.tasks,
      seasonsCount: activity._count.seasons,
      totalSubmissions,
      pendingSubmissions,
      blackCardQuota: activity.blackCardQuota,
      remainingQuota: activity.blackCardQuota - activity._count.blackCards,
    };
  }
}
