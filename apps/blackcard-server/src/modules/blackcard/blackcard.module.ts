import { Module } from '@nestjs/common';
import { BlackCardController } from './blackcard.controller';
import { BlackCardService } from './blackcard.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [BlackCardController],
  providers: [BlackCardService, PrismaService],
  exports: [BlackCardService],
})
export class BlackCardModule {}
