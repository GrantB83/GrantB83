import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { EntitySlug, EntityPackItem, PackResult } from './types.js';

export function buildPackResult(groups: Map<EntitySlug, EntityPackItem[]>): PackResult {
  const summary = {
    totalItems: 0,
    byEntity: {} as Record<EntitySlug, number>
  };
  
  groups.forEach((items, entity) => {
    summary.byEntity[entity] = items.length;
    summary.totalItems += items.length;
  });
  
  return {
    entities: groups,
    summary
  };
}

export function generateEntityPacks(result: PackResult, outputDir: string): void {
  result.entities.forEach((items, entity) => {
    if (items.length === 0) return;
    
    const entityDir = join(outputDir, 'by-entity', entity);
    if (!existsSync(entityDir)) {
      mkdirSync(entityDir, { recursive: true });
    }
    
    // Generate items.json
    const itemsJson = {
      entity,
      count: items.length,
      items: items.map(item => ({
        filename: item.filename,
        category: item.category,
        dateTokens: item.dateTokens,
        dueStatus: item.dueStatus,
        confidence: item.confidence,
        signals: item.signals,
        notes: item.notes
      }))
    };
    
    writeFileSync(
      join(entityDir, 'items.json'),
      JSON.stringify(itemsJson, null, 2)
    );
    
    // Generate pack.md
    const packMd = generatePackMarkdown(entity, items);
    writeFileSync(join(entityDir, 'pack.md'), packMd);
    
    console.log(`  ✓ Entity pack: ${entity} (${items.length} items)`);
  });
}

function generatePackMarkdown(entity: EntitySlug, items: EntityPackItem[]): string {
  const lines: string[] = [];
  
  lines.push(`# ${formatEntityName(entity)} Research Pack`);
  lines.push('');
  lines.push(`**Entity:** ${entity}`);
  lines.push(`**Total Items:** ${items.length}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  
  lines.push('## Items');
  lines.push('');
  
  items.forEach((item, idx) => {
    lines.push(`### ${idx + 1}. ${item.filename}`);
    if (item.category) {
      lines.push(`- **Category:** ${item.category}`);
    }
    if (item.dateTokens && item.dateTokens.length > 0) {
      lines.push(`- **Date Tokens:** ${item.dateTokens.join(', ')}`);
    }
    if (item.dueStatus) {
      lines.push(`- **Due Status:** ${item.dueStatus}`);
    }
    if (item.confidence) {
      lines.push(`- **Confidence:** ${item.confidence}`);
    }
    if (item.notes) {
      lines.push(`- **Notes:** ${item.notes}`);
    }
    lines.push('');
  });
  
  return lines.join('\n');
}

function formatEntityName(entity: EntitySlug): string {
  const names: Record<EntitySlug, string> = {
    'gab-trust': 'GAB Trust',
    'b-group': 'B Group Holdings',
    'cipc': 'CIPC',
    'sars': 'SARS',
    'plimmer': 'Plimmer',
    'charisse': 'Charisse',
    'unknown': 'Unknown Entity'
  };
  return names[entity];
}

export function generateMasterMarkdown(result: PackResult, outputDir: string): void {
  const lines: string[] = [];
  
  lines.push('# Vault Entity Due Pack - Master Overview');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total Items:** ${result.summary.totalItems}`);
  lines.push('');
  
  lines.push('## Entity Counts');
  lines.push('');
  
  const sortedEntities = Object.entries(result.summary.byEntity)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  sortedEntities.forEach(([entity, count]) => {
    lines.push(`- **${formatEntityName(entity as EntitySlug)}:** ${count} items`);
  });
  
  lines.push('');
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review entity packs in `by-entity/` subdirectories');
  lines.push('2. Check `unknown.md` for unclassified items');
  lines.push('3. Review `APPROVAL.md` for safety gates');
  lines.push('');
  lines.push('## Entity Pack Locations');
  lines.push('');
  
  sortedEntities.forEach(([entity]) => {
    lines.push(`- \`by-entity/${entity}/pack.md\``);
  });
  
  writeFileSync(join(outputDir, 'master.md'), lines.join('\n'));
  console.log(`  ✓ Master overview: master.md`);
}

export function generateUnknownMarkdown(result: PackResult, outputDir: string): void {
  const unknownItems = result.entities.get('unknown') || [];
  
  const lines: string[] = [];
  lines.push('# Unknown Entity Items');
  lines.push('');
  lines.push(`**Count:** ${unknownItems.length}`);
  lines.push('');
  
  if (unknownItems.length === 0) {
    lines.push('No unmatched items. All filenames were successfully classified.');
  } else {
    lines.push('The following filenames could not be matched to any entity:');
    lines.push('');
    
    unknownItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. \`${item.filename}\``);
      if (item.category) {
        lines.push(`   - Category: ${item.category}`);
      }
      if (item.dateTokens && item.dateTokens.length > 0) {
        lines.push(`   - Date Tokens: ${item.dateTokens.join(', ')}`);
      }
      lines.push('');
    });
    
    lines.push('## Recommendations');
    lines.push('');
    lines.push('- Review filenames for entity keywords');
    lines.push('- Consider adding custom entity mappings with `--entities` option');
    lines.push('- Manually classify if entity cannot be determined from filename');
  }
  
  writeFileSync(join(outputDir, 'unknown.md'), lines.join('\n'));
  console.log(`  ✓ Unknown items: unknown.md (${unknownItems.length} items)`);
}

export function generateApprovalMarkdown(outputDir: string): void {
  const lines: string[] = [];
  
  lines.push('# APPROVAL — Vault Entity Due Pack');
  lines.push('');
  lines.push('## Safety Rules');
  lines.push('');
  lines.push('- ✅ **Filename heuristics only** — No file bodies opened');
  lines.push('- ✅ **No invented dates** — Date tokens from source queue only');
  lines.push('- ✅ **No invented amounts** — This tool never handles monetary values');
  lines.push('- ✅ **No legal positions** — Entity classification is heuristic guidance only');
  lines.push('');
  lines.push('## Vault Ownership');
  lines.push('');
  lines.push('Vault owns all research and next actions on CIPC/SARS/trust documents:');
  lines.push('');
  lines.push('- **Never auto-submit** — All CIPC/SARS filings require human approval (N2 gate)');
  lines.push('- **Never post figures in chat** — Amounts stay in files, never in prose');
  lines.push('- **Research only** — This pack is for Vault weekday ops research workflow');
  lines.push('');
  lines.push('## H-Gate: Vault Research Pack');
  lines.push('');
  lines.push('This pack is generated for Vault research purposes only.');
  lines.push('');
  lines.push('**Approval workflow:**');
  lines.push('1. Review entity packs by-entity subdirectories');
  lines.push('2. Verify entity classifications are reasonable');
  lines.push('3. Check unknown.md for unmatched items');
  lines.push('4. Proceed with Vault research on identified documents');
  lines.push('');
  lines.push('**Never:**');
  lines.push('- Auto-submit CIPC or SARS forms (N2 gate)');
  lines.push('- Quote amounts or figures in chat messages');
  lines.push('- Make legal or tax positions based on filename heuristics');
  
  writeFileSync(join(outputDir, 'APPROVAL.md'), lines.join('\n'));
  console.log(`  ✓ Approval gates: APPROVAL.md`);
}

export function generateManifest(
  result: PackResult,
  outputDir: string,
  mode: 'queue' | 'filenames',
  inputPath: string
): void {
  const manifest = {
    generatedAt: new Date().toISOString(),
    mode,
    inputPath,
    summary: result.summary,
    entityPacks: Array.from(result.entities.entries())
      .filter(([_, items]) => items.length > 0)
      .map(([entity, items]) => ({
        entity,
        count: items.length,
        packPath: `by-entity/${entity}/pack.md`
      }))
  };
  
  writeFileSync(
    join(outputDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`  ✓ Manifest: manifest.json`);
}
