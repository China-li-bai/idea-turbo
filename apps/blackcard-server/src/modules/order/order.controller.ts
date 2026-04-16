import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, QueryOrderDto, UpdateShippingDto } from './dto/order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateOrderDto) {
    return this.orderService.create(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findByUser(@CurrentUser('id') userId: string, @Query() query: QueryOrderDto) {
    return this.orderService.findByUser(userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.findOne(id, userId);
  }

  @Post(':id/pay')
  @UseGuards(JwtAuthGuard)
  pay(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.pay(id, userId);
  }

  @Post(':id/ship')
  @UseGuards(JwtAuthGuard)
  ship(@Param('id') id: string, @CurrentUser('kolId') kolId: string, @Body() dto: UpdateShippingDto) {
    return this.orderService.ship(id, kolId, dto);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.confirm(id, userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orderService.cancel(id, userId);
  }
}
