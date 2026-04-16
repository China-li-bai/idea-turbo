import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PointsService } from './points.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('points')
export class PointsController {
  constructor(private pointsService: PointsService) {}

  @Get('balance/:blackCardId')
  @UseGuards(JwtAuthGuard)
  getBalance(@Param('blackCardId') blackCardId: string) {
    return this.pointsService.getBalance(blackCardId);
  }

  @Get('ledger')
  @UseGuards(JwtAuthGuard)
  getLedger(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.pointsService.getLedger(userId, { limit: limit ? +limit : 20, offset: offset ? +offset : 0 });
  }

  @Get('ledger/:blackCardId')
  @UseGuards(JwtAuthGuard)
  getLedgerByBlackCard(@Param('blackCardId') blackCardId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.pointsService.getLedgerByBlackCard(blackCardId, { limit: limit ? +limit : 20, offset: offset ? +offset : 0 });
  }
}
