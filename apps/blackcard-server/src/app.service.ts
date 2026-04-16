import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'BlackCard Engine API - Compliance Edition';
  }
}
