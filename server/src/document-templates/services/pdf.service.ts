import { Injectable, Logger, OnModuleDestroy, InternalServerErrorException } from '@nestjs/common';
import puppeteer, { Browser, PaperFormat } from 'puppeteer-core';
import * as fs from 'fs';

/**
 * Resolves the path to a system-installed Chromium/Chrome on Linux/macOS so
 * we can keep puppeteer-core lightweight (no bundled Chromium download).
 * Honours `PUPPETEER_EXECUTABLE_PATH` if set, otherwise probes common
 * locations. Returns null if nothing is found.
 */
function resolveChromiumPath(): string | null {
    const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

    const candidates = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const c of candidates) {
        try {
            if (fs.existsSync(c)) return c;
        } catch { /* ignore */ }
    }
    return null;
}

export interface PdfRenderOptions {
    bodyHtml: string;
    headerHtml?: string;
    footerHtml?: string;
    pageSize?: 'A4' | 'Letter';
    margins?: { top: number; right: number; bottom: number; left: number }; // mm
}

@Injectable()
export class PdfService implements OnModuleDestroy {
    private readonly logger = new Logger(PdfService.name);
    private browser: Browser | null = null;
    private launching: Promise<Browser> | null = null;

    /** Lazy-launch a singleton browser. Concurrent calls share one launch. */
    private async getBrowser(): Promise<Browser> {
        if (this.browser && this.browser.connected) return this.browser;
        if (this.launching) return this.launching;

        const executablePath = resolveChromiumPath();
        if (!executablePath) {
            throw new InternalServerErrorException(
                'No Chromium/Chrome binary found. Install chromium-browser on the server or set PUPPETEER_EXECUTABLE_PATH.',
            );
        }

        this.launching = puppeteer.launch({
            executablePath,
            headless: true,
            // --no-sandbox is required when running as root inside our PM2/Linux box.
            // We are in a controlled environment so the security trade-off is acceptable.
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none',
            ],
        }).then(b => {
            this.browser = b;
            this.launching = null;
            b.on('disconnected', () => {
                this.logger.warn('Puppeteer browser disconnected; will re-launch on next call.');
                this.browser = null;
            });
            return b;
        }).catch(err => {
            this.launching = null;
            this.logger.error(`Puppeteer launch failed: ${err?.message}`);
            throw err;
        });

        return this.launching;
    }

    async renderPdf(opts: PdfRenderOptions): Promise<Buffer> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        try {
            // Wrap body in a complete HTML doc with sane print defaults. The
            // template body is whatever HTML the template authored (TipTap
            // output is already valid HTML).
            const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Document</title>
<style>
  @page { size: ${opts.pageSize || 'A4'}; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Helvetica, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.45; }
  h1, h2, h3, h4 { color: #0f172a; }
  table { border-collapse: collapse; width: 100%; }
  table, th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
  ul, ol { padding-left: 22px; }
  .muted { color: #64748b; }
  .signature-block { margin-top: 32px; }
  .page-break { page-break-after: always; }
</style></head>
<body>${opts.bodyHtml || ''}</body></html>`;

            // 'load' covers our use-case (no external network fetches beyond
            // inline CSS/data: images). 'networkidle0' was removed from the
            // type union in puppeteer-core v25.
            await page.setContent(fullHtml, { waitUntil: 'load', timeout: 30000 });

            const margins = opts.margins || { top: 18, right: 16, bottom: 18, left: 16 };

            const pdfBytes = await page.pdf({
                format: (opts.pageSize || 'A4') as PaperFormat,
                printBackground: true,
                displayHeaderFooter: !!(opts.headerHtml || opts.footerHtml),
                headerTemplate: opts.headerHtml || '<span></span>',
                footerTemplate: opts.footerHtml || '<span></span>',
                margin: {
                    top: `${margins.top}mm`,
                    right: `${margins.right}mm`,
                    bottom: `${margins.bottom}mm`,
                    left: `${margins.left}mm`,
                },
                timeout: 30000,
            });
            return Buffer.from(pdfBytes);
        } finally {
            await page.close().catch(() => undefined);
        }
    }

    async onModuleDestroy() {
        if (this.browser) {
            await this.browser.close().catch(() => undefined);
            this.browser = null;
        }
    }
}
