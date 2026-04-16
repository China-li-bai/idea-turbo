import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { CreateOrderDto, QueryOrderDto, UpdateShippingDto } from './dto/order.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrderDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.status !== 'ACTIVE') throw new BadRequestException('商品已下架');
    if (product.inventory < dto.quantity) throw new BadRequestException('库存不足');

    const totalAmount = product.price * dto.quantity;
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${uuidv4().split('-')[0].toUpperCase()}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: dto.productId },
        data: { inventory: { decrement: dto.quantity }, soldCount: { increment: dto.quantity } },
      });

      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          totalAmount,
          status: 'PENDING_PAYMENT',
          shippingAddress: dto.shippingAddress,
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          remark: dto.remark,
          items: {
            create: {
              productId: dto.productId,
              quantity: dto.quantity,
              unitPrice: product.price,
              subtotal: totalAmount,
              bonusPoints: product.bonusPoints * dto.quantity,
            },
          },
        },
        include: { items: true },
      });

      return order;
    });
  }

  async findByUser(userId: string, query: QueryOrderDto) {
    const where: any = { userId };
    if (query.status) where.status = query.status;

    return this.prisma.order.findMany({
      where,
      include: { items: { include: { product: { select: { name: true, coverImage: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 10,
      skip: query.offset || 0,
    });
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } }, user: { select: { nickname: true, avatar: true } } },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权查看此订单');
    return order;
  }

  async pay(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('订单状态不正确');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async ship(orderId: string, kolId: string, dto: UpdateShippingDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('订单不存在');

    const isKolOrder = order.items.some((item) => item.product?.kolId === kolId);
    if (!isKolOrder) throw new BadRequestException('无权操作此订单');
    if (order.status !== 'PAID') throw new BadRequestException('订单状态不正确');

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        trackingNumber: dto.trackingNumber,
        trackingCompany: dto.trackingCompany,
      },
    });
  }

  async confirm(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    if (order.status !== 'SHIPPED') throw new BadRequestException('订单状态不正确');

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async cancel(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.userId !== userId) throw new BadRequestException('无权操作此订单');
    if (order.status !== 'PENDING_PAYMENT') throw new BadRequestException('只能取消待付款订单');

    return this.prisma.$transaction(async (tx) => {
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { inventory: { increment: item.quantity }, soldCount: { decrement: item.quantity } } });
      }
      return tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    });
  }
}
