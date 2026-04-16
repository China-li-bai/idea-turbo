import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LotteryService } from './lottery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('lottery')
export class LotteryController {
  constructor(private lotteryService: LotteryService) {}

  @Post('pool')
  @UseGuards(JwtAuthGuard)
  createPool(@CurrentUser('kolId') kolId: string, @Body() body: { name: string; description?: string; coverImage?: string; costPoints: number; activityId?: string }) {
    return this.lotteryService.createPool(kolId, body);
  }

  @Post('pool/:poolId/prize')
  @UseGuards(JwtAuthGuard)
  addPrize(@Param('poolId') poolId: string, @Body() body: { name: string; description?: string; image?: string; probability: number; totalStock: number; tier: string }) {
    return this.lotteryService.addPrize(poolId, body);
  }

  @Get('pools')
  getPools(@Query('kolId') kolId?: string, @Query('activityId') activityId?: string) {
    return this.lotteryService.getPools(kolId, activityId);
  }

  @Get('pool/:poolId')
  getPoolDetail(@Param('poolId') poolId: string) {
    return this.lotteryService.getPoolDetail(poolId);
  }

  @Post('draw/:poolId')
  @UseGuards(JwtAuthGuard)
  draw(@CurrentUser('id') userId: string, @Param('poolId') poolId: string, @Body() body: { blackCardId: string }) {
    return this.lotteryService.draw(userId, poolId, body.blackCardId);
  }

  @Get('my-draws')
  @UseGuards(JwtAuthGuard)
  getMyDraws(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.lotteryService.getMyDraws(userId, { limit: limit ? +limit : 20, offset: offset ? +offset : 0 });
  }

  @Post('claim/:drawId')
  @UseGuards(JwtAuthGuard)
  claimPrize(@CurrentUser('id') userId: string, @Param('drawId') drawId: string, @Body() body: { address: string; name: string; phone: string }) {
    return this.lotteryService.claimPrize(drawId, userId, body);
  }
}
