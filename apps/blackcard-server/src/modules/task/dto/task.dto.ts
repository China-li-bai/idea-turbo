import { IsString, IsOptional, IsNumber, Min, IsEnum, IsArray } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  activityId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['SHARE_POST', 'COMMENT', 'LIKE', 'CHECKIN', 'CUSTOM'])
  type: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyLimit?: number;

  @IsOptional()
  @IsNumber()
  totalLimit?: number;

  @IsOptional()
  @IsEnum(['MANUAL', 'OCR', 'LINK_CLICK', 'AUTO'])
  verificationType?: string;
}

export class SubmitTaskDto {
  @IsString()
  taskId: string;

  @IsString()
  blackCardId: string;

  @IsOptional()
  @IsArray()
  proofImages?: string[];

  @IsOptional()
  @IsString()
  proofText?: string;
}

export class QueryTaskDto {
  @IsOptional()
  @IsString()
  activityId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
