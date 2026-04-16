import { Module } from '@nestjs/common';
import { SeasonController } from './season.controller';
import { SeasonService } from './season.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [SeasonController],
  providers: [SeasonService, PrismaService],
  exports: [SeasonService],
})
export class SeasonModule {}
