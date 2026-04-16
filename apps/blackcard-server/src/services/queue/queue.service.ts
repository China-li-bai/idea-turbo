import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';

export interface PointJobData {
  userId: string;
  blackCardId: string;
  activityId: string;
  amount: number;
  type: string;
  source: string;
  sourceId?: string;
  description?: string;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private pointQueue: Queue;
  private pointWorker: Worker;
  private connection: any;

  constructor(private redisService: RedisService) {
    this.connection = this.redisService.getClient().duplicate();

    this.pointQueue = new Queue('points', { connection: this.connection });

    this.pointWorker = new Worker(
      'points',
      async (job: Job<PointJobData>) => {
        console.log(`Processing point job: ${job.id}`, job.data);
      },
      { connection: this.connection },
    );
  }

  async addPointJob(data: PointJobData) {
    return this.pointQueue.add('award-points', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async onModuleDestroy() {
    await this.pointWorker.close();
    await this.pointQueue.close();
  }
}
