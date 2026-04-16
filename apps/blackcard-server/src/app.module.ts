import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ActivityModule } from './modules/activity/activity.module';
import { BlackCardModule } from './modules/blackcard/blackcard.module';
import { TaskModule } from './modules/task/task.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { PointsModule } from './modules/points/points.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { SeasonModule } from './modules/season/season.module';
import { AssistModule } from './modules/assist/assist.module';
import { LotteryModule } from './modules/lottery/lottery.module';
import { KOLModule } from './modules/kol/kol.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PrismaService } from './common/config/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ActivityModule,
    BlackCardModule,
    TaskModule,
    CheckinModule,
    PointsModule,
    LeaderboardModule,
    ProductModule,
    OrderModule,
    InvitationModule,
    SeasonModule,
    AssistModule,
    LotteryModule,
    KOLModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
