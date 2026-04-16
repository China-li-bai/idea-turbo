import { Module } from '@nestjs/common';
import { CheckinController } from './checkin.controller';
import { CheckinService } from './checkin.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [CheckinController],
  providers: [CheckinService, PrismaService],
  exports: [CheckinService],
})
export class CheckinModule {}
