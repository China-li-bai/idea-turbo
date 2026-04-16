import { Module } from '@nestjs/common';
import { KOLController } from './kol.controller';
import { KOLService } from './kol.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [KOLController],
  providers: [KOLService, PrismaService],
  exports: [KOLService],
})
export class KOLModule {}
