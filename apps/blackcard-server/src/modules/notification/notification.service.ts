import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { title: string; content: string; type: string; relatedId?: string }) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        type: data.type as any,
        relatedId: data.relatedId,
      },
    });
  }

  async findByUser(userId: string, options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}) {
    const where: any = { userId };
    if (options.unreadOnly) where.isRead = false;

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 20,
      skip: options.offset || 0,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async sendBulk(userIds: string[], data: { title: string; content: string; type: string; relatedId?: string }) {
    const notifications = userIds.map((userId) => ({
      userId,
      title: data.title,
      content: data.content,
      type: data.type as any,
      relatedId: data.relatedId,
    }));

    return this.prisma.notification.createMany({ data: notifications });
  }
}
