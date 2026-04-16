import { Module } from '@nestjs/common';
import { PointsController } from './points.controller';
import { PointsService } from './points.service';
import { PrismaService } from '../../common/config/prisma.service';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { QueueService } from '../../services/queue/queue.service';
import { RedisService } from '../../services/redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [LeaderboardModule],
  controllers: [PointsController],
  providers: [PointsService, PrismaService, QueueService, RedisService, ConfigService],
  exports: [PointsService],
})
export class PointsModule {}
