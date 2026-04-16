import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { QueueService } from '../../services/queue/queue.service';

export interface AwardPointsDto {
  userId: string;
  blackCardId: string;
  activityId: string;
  amount: number;
  type: 'TASK_REWARD' | 'INVITE_BONUS' | 'PURCHASE_BONUS' | 'ASSIST_BONUS' | 'LOTTERY_COST' | 'LOTTERY_WIN' | 'SEASON_RESET' | 'PENALTY' | 'EXPIRATION' | 'ADMIN_ADJUST';
  source: string;
  sourceId?: string;
  description?: string;
}

const TIER_THRESHOLDS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
  DIAMOND: 15000,
};

@Injectable()
export class PointsService {
  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private leaderboardService: LeaderboardService,
  ) {}

  async awardPoints(dto: AwardPointsDto) {
    const blackCard = await this.prisma.blackCard.findUnique({ where: { id: dto.blackCardId } });
    if (!blackCard || blackCard.status !== 'ACTIVE') throw new BadRequestException('黑卡无效或已失效');
    if (blackCard.userId !== dto.userId) throw new BadRequestException('黑卡不属于该用户');

    const newBalance = blackCard.totalPoints + dto.amount;
    if (newBalance < 0) throw new BadRequestException('积分不足');

    const ledger = await this.prisma.pointLedger.create({
      data: {
        userId: dto.userId,
        blackCardId: dto.blackCardId,
        type: dto.type,
        amount: dto.amount,
        balance: newBalance,
        source: dto.source,
        sourceId: dto.sourceId,
        description: dto.description,
      },
    });

    const newTier = this.calculateTier(newBalance) as any;

    await this.prisma.blackCard.update({
      where: { id: dto.blackCardId },
      data: { totalPoints: newBalance, tier: newTier, lastActiveAt: new Date() },
    });

    await this.leaderboardService.updateScore(dto.activityId, dto.userId, dto.amount);

    const rank = await this.leaderboardService.getRank(dto.activityId, dto.userId);
    if (rank !== null) {
      await this.prisma.blackCard.update({ where: { id: dto.blackCardId }, data: { currentRank: rank } });
    }

    return ledger;
  }

  async awardPointsAsync(dto: AwardPointsDto) {
    await this.queueService.addPointJob({
      userId: dto.userId,
      blackCardId: dto.blackCardId,
      activityId: dto.activityId,
      amount: dto.amount,
      type: dto.type,
      source: dto.source,
      sourceId: dto.sourceId,
      description: dto.description,
    });
    return { message: '积分处理中' };
  }

  async getBalance(blackCardId: string) {
    const blackCard = await this.prisma.blackCard.findUnique({ where: { id: blackCardId }, select: { totalPoints: true } });
    return blackCard?.totalPoints || 0;
  }

  async getLedger(userId: string, options: { limit?: number; offset?: number } = {}) {
    return this.prisma.pointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }

  async getLedgerByBlackCard(blackCardId: string, options: { limit?: number; offset?: number } = {}) {
    return this.prisma.pointLedger.findMany({
      where: { blackCardId },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }

  private calculateTier(totalPoints: number): string {
    let tier = 'BRONZE';
    for (const [tierName, threshold] of Object.entries(TIER_THRESHOLDS)) {
      if (totalPoints >= threshold) tier = tierName;
    }
    return tier;
  }
}
