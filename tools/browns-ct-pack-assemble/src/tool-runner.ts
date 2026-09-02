/**
 * Tool runner for invoking sibling tools via npm run
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
    'browns-nightsbridge-bookings-adapter': 'adapt',
    'browns-booking-change-check': 'check',
    'browns-daily-ops-brief': 'brief',
    'browns-guest-comms-draft': 'draft',
    'browns-late-checkin-queue': 'queue',
    'browns-welcome-draft-pack': 'draft-pack',
  };
  
  return scriptMap[toolName] || 'run';
}
