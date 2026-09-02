import { readdir, stat, readFile } from 'fs/promises';
import { join } from 'path';
import type { ToolDirectory } from './types.js';

/**
 * Discover tool directories: immediate subdirs of toolsDir that contain package.json
 */
export async function discoverToolDirectories(toolsDir: string): Promise<ToolDirectory[]> {
  const tools: ToolDirectory[] = [];
  
  try {
    const entries = await readdir(toolsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      
      const toolPath = join(toolsDir, entry.name);
      const packageJsonPath = join(toolPath, 'package.json');
      
      try {
        await stat(packageJsonPath);
        tools.push({
          name: entry.name,
          path: toolPath,
        });
      } catch {
        // No package.json, skip this directory
      }
    }
    
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(`Failed to discover tool directories in ${toolsDir}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
