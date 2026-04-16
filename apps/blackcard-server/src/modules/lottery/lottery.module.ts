import { Module } from '@nestjs/common';
import { LotteryController } from './lottery.controller';
import { LotteryService } from './lottery.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [LotteryController],
  providers: [LotteryService, PrismaService],
  exports: [LotteryService],
})
export class LotteryModule {}
