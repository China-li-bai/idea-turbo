import { IsString, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';

export class ApplyBlackCardDto {
  @IsString()
  activityId: string;
}

export class QueryBlackCardDto {
  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'SUSPENDED'])
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
