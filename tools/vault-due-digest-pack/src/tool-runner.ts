/**
 * Tool runner for invoking sibling Vault tools via npm run
 */

import { spawn } from 'child_process';
import { join } from 'path';

export async function runSiblingTool(
  toolName: string,
  args: string[],
  toolsDir: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const toolPath = join(toolsDir, toolName);
    
    // Use npm run (script) approach for consistency
    const scriptName = getScriptName(toolName);
    const child = spawn('npm', ['run', scriptName, '--', ...args], {
      cwd: toolPath,
      stdio: 'inherit',
      shell: true,
    });
    
    child.on('error', (err) => {
      reject(new Error(`Failed to spawn ${toolName}: ${err.message}`));
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${toolName} exited with code ${code}`));
      }
    });
  });
}

function getScriptName(toolName: string): string {
  // Map tool names to their npm script names
  const scriptMap: Record<string, string> = {
    'vault-filename-due-queue': 'queue',
    'vault-entity-due-pack': 'pack',
  };
  
  return scriptMap[toolName] || 'run';
}
