import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { ApplyBlackCardDto, QueryBlackCardDto } from './dto/blackcard.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BlackCardService {
  constructor(private prisma: PrismaService) {}

  async apply(userId: string, dto: ApplyBlackCardDto) {
    const activity = await this.prisma.activity.findUnique({ where: { id: dto.activityId } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.status !== 'PUBLISHED' && activity.status !== 'ONGOING') throw new BadRequestException('活动未开放');

    const existingCard = await this.prisma.blackCard.findUnique({
      where: { userId_activityId: { userId, activityId: dto.activityId } },
    });
    if (existingCard) throw new BadRequestException('您已持有该活动的黑卡');
    if (activity.blackCardIssued >= activity.blackCardQuota) throw new BadRequestException('黑卡名额已满');

    const qualificationDays = activity.qualificationDays || 7;
    const approvedSubmissions = await this.prisma.taskSubmission.count({
      where: { userId, task: { activityId: dto.activityId }, status: 'APPROVED' },
    });
    if (approvedSubmissions < qualificationDays) {
      throw new ForbiddenException(`需完成${qualificationDays}天任务打卡（当前${approvedSubmissions}天）`);
    }

    const cardNumber = `BC-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;
    const blackCard = await this.prisma.blackCard.create({
      data: { userId, activityId: dto.activityId, cardNumber, status: 'ACTIVE', tier: 'BRONZE', totalPoints: 0, currentRank: 0 },
    });

    await this.prisma.activity.update({ where: { id: dto.activityId }, data: { blackCardIssued: { increment: 1 } } });
    return blackCard;
  }

  async getMyBlackCards(userId: string, query: QueryBlackCardDto) {
    const where: any = { userId };
    if (query.activityId) where.activityId = query.activityId;
    if (query.status) where.status = query.status;

    return this.prisma.blackCard.findMany({
      where,
      include: { activity: { select: { id: true, title: true, prizeName: true, endDate: true } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 10,
      skip: query.offset || 0,
    });
  }

  async getBlackCardById(userId: string, blackCardId: string) {
    const blackCard = await this.prisma.blackCard.findUnique({
      where: { id: blackCardId },
      include: { activity: true, user: { select: { nickname: true, avatar: true } } },
    });
    if (!blackCard) throw new NotFoundException('黑卡不存在');
    if (blackCard.userId !== userId) throw new ForbiddenException('无权访问此黑卡');
    return blackCard;
  }
}
