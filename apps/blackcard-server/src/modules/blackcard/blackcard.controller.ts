import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { BlackCardService } from './blackcard.service';
import { ApplyBlackCardDto, QueryBlackCardDto } from './dto/blackcard.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('blackcard')
export class BlackCardController {
  constructor(private blackCardService: BlackCardService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(@CurrentUser('id') userId: string, @Body() dto: ApplyBlackCardDto) {
    return this.blackCardService.apply(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyCards(@CurrentUser('id') userId: string, @Query() query: QueryBlackCardDto) {
    return this.blackCardService.getMyBlackCards(userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getCardById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.blackCardService.getBlackCardById(userId, id);
  }
}
