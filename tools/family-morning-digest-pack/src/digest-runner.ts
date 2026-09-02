/**
 * Digest runner - shells out to family-school-subject-digest
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Run family-school-subject-digest and return output directory
 */
export async function runSubjectDigest(
  subjectsPath: string,
  date: string,
  timezone: string,
  tempDir: string
): Promise<string> {
  const digestToolDir = path.resolve(process.cwd(), '..', 'family-school-subject-digest');
  
  // Convert paths to absolute
  const absoluteSubjectsPath = path.resolve(subjectsPath);
  const absoluteTempDir = path.resolve(tempDir);
  
  console.log(`  Running family-school-subject-digest...`);
  console.log(`    Tool directory: ${digestToolDir}`);
  
  // Ensure digest tool is built
  if (!fs.existsSync(path.join(digestToolDir, 'dist', 'index.js'))) {
    console.log(`    Building family-school-subject-digest...`);
    try {
      await execAsync('npm run build', { cwd: digestToolDir });
      console.log(`    ✓ Built family-school-subject-digest`);
    } catch (error) {
      throw new Error(`Failed to build family-school-subject-digest: ${error}`);
    }
  }
  
  // Run digest with absolute paths
  const cmd = `npm run digest -- --input "${absoluteSubjectsPath}" --date "${date}" --timezone "${timezone}" --outdir "${absoluteTempDir}"`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: digestToolDir });
    
    // Find the output directory from the output
    const digestDirs = fs.readdirSync(absoluteTempDir).filter(f => f.startsWith('digest-'));
    if (digestDirs.length === 0) {
      throw new Error('family-school-subject-digest did not create output directory');
    }
    
    const outputDir = path.join(absoluteTempDir, digestDirs[0]);
    console.log(`    ✓ Completed: ${outputDir}`);
    
    return outputDir;
  } catch (error) {
    throw new Error(`Failed to run family-school-subject-digest: ${error}`);
  }
}

/**
 * Load items.json from digest output directory
 */
export function loadDigestItems(digestOutputDir: string): any[] {
  const itemsPath = path.join(digestOutputDir, 'items.json');
  
  if (!fs.existsSync(itemsPath)) {
    throw new Error(`items.json not found in digest output: ${digestOutputDir}`);
  }
  
  const content = fs.readFileSync(itemsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Run family-calendar-ics-digest and return output directory
 */
export async function runIcsDigest(
  icsPath: string,
  date: string,
  timezone: string,
  tempDir: string
): Promise<string> {
  const digestToolDir = path.resolve(process.cwd(), '..', 'family-calendar-ics-digest');
  
  // Convert paths to absolute
  const absoluteIcsPath = path.resolve(icsPath);
  const absoluteTempDir = path.resolve(tempDir);
  
  console.log(`  Running family-calendar-ics-digest...`);
  console.log(`    Tool directory: ${digestToolDir}`);
  
  // Ensure digest tool is built
  if (!fs.existsSync(path.join(digestToolDir, 'dist', 'index.js'))) {
    console.log(`    Building family-calendar-ics-digest...`);
    try {
      await execAsync('npm run build', { cwd: digestToolDir });
      console.log(`    ✓ Built family-calendar-ics-digest`);
    } catch (error) {
      throw new Error(`Failed to build family-calendar-ics-digest: ${error}`);
    }
  }
  
  // Run digest with --from and --to derived from single date
  const cmd = `npm run digest -- --ics "${absoluteIcsPath}" --from "${date}" --to "${date}" --timezone "${timezone}" --outdir "${absoluteTempDir}"`;
  
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd: digestToolDir });
    
    // Find the output directory from the output
    const digestDirs = fs.readdirSync(absoluteTempDir).filter(f => f.startsWith('digest-'));
    if (digestDirs.length === 0) {
      throw new Error('family-calendar-ics-digest did not create output directory');
    }
    
    const outputDir = path.join(absoluteTempDir, digestDirs[0]);
    console.log(`    ✓ Completed: ${outputDir}`);
    
    return outputDir;
  } catch (error) {
    throw new Error(`Failed to run family-calendar-ics-digest: ${error}`);
  }
}
