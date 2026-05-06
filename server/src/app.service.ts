import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmailService } from './email/email.service';
import * as fs from 'fs';
import * as path from 'path';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: { status: 'up' | 'down' | 'degraded'; latency?: number; error?: string };
    memory: { used: number; total: number; percentage: number; status: 'healthy' | 'warning' | 'critical' };
    disk?: { used: number; total: number; percentage: number; status: 'healthy' | 'warning' | 'critical' };
    smtp?: { status: 'up' | 'down' | 'degraded'; configured: boolean; latency?: number; error?: string };
  };
}

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  constructor(
    private dataSource: DataSource,
    private emailService: EmailService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthCheckResult> {
    const [database, smtp] = await Promise.all([
      this.checkDatabase(),
      this.emailService.checkHealth(),
    ]);

    const memory = this.checkMemory();
    const disk = this.checkDisk();

    // Determine overall status
    let status: HealthCheckResult['status'] = 'healthy';
    if (database.status === 'down') {
      status = 'unhealthy';
    } else if (smtp.status === 'down' || memory.status === 'critical' || disk?.status === 'critical') {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database,
        memory,
        ...(disk && { disk }),
        smtp,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down' | 'degraded'; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up', latency: Date.now() - start };
    } catch (error: any) {
      return { status: 'down', error: error.message };
    }
  }

  private checkMemory(): { used: number; total: number; percentage: number; status: 'healthy' | 'warning' | 'critical' } {
    const memUsage = process.memoryUsage();
    const used = Math.round(memUsage.heapUsed / 1024 / 1024);
    const total = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((used / total) * 100);

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (percentage > 90) status = 'critical';
    else if (percentage > 75) status = 'warning';

    return { used, total, percentage, status };
  }

  private checkDisk(): { used: number; total: number; percentage: number; status: 'healthy' | 'warning' | 'critical' } | undefined {
    try {
      const stats = fs.statSync(process.cwd());
      const tempPath = path.join(process.cwd(), '.tmp_health_check');

      // Try to write a test file to check disk writability
      try {
        fs.writeFileSync(tempPath, 'test');
        fs.unlinkSync(tempPath);
      } catch {
        // Disk may be read-only or full
      }

      // On Linux/macOS, use df command for actual disk stats
      // For now, return undefined to indicate we don't have precise disk stats
      return undefined;
    } catch {
      return undefined;
    }
  }
}
