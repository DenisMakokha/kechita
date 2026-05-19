import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';

/**
 * Compiles Handlebars templates with a curated helper set. Helpers are
 * registered once at construction. Compilation is cached by source string so
 * repeated previews of the same body are cheap.
 *
 * Security: Handlebars's default escaping is preserved; helpers that intend
 * to emit raw HTML must call `new Handlebars.SafeString(...)`. Helpers do not
 * accept arbitrary user code, so injection surface is limited to the template
 * author (HR_MANAGER / CEO) who is already trusted to publish documents.
 */
@Injectable()
export class TemplateRendererService {
    private readonly logger = new Logger(TemplateRendererService.name);
    private readonly cache = new Map<string, Handlebars.TemplateDelegate>();
    private readonly hb: typeof Handlebars;

    constructor() {
        // Create an isolated Handlebars instance so helpers we register don't
        // leak into other consumers (e.g. the email templating service).
        this.hb = Handlebars.create();
        this.registerHelpers();
    }

    private registerHelpers() {
        // --- Formatting ---
        this.hb.registerHelper('date', (value: any, fmt?: string) => {
            if (!value) return '';
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            // 'long' (default) → 15 June 2026, 'short' → 15/06/2026, 'iso' → 2026-06-15
            const style = typeof fmt === 'string' ? fmt : 'long';
            if (style === 'short') return d.toLocaleDateString('en-GB');
            if (style === 'iso') return d.toISOString().slice(0, 10);
            return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        });

        this.hb.registerHelper('currency', (value: any, currency?: string) => {
            const cur = typeof currency === 'string' ? currency : 'KES';
            const n = Number(value);
            if (!isFinite(n)) return '';
            return `${cur} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        });

        this.hb.registerHelper('number', (value: any, decimals?: number) => {
            const n = Number(value);
            if (!isFinite(n)) return '';
            const d = typeof decimals === 'number' ? decimals : 0;
            return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
        });

        this.hb.registerHelper('upper', (v: any) => (v == null ? '' : String(v).toUpperCase()));
        this.hb.registerHelper('lower', (v: any) => (v == null ? '' : String(v).toLowerCase()));
        this.hb.registerHelper('title', (v: any) => (v == null ? '' : String(v).replace(/\b\w/g, c => c.toUpperCase())));
        this.hb.registerHelper('default', (v: any, fallback: any) => {
            if (v === null || v === undefined || v === '') return fallback;
            return v;
        });
        this.hb.registerHelper('nl2br', (v: any) => {
            if (v == null) return '';
            const escaped = this.hb.escapeExpression(String(v));
            return new (this.hb as any).SafeString(escaped.replace(/\n/g, '<br>'));
        });

        // --- Lists ---
        this.hb.registerHelper('bullets', (items: any) => {
            if (!Array.isArray(items) || items.length === 0) return '';
            const lis = items
                .map(i => `<li>${this.hb.escapeExpression(String(i))}</li>`)
                .join('');
            return new (this.hb as any).SafeString(`<ul>${lis}</ul>`);
        });

        this.hb.registerHelper('join', (items: any, separator?: string) => {
            if (!Array.isArray(items)) return '';
            const sep = typeof separator === 'string' ? separator : ', ';
            return items.join(sep);
        });

        // --- Comparison (block helpers for {{#eq}}, {{#gt}}, {{#lt}}) ---
        this.hb.registerHelper('eq', function (this: any, a: any, b: any, options: any) {
            return a === b ? options.fn(this) : options.inverse(this);
        });
        this.hb.registerHelper('gt', function (this: any, a: any, b: any, options: any) {
            return Number(a) > Number(b) ? options.fn(this) : options.inverse(this);
        });
        this.hb.registerHelper('lt', function (this: any, a: any, b: any, options: any) {
            return Number(a) < Number(b) ? options.fn(this) : options.inverse(this);
        });
    }

    /**
     * Compile + render a template. Returns the resulting HTML/string.
     * Throws with a clear message if compilation fails so the UI can surface
     * "Template syntax error at line X" to the editor.
     */
    render(source: string, context: Record<string, any>): string {
        if (!source) return '';
        let tpl = this.cache.get(source);
        if (!tpl) {
            try {
                tpl = this.hb.compile(source, { noEscape: false, strict: false });
            } catch (err: any) {
                this.logger.error(`Template compile failed: ${err?.message}`);
                throw new Error(`Template syntax error: ${err?.message || err}`);
            }
            // Cap cache to avoid leaking memory if many ad-hoc previews are made
            if (this.cache.size > 200) this.cache.clear();
            this.cache.set(source, tpl);
        }
        try {
            return tpl(context || {});
        } catch (err: any) {
            this.logger.error(`Template render failed: ${err?.message}`);
            throw new Error(`Template render error: ${err?.message || err}`);
        }
    }
}
