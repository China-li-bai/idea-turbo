import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/config/prisma.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(kolId: string, dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        kolId,
        name: dto.name,
        description: dto.description,
        coverImage: dto.coverImage,
        images: dto.images ? dto.images.split(',') : [],
        price: dto.price,
        category: dto.category as any,
        inventory: dto.inventory,
        bonusPoints: dto.bonusPoints || 0,
        bonusType: (dto.bonusType || 'NONE') as any,
        shippingRequired: dto.shippingRequired ?? false,
        status: 'ACTIVE',
      },
    });
  }

  async findByKOL(kolId: string, query: QueryProductDto) {
    return this.prisma.product.findMany({
      where: { kolId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
      skip: query.offset || 0,
    });
  }

  async findPublic(query: QueryProductDto) {
    const where: any = { status: 'ACTIVE' };
    if (query.kolId) where.kolId = query.kolId;
    if (query.category) where.category = query.category;

    return this.prisma.product.findMany({
      where,
      include: { kol: { select: { name: true, avatar: true } } },
      orderBy: { soldCount: 'desc' },
      take: query.limit || 20,
      skip: query.offset || 0,
    });
  }

  async findOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { kol: { select: { name: true, avatar: true } } },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async update(kolId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.kolId !== kolId) throw new BadRequestException('无权修改此商品');

    return this.prisma.product.update({ where: { id: productId }, data: dto });
  }

  async decreaseInventory(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('商品不存在');
    if (product.inventory < quantity) throw new BadRequestException('库存不足');

    return this.prisma.product.update({
      where: { id: productId },
      data: { inventory: { decrement: quantity }, soldCount: { increment: quantity } },
    });
  }
}
