import { Injectable } from '@nestjs/common';
import { RedisService } from '../../services/redis/redis.service';

@Injectable()
export class LeaderboardService {
  constructor(private redisService: RedisService) {}

  private getKey(activityId: string): string {
    return `leaderboard:${activityId}`;
  }

  async updateScore(activityId: string, userId: string, increment: number) {
    await this.redisService.zincrby(this.getKey(activityId), increment, userId);
  }

  async getTopN(activityId: string, limit: number = 100) {
    const results = await this.redisService.zrevrange(this.getKey(activityId), 0, limit - 1, true);
    const entries: Array<{ rank: number; userId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        rank: Math.floor(i / 2) + 1,
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return entries;
  }

  async getRank(activityId: string, userId: string): Promise<number | null> {
    return this.redisService.zrevrank(this.getKey(activityId), userId);
  }

  async getScore(activityId: string, userId: string): Promise<number | null> {
    return this.redisService.zscore(this.getKey(activityId), userId);
  }

  async getAroundMe(activityId: string, userId: string, range: number = 5) {
    const rank = await this.getRank(activityId, userId);
    if (rank === null) return [];

    const start = Math.max(0, rank - range);
    const stop = rank + range;
    const results = await this.redisService.zrevrange(this.getKey(activityId), start, stop, true);

    const entries: Array<{ rank: number; userId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({
        rank: start + Math.floor(i / 2) + 1,
        userId: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return entries;
  }

  async getMyRankInfo(activityId: string, userId: string) {
    const rank = await this.getRank(activityId, userId);
    const score = await this.getScore(activityId, userId);
    const total = await this.redisService.zcard(this.getKey(activityId));

    let distanceToNext: { nextUserId: string; distance: number } | null = null;
    if (rank !== null && rank > 0) {
      const topResults = await this.redisService.zrevrange(this.getKey(activityId), rank - 1, rank - 1, true);
      if (topResults.length >= 2) {
        const nextScore = parseFloat(topResults[1]);
        distanceToNext = { nextUserId: topResults[0], distance: nextScore - (score || 0) };
      }
    }

    return { rank, score, distanceToNext, totalParticipants: total };
  }
}
