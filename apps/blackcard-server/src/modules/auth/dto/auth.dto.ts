import { IsString, IsOptional } from 'class-validator';

export class WechatLoginDto {
  @IsString()
  code: string;
}

export class PhoneLoginDto {
  @IsString()
  phone: string;

  @IsString()
  code: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
