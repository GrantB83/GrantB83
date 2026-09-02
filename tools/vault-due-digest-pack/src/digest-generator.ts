/**
 * Digest generator - creates DIGEST.md from entity pack data
 */

import type { DigestData, EntityPack } from './types.js';

export function generateDigest(data: DigestData): string {
  const lines: string[] = [];
  
  lines.push('# Vault Due Digest\n');
  lines.push(`**Generated:** ${data.generatedAt}`);
  lines.push(`**Mode:** ${data.mode}`);
  lines.push(`**Total Items:** ${data.totalItems}\n`);
  
  if (data.warnings.length > 0) {
    lines.push('## ⚠️ Warnings\n');
    data.warnings.forEach((warning, idx) => {
      lines.push(`${idx + 1}. ${warning}`);
    });
    lines.push('');
  }
  
  lines.push('## Overview by Entity\n');
  
  const entityNames: Record<string, string> = {
    'gab-trust': 'GAB Trust',
    'b-group': 'B Group Holdings',
    'cipc': 'CIPC',
    'sars': 'SARS',
    'plimmer': 'Plimmer',
    'charisse': 'Charisse',
    'unknown': 'Unknown Entity',
  };
  
  let itemNumber = 1;
  
  // Iterate over entity packs
  data.entityPacks.forEach((pack) => {
    if (pack.count === 0) return;
    
    const entityDisplayName = entityNames[pack.entity] || pack.entity;
    lines.push(`### ${entityDisplayName} (${pack.count} items)\n`);
    
    // For digest, we just list the entity and count
    // The actual items are in the entity pack files
    lines.push(`${itemNumber}. See \`${pack.packPath}\` for details`);
    lines.push(`   - ${pack.count} item${pack.count !== 1 ? 's' : ''} requiring review\n`);
    
    itemNumber++;
  });
  
  lines.push('## Next Steps\n');
  lines.push('1. Review entity packs in `by-entity/` subdirectories');
  lines.push('2. Check `missing-signals.md` for files without category or date hints');
  lines.push('3. Review `APPROVAL.md` for safety gates and Vault ownership rules');
  lines.push('4. Vault owns all research and next actions — never auto-submit to CIPC/SARS\n');
  
  return lines.join('\n');
}

export function generateMissingSignals(missingCount: number): string {
  const lines: string[] = [];
  
  lines.push('# Missing Signals Report\n');
  
  if (missingCount > 0) {
    lines.push(`Files without category or date signals: **${missingCount}**\n`);
    lines.push('See individual entity packs for items marked with low confidence or missing signals.\n');
    lines.push('## Recommendations\n');
    lines.push('1. Review filenames for entity and due date keywords');
    lines.push('2. Check `by-entity/unknown/pack.md` for unclassified items');
    lines.push('3. Consider manual research for files without clear signals');
  } else {
    lines.push('✅ All files have category and/or date signals.\n');
  }
  
  return lines.join('\n');
}

export function generateApproval(): string {
  const lines: string[] = [];
  
  lines.push('# APPROVAL — Vault Due Digest Pack\n');
  lines.push('## Safety Rules\n');
  lines.push('- ✅ **Filename heuristics only** — No file bodies opened');
  lines.push('- ✅ **No invented dates** — Date tokens from source queue/filenames only');
  lines.push('- ✅ **No invented amounts** — This tool never handles monetary values');
  lines.push('- ✅ **No legal positions** — Category and entity classification is heuristic guidance only');
  lines.push('- ✅ **Offline only** — No APIs or network calls');
  lines.push('- ✅ **Read-only** — Never modifies files\n');
  
  lines.push('## Vault Ownership\n');
  lines.push('Vault owns all research and next actions on CIPC/SARS/trust documents:\n');
  lines.push('- **Never auto-submit** — All CIPC/SARS filings require human approval (N2 gate)');
  lines.push('- **Never post figures in chat** — Amounts stay in files, never in prose');
  lines.push('- **Research only** — This digest is for Vault weekday ops research workflow');
  lines.push('- **No bulk operations** — Never bulk-move, bulk-label, or bulk-file without approval\n');
  
  lines.push('## Before Using This Digest\n');
  lines.push('1. Review all entity packs for accuracy');
  lines.push('2. Confirm due dates against source documents (when available)');
  lines.push('3. Get N2 approval before any CIPC/SARS submissions');
  lines.push('4. Keep all amounts and sensitive data in files, not in chat\n');
  
  return lines.join('\n');
}
