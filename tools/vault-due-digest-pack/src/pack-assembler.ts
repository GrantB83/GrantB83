/**
 * Pack assembler - collects entity pack data and missing signals
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { DigestData, EntityPack, QueueData } from './types.js';

export function assembleDigestData(
  entityPackDir: string,
  queueData: QueueData | null,
  mode: 'queue' | 'filenames',
  inputPath: string
): DigestData {
  const warnings: string[] = [];
  const entityPacks: EntityPack[] = [];
  const byEntity: Record<string, number> = {};
  let totalItems = 0;
  let unknownCount = 0;
  
  // Read entity packs from by-entity subdirectory
  const byEntityDir = join(entityPackDir, 'by-entity');
  
  if (!existsSync(byEntityDir)) {
    warnings.push('No entity packs found in by-entity/ subdirectory');
    return {
      generatedAt: new Date().toISOString(),
      mode,
      inputPath,
      totalItems: 0,
      byEntity: {},
      entityPacks: [],
      unknownCount: 0,
      warnings,
    };
  }
  
  // Iterate through entity directories
  const entities = readdirSync(byEntityDir).filter((name) => {
    const entityPath = join(byEntityDir, name);
    return statSync(entityPath).isDirectory();
  });
  
  entities.forEach((entity) => {
    const packPath = join(byEntityDir, entity, 'pack.md');
    const itemsPath = join(byEntityDir, entity, 'items.json');
    
    if (!existsSync(itemsPath)) {
      warnings.push(`Missing items.json for entity: ${entity}`);
      return;
    }
    
    try {
      const itemsData = JSON.parse(readFileSync(itemsPath, 'utf-8'));
      const count = itemsData.count || 0;
      
      byEntity[entity] = count;
      totalItems += count;
      
      if (entity === 'unknown') {
        unknownCount = count;
      }
      
      entityPacks.push({
        entity,
        count,
        packPath: `by-entity/${entity}/pack.md`,
        itemsPath: `by-entity/${entity}/items.json`,
      });
    } catch (err: any) {
      warnings.push(`Failed to read items.json for ${entity}: ${err.message}`);
    }
  });
  
  // Sort entity packs by count descending (but keep unknown last)
  entityPacks.sort((a, b) => {
    if (a.entity === 'unknown') return 1;
    if (b.entity === 'unknown') return -1;
    return b.count - a.count;
  });
  
  return {
    generatedAt: new Date().toISOString(),
    mode,
    inputPath,
    totalItems,
    byEntity,
    entityPacks,
    unknownCount,
    warnings,
  };
}

export function countMissingSignals(queueData: QueueData | null): number {
  if (!queueData) return 0;
  
  return queueData.entries.filter((entry) => {
    return (
      entry.dueStatus === 'no-date-pattern' ||
      entry.confidence === 'low' ||
      entry.category === 'unknown'
    );
  }).length;
}
