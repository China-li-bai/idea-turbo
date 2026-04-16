import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto, UpdateProductDto, QueryProductDto } from './dto/product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('kolId') kolId: string, @Body() dto: CreateProductDto) {
    return this.productService.create(kolId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  findByKOL(@CurrentUser('kolId') kolId: string, @Query() query: QueryProductDto) {
    return this.productService.findByKOL(kolId, query);
  }

  @Get('public')
  findPublic(@Query() query: QueryProductDto) {
    return this.productService.findPublic(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('kolId') kolId: string, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(kolId, id, dto);
  }
}
