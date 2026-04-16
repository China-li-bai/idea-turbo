import { Module } from '@nestjs/common';
import { AssistController } from './assist.controller';
import { AssistService } from './assist.service';
import { PrismaService } from '../../common/config/prisma.service';

@Module({
  controllers: [AssistController],
  providers: [AssistService, PrismaService],
  exports: [AssistService],
})
export class AssistModule {}
