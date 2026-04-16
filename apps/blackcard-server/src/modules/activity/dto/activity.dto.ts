import { IsString, IsOptional, IsNumber, Min, IsDateString } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsString()
  prizeName: string;

  @IsOptional()
  @IsString()
  prizeImage?: string;

  @IsNumber()
  prizeValue: number;

  @IsNumber()
  @Min(1)
  blackCardQuota: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qualificationDays?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  prizeName?: string;

  @IsOptional()
  @IsNumber()
  prizeValue?: number;

  @IsOptional()
  @IsNumber()
  blackCardQuota?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qualificationDays?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class QueryActivityDto {
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
