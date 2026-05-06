import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AppService, HealthCheckResult } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comprehensive health status', description: 'Returns overall system health including database, memory, and SMTP status' })
  @ApiResponse({ status: 200, description: 'System is healthy or degraded' })
  @ApiResponse({ status: 503, description: 'System is unhealthy' })
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResult> {
    const health = await this.appService.getHealth();
    // Return 503 if unhealthy
    if (health.status === 'unhealthy') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }

  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe', description: 'K8s liveness probe - returns 200 if application is running' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  getLiveness(): { status: string; timestamp: string } {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe', description: 'K8s readiness probe - returns 200 if application is ready to serve traffic' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  async getReadiness(@Res({ passthrough: true }) res: Response): Promise<{
    status: string;
    database: string;
    smtp: string;
    timestamp: string;
  }> {
    const health = await this.appService.getHealth();
    const isReady = health.checks.database.status === 'up';

    if (!isReady) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: isReady ? 'ready' : 'not_ready',
      database: health.checks.database.status,
      smtp: health.checks.smtp?.status || 'unknown',
      timestamp: health.timestamp,
    };
  }

  @Get('health/startup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Startup probe', description: 'K8s startup probe - returns 200 when application has started' })
  @ApiResponse({ status: 200, description: 'Application has started' })
  getStartup(): { status: string; timestamp: string } {
    return { status: 'started', timestamp: new Date().toISOString() };
  }
}
