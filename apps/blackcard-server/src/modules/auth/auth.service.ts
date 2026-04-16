import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/config/prisma.service';
import { WechatLoginDto, PhoneLoginDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async wechatLogin(dto: WechatLoginDto) {
    const openid = `wx_${dto.code}_${Date.now()}`;

    let user = await this.prisma.user.findUnique({ where: { openid } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: `用户${Date.now().toString(36)}`,
          status: 'ACTIVE',
          role: 'FAN',
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateToken(user);
  }

  async phoneLogin(dto: PhoneLoginDto) {
    let user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });

    if (!user) {
      const openid = `phone_${dto.phone}`;
      user = await this.prisma.user.create({
        data: {
          openid,
          phone: dto.phone,
          nickname: `用户${dto.phone.slice(-4)}`,
          status: 'ACTIVE',
          role: 'FAN',
        },
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateToken(user);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        openid: true,
        unionId: true,
        phone: true,
        nickname: true,
        avatar: true,
        status: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, openid: user.openid, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      expiresIn: 7 * 24 * 60 * 60,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }
}
