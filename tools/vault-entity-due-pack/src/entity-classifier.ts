import { EntitySlug, EntityMappings, EntityPackItem } from './types.js';

const DEFAULT_ENTITY_KEYWORDS: EntityMappings = {
  // GAB Trust
  'gab': 'gab-trust',
  'trust': 'gab-trust',
  'gabtrust': 'gab-trust',
  'gab-trust': 'gab-trust',
  
  // B Group Holdings
  'b group': 'b-group',
  'bgroup': 'b-group',
  'b-group': 'b-group',
  'holdings': 'b-group',
  'bvr': 'b-group',
  
  // CIPC
  'cipc': 'cipc',
  
  // SARS
  'sars': 'sars',
  'tax': 'sars',
  
  // Plimmer
  'plimmer': 'plimmer',
  
  // Charisse
  'charisse': 'charisse'
};

export function classifyEntity(
  filename: string,
  customMappings?: EntityMappings
): EntitySlug {
  const mappings = customMappings || DEFAULT_ENTITY_KEYWORDS;
  const lowerFilename = filename.toLowerCase();
  
  for (const [keyword, entity] of Object.entries(mappings)) {
    if (lowerFilename.includes(keyword.toLowerCase())) {
      return entity;
    }
  }
  
  return 'unknown';
}

export function groupByEntity(
  items: EntityPackItem[],
  customMappings?: EntityMappings
): Map<EntitySlug, EntityPackItem[]> {
  const groups = new Map<EntitySlug, EntityPackItem[]>();
  
  // Initialize all entity groups
  const entities: EntitySlug[] = [
    'gab-trust',
    'b-group',
    'cipc',
    'sars',
    'plimmer',
    'charisse',
    'unknown'
  ];
  
  entities.forEach(entity => groups.set(entity, []));
  
  // Group items by entity
  items.forEach(item => {
    const entity = classifyEntity(item.filename, customMappings);
    groups.get(entity)!.push(item);
  });
  
  return groups;
}
