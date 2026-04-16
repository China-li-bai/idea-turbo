import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class CheckinService {
  constructor(private prisma: PrismaService) {}

  async checkin(userId: string, activityId: string, blackCardId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyCheckin.findUnique({
      where: { userId_activityId_checkinDate: { userId, activityId, checkinDate: today } },
    });
    if (existing) throw new BadRequestException('今日已打卡');

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayCheckin = await this.prisma.dailyCheckin.findUnique({
      where: { userId_activityId_checkinDate: { userId, activityId, checkinDate: yesterday } },
    });

    const consecutiveDays = yesterdayCheckin ? yesterdayCheckin.consecutiveDays + 1 : 1;
    const pointsAwarded = Math.min(consecutiveDays * 5, 50);

    return this.prisma.dailyCheckin.create({
      data: { userId, activityId, blackCardId, checkinDate: today, consecutiveDays, pointsAwarded },
    });
  }

  async getMyCheckins(userId: string, activityId: string, limit: number = 30, offset: number = 0) {
    return this.prisma.dailyCheckin.findMany({
      where: { userId, activityId },
      orderBy: { checkinDate: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getTodayStatus(userId: string, activityId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCheckin = await this.prisma.dailyCheckin.findUnique({
      where: { userId_activityId_checkinDate: { userId, activityId, checkinDate: today } },
    });

    const lastCheckin = await this.prisma.dailyCheckin.findFirst({
      where: { userId, activityId },
      orderBy: { checkinDate: 'desc' },
    });

    return {
      checkedIn: !!todayCheckin,
      consecutiveDays: lastCheckin?.consecutiveDays || 0,
    };
  }
}
