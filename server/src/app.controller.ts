import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService, HealthCheckResult } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthCheckResult> {
    const health = await this.appService.getHealth();
    return health;
  }

  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  getLiveness(): { status: string } {
    return { status: 'alive' };
  }

  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<{ status: string; database: string }> {
    const health = await this.appService.getHealth();
    return {
      status: health.checks.database.status === 'up' ? 'ready' : 'not_ready',
      database: health.checks.database.status,
    };
  }
}
