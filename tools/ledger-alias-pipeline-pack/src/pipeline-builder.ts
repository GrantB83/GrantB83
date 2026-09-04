/**
 * Pipeline builder for ledger-alias-pipeline-pack
 * 
 * Orchestrates ledger-merchant-alias-suggest → ledger-alias-apply-checklist
 * into a single offline pipeline pack with PACK.md + manifest.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import type { PipelineManifest, AssembleResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build pipeline pack from existing suggest output
 */
export function buildPipelineFromSuggestOutput(
  suggestOutdir: string,
  runApplyChecklist: boolean,
  outdir: string,
  month: string | null
): AssembleResult {
  console.log(`📂 Using existing suggest output: ${suggestOutdir}`);
  
  // Validate suggest output directory
  if (!fs.existsSync(suggestOutdir)) {
    return {
      success: false,
      message: `Suggest output directory not found: ${suggestOutdir}`,
      outdir,
      files: []
    };
  }
  
  const suggestionsJson = path.join(suggestOutdir, 'suggestions.json');
  if (!fs.existsSync(suggestionsJson)) {
    return {
      success: false,
      message: `suggestions.json not found in ${suggestOutdir}`,
      outdir,
      files: []
    };
  }
  
  return assemblePipelinePack(suggestOutdir, runApplyChecklist, outdir, month, false);
}

/**
 * Build pipeline pack by running suggest first
 */
export function buildPipelineWithSuggest(
  unmatchedQueue: string | undefined,
  merchants: string | undefined,
  aliases: string,
  runApplyChecklist: boolean,
  outdir: string,
  month: string | null
): AssembleResult {
  console.log('🔨 Running ledger-merchant-alias-suggest...');
  
  // Validate inputs
  if (!unmatchedQueue && !merchants) {
    return {
      success: false,
      message: 'Either --unmatched-queue or --merchants is required for --run-suggest',
      outdir,
      files: []
    };
  }
  
  if (!aliases) {
    return {
      success: false,
      message: '--aliases is required for --run-suggest',
      outdir,
      files: []
    };
  }
  
  // Create temporary directory for suggest output
  const tempSuggestDir = path.join(outdir, 'temp-suggest-output');
  fs.mkdirSync(tempSuggestDir, { recursive: true });
  
  try {
    // Build suggest command
    const suggestToolDir = path.resolve(__dirname, '../../ledger-merchant-alias-suggest');
    let suggestCmd = `cd ${suggestToolDir} && npm run suggest -- --outdir ${tempSuggestDir} --aliases ${aliases}`;
    
    if (unmatchedQueue) {
      suggestCmd += ` --unmatched ${unmatchedQueue}`;
    } else if (merchants) {
      suggestCmd += ` --merchants ${merchants}`;
    }
    
    // Run suggest tool
    console.log(`  Command: ${suggestCmd}`);
    execSync(suggestCmd, { stdio: 'inherit' });
    
    console.log('✅ Suggest completed\n');
    
    // Assemble pipeline pack
    return assemblePipelinePack(tempSuggestDir, runApplyChecklist, outdir, month, true);
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to run ledger-merchant-alias-suggest: ${error instanceof Error ? error.message : String(error)}`,
      outdir,
      files: []
    };
  }
}

/**
 * Assemble pipeline pack from suggest output
 */
function assemblePipelinePack(
  suggestOutdir: string,
  runApplyChecklist: boolean,
  outdir: string,
  month: string | null,
  suggestRan: boolean
): AssembleResult {
  console.log('📦 Assembling pipeline pack...');
  
  // Create output directory
  const packDir = month 
    ? path.join(outdir, `ledger-alias-pack-${month}`)
    : path.join(outdir, 'ledger-alias-pack');
  fs.mkdirSync(packDir, { recursive: true });
  
  const generatedFiles: string[] = [];
  
  // Copy suggest outputs
  console.log('  Copying suggest outputs...');
  const suggestFiles = [
    'suggestions.json',
    'suggestions.md',
    'no-match.md',
    'APPROVAL.md'
  ];
  
  for (const file of suggestFiles) {
    const srcPath = path.join(suggestOutdir, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(packDir, file);
      fs.copyFileSync(srcPath, destPath);
      generatedFiles.push(file);
      console.log(`    ✓ ${file}`);
    } else {
      console.log(`    ⚠ ${file} not found (skipping)`);
    }
  }
  
  // Run apply-checklist if requested
  let checklistFiles: string[] = [];
  if (runApplyChecklist) {
    console.log('\n🔨 Running ledger-alias-apply-checklist...');
    
    try {
      const checklistToolDir = path.resolve(__dirname, '../../ledger-alias-apply-checklist');
      const suggestionsJson = path.join(suggestOutdir, 'suggestions.json');
      const noMatchMd = path.join(suggestOutdir, 'no-match.md');
      
      const tempChecklistDir = path.join(outdir, 'temp-checklist-output');
      fs.mkdirSync(tempChecklistDir, { recursive: true });
      
      let checklistCmd = `cd ${checklistToolDir} && npm run apply -- --suggestions ${suggestionsJson} --outdir ${tempChecklistDir}`;
      
      if (fs.existsSync(noMatchMd)) {
        checklistCmd += ` --no-match ${noMatchMd}`;
      }
      
      if (month) {
        checklistCmd += ` --month ${month}`;
      }
      
      console.log(`  Command: ${checklistCmd}`);
      execSync(checklistCmd, { stdio: 'inherit' });
      
      console.log('✅ Apply-checklist completed\n');
      
      // Copy checklist outputs
      console.log('  Copying checklist outputs...');
      const checklistFileList = [
        'APPLY-CHECKLIST.md',
        'SKIPPED.md',
        'APPROVAL.md'
      ];
      
      for (const file of checklistFileList) {
        const srcPath = path.join(tempChecklistDir, file);
        if (fs.existsSync(srcPath)) {
          // Rename APPROVAL.md to APPROVAL-CHECKLIST.md to avoid conflict
          const destFile = file === 'APPROVAL.md' ? 'APPROVAL-CHECKLIST.md' : file;
          const destPath = path.join(packDir, destFile);
          fs.copyFileSync(srcPath, destPath);
          checklistFiles.push(destFile);
          generatedFiles.push(destFile);
          console.log(`    ✓ ${destFile}`);
        }
      }
      
      // Clean up temp checklist directory
      fs.rmSync(tempChecklistDir, { recursive: true, force: true });
      
    } catch (error) {
      console.error(`⚠ Failed to run apply-checklist: ${error instanceof Error ? error.message : String(error)}`);
      console.error('  Continuing without checklist outputs...\n');
    }
  } else {
    console.log('\n⏭  Skipping apply-checklist (disabled)\n');
  }
  
  // Generate PACK.md
  console.log('  Generating PACK.md...');
  const packMd = generatePackMd(month, runApplyChecklist, checklistFiles.length > 0);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);
  generatedFiles.unshift('PACK.md');
  console.log('    ✓ PACK.md');
  
  // Generate manifest.json (PR #116 - only list files actually present)
  console.log('  Generating manifest.json...');
  const manifest: PipelineManifest = {
    tool: 'ledger-alias-pipeline-pack',
    version: '1.0.0',
    month: month,
    generatedAt: new Date().toISOString(),
    suggestRan: suggestRan,
    applyChecklistRan: runApplyChecklist && checklistFiles.length > 0,
    suggestOutdir: suggestRan ? null : suggestOutdir,
    inputFiles: {},
    files: generatedFiles
  };
  
  fs.writeFileSync(
    path.join(packDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  generatedFiles.push('manifest.json');
  console.log('    ✓ manifest.json');
  
  // Clean up temp suggest directory if we created it
  if (suggestRan) {
    const tempSuggestDir = path.join(outdir, 'temp-suggest-output');
    if (fs.existsSync(tempSuggestDir)) {
      fs.rmSync(tempSuggestDir, { recursive: true, force: true });
    }
  }
  
  return {
    success: true,
    message: `Pipeline pack created: ${packDir}`,
    outdir: packDir,
    files: generatedFiles
  };
}

/**
 * Generate PACK.md index file
 */
function generatePackMd(
  month: string | null,
  applyChecklistRan: boolean,
  checklistSucceeded: boolean
): string {
  const monthLabel = month || 'YYYY-MM';
  const dateGenerated = new Date().toISOString();
  
  let content = `# Ledger Alias Pipeline Pack`;
  
  if (month) {
    content += ` — ${month}`;
  }
  
  content += `

Assembled pipeline pack combining \`ledger-merchant-alias-suggest\` and \`ledger-alias-apply-checklist\` for offline merchant alias research and approval workflow.

**Never invents amounts. Never pays. Never writes the live Budget sheet — checklist/draft only for Ledger to apply.**

## Contents

### Suggestion Files

- **suggestions.json** — Structured merchant→alias suggestions with scores
- **suggestions.md** — Human-readable suggestions organized by confidence
- **no-match.md** — Merchants with no matches (manual research required)
- **APPROVAL.md** — Approval gates and workflow guidance
`;

  if (applyChecklistRan && checklistSucceeded) {
    content += `
### Apply Checklist Files

- **APPLY-CHECKLIST.md** — H2-ready numbered tick-off checklist
- **SKIPPED.md** — Low-confidence and no-match items for research
- **APPROVAL-CHECKLIST.md** — Checklist approval workflow
`;
  } else if (applyChecklistRan && !checklistSucceeded) {
    content += `
### Apply Checklist

⚠️ Apply checklist run failed or was skipped. See logs above.
`;
  } else {
    content += `
### Apply Checklist

⏭ Apply checklist was skipped (disabled).
`;
  }

  content += `
### Pack Metadata

- **PACK.md** — This file (pipeline pack index)
- **manifest.json** — Machine-readable metadata

## Workflow Integration

This pack orchestrates the merchant alias research and approval workflow:

\`\`\`
ledger-unmatched-merchant-queue → ledger-merchant-alias-suggest → ledger-alias-apply-checklist → H2 approval → Manual sheet update
\`\`\`

## Next Steps

1. Review **suggestions.md** for suggested merchant→alias mappings
2. Check **no-match.md** for merchants requiring manual research
`;

  if (applyChecklistRan && checklistSucceeded) {
    content += `3. Review **APPLY-CHECKLIST.md** for numbered tick-off items
4. Check **SKIPPED.md** for items excluded from checklist
5. Get **H2 approval** before any Budget sheet writes
6. Ledger manually applies approved changes to Budget sheet
`;
  } else {
    content += `3. Generate apply checklist if needed (or approve suggestions directly)
4. Get **H2 approval** before any Budget sheet writes
5. Ledger manually applies approved changes to Budget sheet
`;
  }

  content += `
## Safety Reminders

- ✅ **Offline only** — No Google Sheets API or network calls
- ✅ **Read-only** — Never modifies input files
- ✅ **H2 approval required** — Never writes to Budget sheet
- ✅ **No invented amounts or aliases** — Pass-through from suggestion tool only
- ✅ **Ledger owns sheet writes** — Coding/CoS provides tooling only
- ⚠️ **Manual review required** — Review all suggestions before applying
- ⚠️ **Amounts stay on sheet** — Never paste amounts into chat

---

*Generated: ${dateGenerated}*
`;

  return content;
}
