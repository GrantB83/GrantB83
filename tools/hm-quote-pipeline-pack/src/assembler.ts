/**
 * hm-quote-pipeline-pack Assembler
 * 
 * Orchestrates Heavy Metal quote pipeline tools into one pack
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type {
  CliOptions,
  PackResult,
  PackManifest,
  Quote,
  PodData,
  MissingFieldsSummary
} from './types.js';

/**
 * Assemble the pack
 */
export async function assemblePack(options: CliOptions): Promise<PackResult> {
  const warnings: string[] = [];
  const outdir = path.resolve(options.outdir!);

  // Create output directory
  if (!fs.existsSync(outdir)) {
    fs.mkdirSync(outdir, { recursive: true });
  }

  const manifest: PackManifest = {
    tool: 'hm-quote-pipeline-pack',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    packDate: new Date().toISOString().split('T')[0],
    inputs: {
      textPath: options.text || null,
      quotePath: options.quote || null,
      quoteOutdirPath: options.quoteOutdir || null,
      podOutdirPath: options.podOutdir || null,
      podDraftOutdirPath: options.podDraftOutdir || null,
      notes: options.notes || null
    },
    runOptions: {
      ranIntake: options.runIntake || false,
      ranMap: options.runMap || false,
      ranPod: options.runPod || false
    },
    outputs: [],
    checks: {
      hasQuote: false,
      hasPod: false,
      hasPodDraft: false,
      hasApproval: false
    }
  };

  // Track paths to quote/pod data
  let quotePath: string | null = null;
  let podPath: string | null = null;
  let podDraftPath: string | null = null;

  // Step 1: Get or generate quote.json
  if (options.runIntake) {
    if (!options.text) {
      throw new Error('--text is required when using --run-intake');
    }
    quotePath = await runIntakeTool(options.text, warnings);
  } else if (options.quote) {
    quotePath = path.resolve(options.quote);
    if (!fs.existsSync(quotePath)) {
      throw new Error(`Quote file not found: ${quotePath}`);
    }
  } else if (options.quoteOutdir) {
    const searchPath = path.resolve(options.quoteOutdir);
    quotePath = path.join(searchPath, 'quote.json');
    if (!fs.existsSync(quotePath)) {
      throw new Error(`quote.json not found in: ${searchPath}`);
    }
  } else {
    warnings.push('No quote input provided (--quote, --quote-outdir, or --run-intake)');
  }

  // Step 2: Get or generate pod.json
  if (quotePath) {
    if (options.runMap) {
      podPath = await runMapTool(quotePath, options.notes, warnings);
    } else if (options.podOutdir) {
      const searchPath = path.resolve(options.podOutdir);
      podPath = path.join(searchPath, 'pod.json');
      if (!fs.existsSync(podPath)) {
        warnings.push(`pod.json not found in: ${searchPath}`);
      }
    }
  }

  // Step 3: Get or generate pod draft
  if (podPath && fs.existsSync(podPath)) {
    if (options.runPod) {
      podDraftPath = await runPodDraftTool(podPath, warnings);
    } else if (options.podDraftOutdir) {
      const searchPath = path.resolve(options.podDraftOutdir);
      podDraftPath = path.join(searchPath, 'pod.md');
      if (!fs.existsSync(podDraftPath)) {
        warnings.push(`pod.md not found in: ${searchPath}`);
      }
    }
  }

  // Copy files to pack directory
  const quoteData = quotePath && fs.existsSync(quotePath) 
    ? JSON.parse(fs.readFileSync(quotePath, 'utf-8')) as Quote
    : null;
  
  const podData = podPath && fs.existsSync(podPath)
    ? JSON.parse(fs.readFileSync(podPath, 'utf-8')) as PodData
    : null;

  if (quotePath && fs.existsSync(quotePath)) {
    fs.copyFileSync(quotePath, path.join(outdir, 'quote.json'));
    manifest.outputs.push('quote.json');
    manifest.checks.hasQuote = true;
  }

  if (podPath && fs.existsSync(podPath)) {
    fs.copyFileSync(podPath, path.join(outdir, 'pod.json'));
    manifest.outputs.push('pod.json');
    manifest.checks.hasPod = true;
  }

  if (podDraftPath && fs.existsSync(podDraftPath)) {
    fs.copyFileSync(podDraftPath, path.join(outdir, 'pod.md'));
    manifest.outputs.push('pod.md');
    manifest.checks.hasPodDraft = true;
  }

  // Generate missing fields summary
  const missingFields = analyzeMissingFields(quoteData, podData);

  // Generate PACK.md
  const packMd = generatePackMd(quoteData, podData, missingFields, warnings);
  fs.writeFileSync(path.join(outdir, 'PACK.md'), packMd);
  manifest.outputs.push('PACK.md');

  // Generate APPROVAL.md
  const approvalMd = generateApprovalMd(quoteData, podData, missingFields);
  fs.writeFileSync(path.join(outdir, 'APPROVAL.md'), approvalMd);
  manifest.outputs.push('APPROVAL.md');
  manifest.checks.hasApproval = true;

  // Write manifest
  fs.writeFileSync(
    path.join(outdir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  manifest.outputs.push('manifest.json');

  return {
    success: true,
    outdir,
    manifest,
    warnings
  };
}

/**
 * Run hm-quote-intake tool
 */
async function runIntakeTool(textPath: string, warnings: string[]): Promise<string> {
  const intakeDir = path.resolve(__dirname, '../../hm-quote-intake');
  if (!fs.existsSync(intakeDir)) {
    throw new Error('hm-quote-intake tool not found. Ensure sibling tool is installed.');
  }

  const tempOut = path.join(intakeDir, 'out', `intake-${Date.now()}`);
  
  try {
    execSync(
      `cd "${intakeDir}" && npm run intake -- --text "${path.resolve(textPath)}" --outdir "${tempOut}"`,
      { stdio: 'inherit' }
    );
    
    const quotePath = path.join(tempOut, 'quote.json');
    if (!fs.existsSync(quotePath)) {
      throw new Error('hm-quote-intake did not produce quote.json');
    }
    
    return quotePath;
  } catch (error) {
    throw new Error(`Failed to run hm-quote-intake: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run hm-quote-to-pod tool
 */
async function runMapTool(quotePath: string, notes: string | undefined, warnings: string[]): Promise<string> {
  const mapDir = path.resolve(__dirname, '../../hm-quote-to-pod');
  if (!fs.existsSync(mapDir)) {
    throw new Error('hm-quote-to-pod tool not found. Ensure sibling tool is installed.');
  }

  const tempOut = path.join(mapDir, 'out', `map-${Date.now()}`);
  const notesArg = notes ? `--notes "${notes}"` : '';
  
  try {
    execSync(
      `cd "${mapDir}" && npm run map -- --quote "${path.resolve(quotePath)}" --outdir "${tempOut}" ${notesArg}`,
      { stdio: 'inherit' }
    );
    
    const podPath = path.join(tempOut, 'pod.json');
    if (!fs.existsSync(podPath)) {
      throw new Error('hm-quote-to-pod did not produce pod.json');
    }
    
    return podPath;
  } catch (error) {
    throw new Error(`Failed to run hm-quote-to-pod: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Run hm-delivery-pod-draft tool
 */
async function runPodDraftTool(podPath: string, warnings: string[]): Promise<string> {
  const draftDir = path.resolve(__dirname, '../../hm-delivery-pod-draft');
  if (!fs.existsSync(draftDir)) {
    throw new Error('hm-delivery-pod-draft tool not found. Ensure sibling tool is installed.');
  }

  const tempOut = path.join(draftDir, 'out', `pod-${Date.now()}`);
  
  try {
    execSync(
      `cd "${draftDir}" && npm run draft -- --pod "${path.resolve(podPath)}" --outdir "${tempOut}"`,
      { stdio: 'inherit' }
    );
    
    const podMdPath = path.join(tempOut, 'pod.md');
    if (!fs.existsSync(podMdPath)) {
      throw new Error('hm-delivery-pod-draft did not produce pod.md');
    }
    
    return podMdPath;
  } catch (error) {
    throw new Error(`Failed to run hm-delivery-pod-draft: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Analyze missing fields
 */
function analyzeMissingFields(
  quote: Quote | null,
  pod: PodData | null
): MissingFieldsSummary {
  const quoteFields: string[] = [];
  const podFields: string[] = [];

  if (quote) {
    if (!quote.customerName) quoteFields.push('customerName');
    if (!quote.customerPhone) quoteFields.push('customerPhone');
    if (!quote.materials || quote.materials.length === 0) quoteFields.push('materials');
    if (quote.volume === undefined) quoteFields.push('volume');
    if (!quote.volumeUnit) quoteFields.push('volumeUnit');
    if (!quote.deliveryLocation) quoteFields.push('deliveryLocation');
    if (!quote.dateNeeded) quoteFields.push('dateNeeded');
  }

  if (pod) {
    if (!pod.customer) podFields.push('customer');
    if (!pod.phone) podFields.push('phone');
    if (!pod.material) podFields.push('material');
    if (pod.volume === undefined) podFields.push('volume');
    if (!pod.unit) podFields.push('unit');
    if (!pod.deliveryLocation) podFields.push('deliveryLocation');
    if (!pod.vehicle) podFields.push('vehicle');
    if (!pod.driver) podFields.push('driver');
  }

  // Critical if volume, location, or material missing
  const critical = 
    quoteFields.includes('volume') ||
    quoteFields.includes('materials') ||
    quoteFields.includes('deliveryLocation') ||
    podFields.includes('volume') ||
    podFields.includes('material') ||
    podFields.includes('deliveryLocation');

  return { quoteFields, podFields, critical };
}

/**
 * Generate PACK.md
 */
function generatePackMd(
  quote: Quote | null,
  pod: PodData | null,
  missingFields: MissingFieldsSummary,
  warnings: string[]
): string {
  let md = `# Heavy Metal Quote Pipeline Pack\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `**Purpose:** SA Ops / Heavy Metal orchestrated pack for single inquiry.\n\n`;
  
  md += `---\n\n`;
  md += `## Pack Contents\n\n`;
  
  if (quote) {
    md += `### ✅ Quote Data\n\n`;
    md += `- **Customer:** ${quote.customerName || '_Missing_'}\n`;
    md += `- **Phone:** ${quote.customerPhone || '_Missing_'}\n`;
    md += `- **Material:** ${quote.materials?.join(', ') || '_Missing_'}\n`;
    md += `- **Volume:** ${quote.volume !== undefined ? `${quote.volume} ${quote.volumeUnit || ''}` : '_Missing_'}\n`;
    md += `- **Location:** ${quote.deliveryLocation || '_Missing_'}\n`;
    md += `- **Date Needed:** ${quote.dateNeeded || '_Missing_'}\n`;
    
    if (quote.pricePerUnit || quote.totalPrice) {
      md += `- **Pricing:** `;
      if (quote.pricePerUnit) md += `${quote.pricePerUnit} per ${quote.volumeUnit || 'unit'}`;
      if (quote.totalPrice) md += ` (Total: ${quote.totalPrice})`;
      if (quote.currency) md += ` ${quote.currency}`;
      md += `\n`;
    }
    
    md += `\n`;
  } else {
    md += `### ⚠️ No Quote Data\n\n`;
  }
  
  if (pod) {
    md += `### ✅ POD Data\n\n`;
    md += `- **Customer:** ${pod.customer || '_Missing_'}\n`;
    md += `- **Material:** ${pod.material || '_Missing_'}\n`;
    md += `- **Volume:** ${pod.volume !== undefined ? `${pod.volume} ${pod.unit || ''}` : '_Missing_'}\n`;
    md += `- **Location:** ${pod.deliveryLocation || '_Missing_'}\n`;
    md += `- **Vehicle:** ${pod.vehicle || '_Not Set_'}\n`;
    md += `- **Driver:** ${pod.driver || '_Not Set_'}\n`;
    md += `- **Signed By:** ${pod.signedBy || '_Not Signed_'}\n\n`;
  } else {
    md += `### ⚠️ No POD Data\n\n`;
  }

  md += `---\n\n`;
  md += `## Missing Fields\n\n`;

  if (missingFields.critical) {
    md += `⚠️ **CRITICAL MISSING FIELDS** - Cannot proceed without these:\n\n`;
  }

  if (missingFields.quoteFields.length > 0) {
    md += `**Quote Fields:**\n`;
    missingFields.quoteFields.forEach(f => md += `- ${f}\n`);
    md += `\n`;
  } else if (quote) {
    md += `**Quote Fields:** ✅ All required fields present\n\n`;
  }

  if (missingFields.podFields.length > 0) {
    md += `**POD Fields:**\n`;
    missingFields.podFields.forEach(f => md += `- ${f}\n`);
    md += `\n`;
  } else if (pod) {
    md += `**POD Fields:** ✅ All fields present\n\n`;
  }

  if (warnings.length > 0) {
    md += `---\n\n`;
    md += `## Warnings\n\n`;
    warnings.forEach(w => md += `- ${w}\n`);
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Next Steps\n\n`;
  md += `1. Review this pack index\n`;
  md += `2. Fill any missing fields in quote.json or pod.json\n`;
  md += `3. Read APPROVAL.md\n`;
  md += `4. Get approval before any send: \`APPROVE SEND <whatsapp-id>\` (H1)\n`;
  md += `5. WhatsApp stays on CoS - never auto-send\n\n`;

  md += `---\n\n`;
  md += `**Tool:** hm-quote-pipeline-pack v1.0.0  \n`;
  md += `**Lane:** heavy-metal  \n`;
  md += `**Entity:** Heavy Metal Sand & Stone, Dullstroom\n`;

  return md;
}

/**
 * Generate APPROVAL.md
 */
function generateApprovalMd(
  quote: Quote | null,
  pod: PodData | null,
  missingFields: MissingFieldsSummary
): string {
  let md = `# Heavy Metal Quote Pipeline - APPROVAL CHECKLIST\n\n`;
  md += `**Read this before proceeding with any quote send.**\n\n`;
  
  md += `---\n\n`;
  md += `## Hard Gates (from docs/automation/approval-gates.md)\n\n`;
  
  md += `### H1 - Quote Send\n\n`;
  md += `☐ **Required approval:** \`APPROVE SEND <whatsapp-id>\`\n\n`;
  md += `Every Heavy Metal quote requires H1 approval before send.\n\n`;

  md += `### lane:heavy-metal Rules\n\n`;
  md += `☐ **Volume confirmed:** ${quote?.volume !== undefined ? '✅ Yes' : '❌ Missing'}\n`;
  md += `☐ **Location confirmed:** ${quote?.deliveryLocation ? '✅ Yes' : '❌ Missing'}\n`;
  md += `☐ **Material confirmed:** ${quote?.materials && quote.materials.length > 0 ? '✅ Yes' : '❌ Missing'}\n\n`;

  md += `### N7 - Never Invent\n\n`;
  md += `☐ **No invented rates:** Pricing only from approved price card\n`;
  md += `☐ **No invented volumes:** All volumes from inquiry or manual entry\n`;
  md += `☐ **No invented locations:** All locations from inquiry or manual entry\n`;
  md += `☐ **No invented signatures:** signedBy field only when delivery actually signed\n\n`;

  md += `---\n\n`;
  md += `## Data Verification\n\n`;

  if (quote) {
    md += `### Quote Data\n\n`;
    md += `- Customer: ${quote.customerName || '⚠️ MISSING'}\n`;
    md += `- Phone: ${quote.customerPhone || '⚠️ MISSING'}\n`;
    md += `- Material: ${quote.materials?.join(', ') || '⚠️ MISSING'}\n`;
    md += `- Volume: ${quote.volume !== undefined ? `${quote.volume} ${quote.volumeUnit || ''}` : '⚠️ MISSING'}\n`;
    md += `- Location: ${quote.deliveryLocation || '⚠️ MISSING'}\n`;
    
    if (quote.pricePerUnit || quote.totalPrice) {
      md += `\n**⚠️ Pricing Present - Verify Against Price Card:**\n`;
      if (quote.pricePerUnit) md += `- Price per unit: ${quote.pricePerUnit} ${quote.currency || ''}\n`;
      if (quote.totalPrice) md += `- Total: ${quote.totalPrice} ${quote.currency || ''}\n`;
    } else {
      md += `\n**No pricing in quote** - Will need to add from price card before send.\n`;
    }
    md += `\n`;
  } else {
    md += `### ⚠️ No Quote Data Available\n\n`;
  }

  if (pod) {
    md += `### POD Data (if applicable)\n\n`;
    md += `- Customer: ${pod.customer || '⚠️ MISSING'}\n`;
    md += `- Material: ${pod.material || '⚠️ MISSING'}\n`;
    md += `- Volume: ${pod.volume !== undefined ? `${pod.volume} ${pod.unit || ''}` : '⚠️ MISSING'}\n`;
    md += `- Location: ${pod.deliveryLocation || '⚠️ MISSING'}\n`;
    md += `- Signed By: ${pod.signedBy || '_Not signed (OK if delivery incomplete)_'}\n\n`;
  }

  if (missingFields.critical) {
    md += `---\n\n`;
    md += `## ⚠️ CRITICAL MISSING FIELDS\n\n`;
    md += `**Cannot proceed until these are filled:**\n\n`;
    
    const criticalFields = [
      ...missingFields.quoteFields.filter(f => 
        f === 'volume' || f === 'materials' || f === 'deliveryLocation'
      ),
      ...missingFields.podFields.filter(f =>
        f === 'volume' || f === 'material' || f === 'deliveryLocation'
      )
    ];
    
    criticalFields.forEach(f => md += `- ${f}\n`);
    md += `\n`;
  }

  md += `---\n\n`;
  md += `## Safety Reminders\n\n`;
  md += `- ✅ **Offline only** - This tool makes no API calls\n`;
  md += `- ✅ **Never auto-send** - WhatsApp send requires H1 approval\n`;
  md += `- ✅ **WhatsApp on CoS** - Coexistence of Service owns send path\n`;
  md += `- ✅ **No rate invention** - All pricing from approved price card\n`;
  md += `- ✅ **Confirm volume + location** - Before every quote (lane:heavy-metal rule)\n`;
  md += `- ⚠️ **H1 gate required** - \`APPROVE SEND <whatsapp-id>\` before any send\n\n`;

  md += `---\n\n`;
  md += `## Approval\n\n`;
  md += `☐ All hard gates checked\n`;
  md += `☐ Volume + location confirmed\n`;
  md += `☐ No invented rates/volumes/locations\n`;
  md += `☐ Missing fields filled (if applicable)\n`;
  md += `☐ H1 approval obtained: \`APPROVE SEND <whatsapp-id>\`\n`;
  md += `☐ Ready to proceed with quote send via CoS\n\n`;

  md += `---\n\n`;
  md += `**Tool:** hm-quote-pipeline-pack v1.0.0  \n`;
  md += `**Lane:** heavy-metal  \n`;
  md += `**Entity:** Heavy Metal Sand & Stone, Dullstroom  \n`;
  md += `**Approval Gates:** docs/automation/approval-gates.md\n`;

  return md;
}
