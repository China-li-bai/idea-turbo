import { IsString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsOptional()
  @IsString()
  shippingName?: string;

  @IsOptional()
  @IsString()
  shippingPhone?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryOrderDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class UpdateShippingDto {
  @IsString()
  trackingNumber: string;

  @IsOptional()
  @IsString()
  trackingCompany?: string;
}
