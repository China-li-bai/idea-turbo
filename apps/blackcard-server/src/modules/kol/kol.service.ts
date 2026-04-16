import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class KOLService {
  constructor(private prisma: PrismaService) {}

  async getProfile(kolId: string) {
    const kol = await this.prisma.kOL.findUnique({
      where: { id: kolId },
      include: {
        _count: { select: { activities: true, products: true, lotteryPools: true } },
      },
    });
    if (!kol) throw new NotFoundException('KOL不存在');
    return kol;
  }

  async updateProfile(kolId: string, data: { name?: string; avatar?: string; bio?: string; platform?: string }) {
    return this.prisma.kOL.update({
      where: { id: kolId },
      data,
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.kOL.findUnique({
      where: { userId },
    });
  }

  async getDashboard(kolId: string) {
    const kol = await this.prisma.kOL.findUnique({ where: { id: kolId } });
    if (!kol) throw new NotFoundException('KOL不存在');

    const [totalActivities, activeActivities, totalProducts, totalOrders, totalBlackCards] = await Promise.all([
      this.prisma.activity.count({ where: { kolId } }),
      this.prisma.activity.count({ where: { kolId, status: 'ONGOING' } }),
      this.prisma.product.count({ where: { kolId, status: 'ACTIVE' } }),
      this.prisma.order.count({ where: { items: { some: { product: { kolId } } } } }),
      this.prisma.blackCard.count({ where: { activity: { kolId } } }),
    ]);

    return { totalActivities, activeActivities, totalProducts, totalOrders, totalBlackCards };
  }

  async getPublicKOLs(options: { limit?: number; offset?: number } = {}) {
    return this.prisma.kOL.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        avatar: true,
        platform: true,
        bio: true,
        _count: { select: { activities: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }
}
