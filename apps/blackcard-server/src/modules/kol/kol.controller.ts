import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { KOLService } from './kol.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('kol')
export class KOLController {
  constructor(private kolService: KOLService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser('kolId') kolId: string) {
    return this.kolService.getProfile(kolId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@CurrentUser('kolId') kolId: string, @Query() body: { name?: string; avatar?: string; bio?: string; platform?: string }) {
    return this.kolService.updateProfile(kolId, body);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  getDashboard(@CurrentUser('kolId') kolId: string) {
    return this.kolService.getDashboard(kolId);
  }

  @Get('public')
  getPublicKOLs(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.kolService.getPublicKOLs({ limit: limit ? +limit : 20, offset: offset ? +offset : 0 });
  }

  @Get(':id')
  getKOLById(@Param('id') id: string) {
    return this.kolService.getProfile(id);
  }
}
