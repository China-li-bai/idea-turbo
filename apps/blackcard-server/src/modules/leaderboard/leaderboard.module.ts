import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RedisService } from '../../services/redis/redis.service';
import { ConfigService } from '@nestjs/config';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, RedisService, ConfigService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
