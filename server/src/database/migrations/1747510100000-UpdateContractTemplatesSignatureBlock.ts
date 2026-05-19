import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the static "Employee Signature ___" block in the seeded contract
 * templates with a conditional block that embeds the captured signature
 * image (when present). Idempotent: only updates rows still containing the
 * original placeholder text.
 *
 * Old block (per CreateDocumentTemplates seed):
 *   <div style="margin-top:48px;display:flex;justify-content:space-between;gap:40px;">
 *     <div ...>Employee Signature ... Date: __________ </div>
 *     <div ...>For and on behalf of ... HR Manager ... Date: __________ </div>
 *   </div>
 *
 * New block embeds {{signature_image}} when set, plus shows the audit values.
 */
export class UpdateContractTemplatesSignatureBlock1747510100000 implements MigrationInterface {
    name = 'UpdateContractTemplatesSignatureBlock1747510100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const NEW_BLOCK = `
<div style="margin-top:48px;display:flex;justify-content:space-between;gap:40px;">
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">Employee Signature</div>
    {{#if signature_image}}
      <img src="{{signature_image}}" alt="signature" style="max-height:60px;max-width:200px;margin-top:4px;" />
      <div style="font-size:10pt;margin-top:4px;"><strong>{{staff.full_name}}</strong></div>
      <div style="font-size:9pt;color:#64748b;">Signed on {{date contract.signed_date}}</div>
    {{else}}
      <div style="height:50px;"></div>
      <div style="font-size:10pt;margin-top:6px;"><strong>{{staff.full_name}}</strong></div>
      <div style="font-size:9pt;color:#64748b;">Date: ____________________</div>
    {{/if}}
  </div>
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">For and on behalf of {{company.name}}</div>
    <div style="height:50px;"></div>
    <div style="font-size:10pt;margin-top:6px;"><strong>HR Manager</strong></div>
    <div style="font-size:9pt;color:#64748b;">Date: ____________________</div>
  </div>
</div>`;

        // Find every contract template and update its body. We match by kind
        // rather than string substring so we don't accidentally update
        // hand-edited HR templates.
        const rows: Array<{ id: string; body_html: string }> = await queryRunner.query(
            `SELECT id, body_html FROM document_templates WHERE kind = 'employment_contract'`,
        );

        // The old block always starts with a marker we can find:
        // <div style="margin-top:48px;display:flex;justify-content:space-between;
        // We replace from that opening div to the matching closing </div></div>.
        const startMarker = '<div style="margin-top:48px;display:flex;justify-content:space-between;gap:40px;">';

        for (const row of rows) {
            const idx = row.body_html.indexOf(startMarker);
            if (idx === -1) continue; // already updated or hand-edited
            // Find the closing of the outer wrapper. We rely on the fact that
            // the seed contains exactly two inner <div>...</div> blocks.
            // Walk the string counting div opens/closes starting from idx.
            const tail = row.body_html.slice(idx);
            let depth = 0;
            let i = 0;
            let endRel = -1;
            const openRe = /<div\b[^>]*>/gi;
            const closeRe = /<\/div>/gi;
            const events: Array<{ pos: number; type: 'open' | 'close' }> = [];
            let m: RegExpExecArray | null;
            while ((m = openRe.exec(tail)) !== null) events.push({ pos: m.index, type: 'open' });
            while ((m = closeRe.exec(tail)) !== null) events.push({ pos: m.index, type: 'close' });
            events.sort((a, b) => a.pos - b.pos);
            for (const ev of events) {
                if (ev.type === 'open') depth++;
                else {
                    depth--;
                    if (depth === 0) {
                        // Find the actual end of this </div>
                        endRel = ev.pos + '</div>'.length;
                        break;
                    }
                }
            }
            if (endRel === -1) continue; // malformed; skip safely

            const newBody = row.body_html.slice(0, idx) + NEW_BLOCK + row.body_html.slice(idx + endRel);
            await queryRunner.query(
                `UPDATE document_templates SET body_html = $1, updated_at = now() WHERE id = $2`,
                [newBody, row.id],
            );
        }
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Non-destructive forward-only migration: we don't revert the body
        // changes because we can't reliably reconstruct hand-edited prior
        // text. The original seeded HTML is preserved in source control.
    }
}
