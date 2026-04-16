import { IsString, IsOptional, IsNumber, Min, IsEnum, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  images?: string;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsEnum(['MERCHANDISE', 'DIGITAL', 'COURSE', 'TICKET', 'OTHER'])
  category: string;

  @IsNumber()
  @Min(0)
  inventory: number;

  @IsOptional()
  @IsNumber()
  bonusPoints?: number;

  @IsOptional()
  @IsEnum(['NONE', 'FIXED', 'PERCENTAGE'])
  bonusType?: string;

  @IsOptional()
  @IsBoolean()
  shippingRequired?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  inventory?: number;

  @IsOptional()
  @IsNumber()
  bonusPoints?: number;

  @IsOptional()
  @IsBoolean()
  shippingRequired?: boolean;
}

export class QueryProductDto {
  @IsOptional()
  @IsString()
  kolId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
