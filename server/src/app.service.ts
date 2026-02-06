import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: 'up' | 'down'; latency?: number; error?: string };
    memory: { used: number; total: number; percentage: number };
  };
}

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
    };

    const allUp = checks.database.status === 'up';
    const status = allUp ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up', latency: Date.now() - start };
    } catch (error: any) {
      return { status: 'down', error: error.message };
    }
  }

  private checkMemory(): { used: number; total: number; percentage: number } {
    const memUsage = process.memoryUsage();
    const used = Math.round(memUsage.heapUsed / 1024 / 1024);
    const total = Math.round(memUsage.heapTotal / 1024 / 1024);
    return {
      used,
      total,
      percentage: Math.round((used / total) * 100),
    };
  }
}
