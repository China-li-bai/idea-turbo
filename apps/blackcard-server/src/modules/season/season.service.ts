import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class SeasonService {
  constructor(private prisma: PrismaService) {}

  async createSeason(activityId: string, kolId: string, data: { name: string; startDate: string; endDate: string; demotionRules?: any }) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('活动不存在');
    if (activity.kolId !== kolId) throw new BadRequestException('无权操作此活动');

    const lastSeason = await this.prisma.season.findFirst({
      where: { activityId },
      orderBy: { seasonNumber: 'desc' },
    });

    const seasonNumber = (lastSeason?.seasonNumber || 0) + 1;

    return this.prisma.season.create({
      data: {
        activityId,
        seasonNumber,
        name: data.name || `第${seasonNumber}赛季`,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        demotionRules: data.demotionRules || { tiers: ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'], demotionThresholds: [15000, 5000, 2000, 500, 0] },
        status: 'UPCOMING',
      },
    });
  }

  async getSeasons(activityId: string) {
    return this.prisma.season.findMany({
      where: { activityId },
      include: { _count: { select: { seasonRanks: true } } },
      orderBy: { seasonNumber: 'desc' },
    });
  }

  async getCurrentSeason(activityId: string) {
    return this.prisma.season.findFirst({
      where: { activityId, status: 'ACTIVE' },
      include: { seasonRanks: { orderBy: { finalRank: 'asc' }, take: 10 } },
    });
  }

  async startSeason(seasonId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('赛季不存在');
    if (season.status !== 'UPCOMING') throw new BadRequestException('只能启动未开始的赛季');

    return this.prisma.$transaction(async (tx) => {
      await tx.season.updateMany({ where: { activityId: season.activityId, status: 'ACTIVE' }, data: { status: 'FINISHED' } });
      return tx.season.update({ where: { id: seasonId }, data: { status: 'ACTIVE' } });
    });
  }

  async settleSeason(seasonId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } });
    if (!season) throw new NotFoundException('赛季不存在');
    if (season.status !== 'ACTIVE') throw new BadRequestException('只能结算进行中的赛季');

    const blackCards = await this.prisma.blackCard.findMany({
      where: { activityId: season.activityId, status: 'ACTIVE' },
      orderBy: { totalPoints: 'desc' },
    });

    const demotionRules = (season.demotionRules as any) || { demotionThresholds: [15000, 5000, 2000, 500, 0] };
    const tiers = ['DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
    const thresholds = demotionRules.demotionThresholds || [15000, 5000, 2000, 500, 0];

    const results: Array<{ userId: string; rank: number; points: number; tier: string }> = [];
    for (let i = 0; i < blackCards.length; i++) {
      const card = blackCards[i];
      let newTier = 'BRONZE';
      for (let j = 0; j < thresholds.length; j++) {
        if (card.totalPoints >= thresholds[j]) {
          newTier = tiers[j];
          break;
        }
      }

      await this.prisma.seasonRank.create({
        data: { seasonId, userId: card.userId, blackCardId: card.id, finalRank: i + 1, finalPoints: card.totalPoints, finalTier: newTier as any },
      });

      await this.prisma.blackCard.update({ where: { id: card.id }, data: { tier: newTier as any } });

      results.push({ userId: card.userId, rank: i + 1, points: card.totalPoints, tier: newTier });
    }

    await this.prisma.season.update({ where: { id: seasonId }, data: { status: 'FINISHED' } });

    return { settled: results.length, results };
  }

  async getMySeasonRank(userId: string, seasonId: string) {
    return this.prisma.seasonRank.findUnique({ where: { seasonId_userId: { seasonId, userId } } });
  }
}
