import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class LotteryService {
  constructor(private prisma: PrismaService) {}

  async createPool(kolId: string, data: { name: string; description?: string; coverImage?: string; costPoints: number; activityId?: string }) {
    return this.prisma.lotteryPool.create({
      data: {
        kolId,
        name: data.name,
        description: data.description,
        coverImage: data.coverImage,
        costPoints: data.costPoints,
        activityId: data.activityId,
        status: 'ACTIVE',
      },
    });
  }

  async addPrize(poolId: string, data: { name: string; description?: string; image?: string; probability: number; totalStock: number; tier: string }) {
    const pool = await this.prisma.lotteryPool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('奖池不存在');

    return this.prisma.lotteryPrize.create({
      data: {
        poolId,
        name: data.name,
        description: data.description,
        image: data.image,
        probability: data.probability,
        totalStock: data.totalStock,
        remainingStock: data.totalStock,
        tier: data.tier as any,
      },
    });
  }

  async getPools(kolId?: string, activityId?: string) {
    const where: any = { status: 'ACTIVE' };
    if (kolId) where.kolId = kolId;
    if (activityId) where.activityId = activityId;

    return this.prisma.lotteryPool.findMany({
      where,
      include: { _count: { select: { prizes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPoolDetail(poolId: string) {
    const pool = await this.prisma.lotteryPool.findUnique({
      where: { id: poolId },
      include: { prizes: { where: { remainingStock: { gt: 0 } } } },
    });
    if (!pool) throw new NotFoundException('奖池不存在');
    return pool;
  }

  async draw(userId: string, poolId: string, blackCardId: string) {
    const pool = await this.prisma.lotteryPool.findUnique({
      where: { id: poolId },
      include: { prizes: { where: { remainingStock: { gt: 0 } } } },
    });
    if (!pool) throw new NotFoundException('奖池不存在');
    if (pool.status !== 'ACTIVE') throw new BadRequestException('奖池未开放');
    if (pool.prizes.length === 0) throw new BadRequestException('奖池中没有可用奖品');

    const blackCard = await this.prisma.blackCard.findUnique({ where: { id: blackCardId } });
    if (!blackCard || blackCard.userId !== userId) throw new BadRequestException('黑卡无效');
    if (blackCard.totalPoints < pool.costPoints) throw new BadRequestException('积分不足');

    const prize = this.selectPrize(pool.prizes);
    if (!prize) throw new BadRequestException('抽奖失败，请重试');

    return this.prisma.$transaction(async (tx) => {
      await tx.pointLedger.create({
        data: {
          userId,
          blackCardId,
          type: 'LOTTERY_COST',
          amount: -pool.costPoints,
          balance: blackCard.totalPoints - pool.costPoints,
          source: 'LOTTERY',
          sourceId: poolId,
          description: `抽奖消耗${pool.costPoints}积分`,
        },
      });

      await tx.blackCard.update({
        where: { id: blackCardId },
        data: { totalPoints: { decrement: pool.costPoints } },
      });

      await tx.lotteryPrize.update({
        where: { id: prize.id },
        data: { remainingStock: { decrement: 1 } },
      });

      const draw = await tx.lotteryDraw.create({
        data: {
          poolId,
          userId,
          prizeId: prize.id,
          costPoints: pool.costPoints,
          status: prize.tier === 'THANK_YOU' ? 'COMPLETED' : 'PENDING',
        },
      });

      return { draw, prize: { id: prize.id, name: prize.name, image: prize.image, tier: prize.tier } };
    });
  }

  async getMyDraws(userId: string, options: { limit?: number; offset?: number } = {}) {
    return this.prisma.lotteryDraw.findMany({
      where: { userId },
      include: { prize: { select: { name: true, image: true, tier: true } } },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }

  async claimPrize(drawId: string, userId: string, shippingInfo: { address: string; name: string; phone: string }) {
    const draw = await this.prisma.lotteryDraw.findUnique({ where: { id: drawId } });
    if (!draw) throw new NotFoundException('抽奖记录不存在');
    if (draw.userId !== userId) throw new BadRequestException('无权操作');
    if (draw.status !== 'PENDING') throw new BadRequestException('奖品状态不正确');

    return this.prisma.lotteryDraw.update({
      where: { id: drawId },
      data: { status: 'CLAIMED', claimedAt: new Date() },
    });
  }

  private selectPrize(prizes: any[]): any {
    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * totalProbability;

    for (const prize of prizes) {
      random -= prize.probability;
      if (random <= 0) return prize;
    }

    return prizes[prizes.length - 1];
  }
}
