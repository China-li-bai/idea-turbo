import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class InvitationService {
  constructor(private prisma: PrismaService) {}

  async createRecord(inviterId: string, inviteeId: string, activityId: string) {
    if (inviterId === inviteeId) throw new BadRequestException('不能邀请自己');

    const existing = await this.prisma.invitation.findUnique({
      where: { inviterId_inviteeId: { inviterId, inviteeId } },
    });
    if (existing) throw new BadRequestException('已邀请过该用户');

    const invitee = await this.prisma.user.findUnique({ where: { id: inviteeId } });
    if (!invitee) throw new BadRequestException('被邀请用户不存在');

    return this.prisma.invitation.create({
      data: {
        inviterId,
        inviteeId,
        activityId,
        status: 'PENDING',
        bonusPoints: 50,
      },
    });
  }

  async getMyInvitations(userId: string, options: { limit?: number; offset?: number } = {}) {
    const [invitations, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where: { inviterId: userId },
        include: { invitee: { select: { nickname: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0,
      }),
      this.prisma.invitation.count({ where: { inviterId: userId } }),
    ]);

    return { invitations, total };
  }

  async getInviteStats(userId: string) {
    const total = await this.prisma.invitation.count({ where: { inviterId: userId } });
    const completed = await this.prisma.invitation.count({ where: { inviterId: userId, status: 'COMPLETED' } });
    const totalBonusPoints = await this.prisma.pointLedger.aggregate({
      where: { userId, type: 'INVITE_BONUS', source: 'INVITATION' },
      _sum: { amount: true },
    });

    return {
      totalInvitations: total,
      completedInvitations: completed,
      totalBonusPoints: totalBonusPoints._sum.amount || 0,
    };
  }

  async completeInvitation(inviteeId: string, activityId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { inviteeId, activityId, status: 'PENDING' },
    });
    if (!invitation) return null;

    return this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }
}
