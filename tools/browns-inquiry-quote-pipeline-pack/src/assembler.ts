/**
 * Pack assembly logic for browns-inquiry-quote-pipeline-pack
 * 
 * SAFETY:
 * - Never invents rates or amounts
 * - Never sends mail/WhatsApp
 * - Offline only
 * - H7 gate reminder in APPROVAL.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { CliOptions, InquiryData, QuoteData, PackResult, Manifest } from './types.js';

/**
 * Assemble pipeline pack from inquiry text or existing inquiry JSON
 */
export async function assemblePack(options: CliOptions): Promise<PackResult> {
  const warnings: string[] = [];
  const outdir = options.outdir || './out';
  const timestamp = new Date().toISOString().split('T')[0];
  const packDir = path.join(outdir, `pack-${timestamp}`);

  // Ensure output directory exists
  if (!fs.existsSync(packDir)) {
    fs.mkdirSync(packDir, { recursive: true });
  }

  let inquiryData: InquiryData | null = null;
  let quoteData: QuoteData | null = null;
  let intakeRan = false;
  let quoteRan = false;

  // Step 1: Get inquiry data (either run intake or use existing JSON)
  if (options.runIntake) {
    if (!options.text) {
      throw new Error('--text is required when using --run-intake');
    }

    console.log('Running browns-inquiry-intake...');
    try {
      const intakeDir = options.intakeOutdir || path.join(packDir, 'intake-temp');
      const intakeTool = path.join(process.cwd(), '../browns-inquiry-intake');
      
      if (!fs.existsSync(intakeTool)) {
        throw new Error('browns-inquiry-intake not found. Ensure sibling tool is installed.');
      }

      // Auto-build sibling tool if dist missing (PR #122, PR #129 pattern)
      const intakeDistPath = path.join(intakeTool, 'dist', 'index.js');
      if (!fs.existsSync(intakeDistPath)) {
        console.log('⚙️  Building browns-inquiry-intake (dist missing)...');
        
        // Install dependencies if node_modules missing
        const nodeModulesPath = path.join(intakeTool, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          console.log('   Installing dependencies...');
          execSync('npm install', {
            cwd: intakeTool,
            stdio: 'inherit'
          });
        }
        
        // Build the tool
        execSync('npm run build', {
          cwd: intakeTool,
          stdio: 'inherit'
        });
        console.log('✅ browns-inquiry-intake built successfully\n');
      }

      // Shell out to browns-inquiry-intake
      execSync(
        `cd ${intakeTool} && npm run intake -- --text ${path.resolve(options.text)} --outdir ${path.resolve(intakeDir)} --mode both`,
        { stdio: 'inherit' }
      );

      // Discover intake output: accept flat layout (booking.json in intakeDir) OR intake-* subdirectory
      let intakePath: string;
      const bookingPathFlat = path.join(intakeDir, 'booking.json');
      const quotePathFlat = path.join(intakeDir, 'quote.json');
      
      if (fs.existsSync(bookingPathFlat) || fs.existsSync(quotePathFlat)) {
        // Flat layout: intake wrote directly to intakeDir
        intakePath = intakeDir;
      } else {
        // Subdirectory layout: look for intake-* subdirectory
        const intakeOut = fs.readdirSync(intakeDir).find(f => f.startsWith('intake-'));
        if (!intakeOut) {
          throw new Error('browns-inquiry-intake did not produce expected output (no booking.json/quote.json in outdir or intake-* subdirectory)');
        }
        intakePath = path.join(intakeDir, intakeOut);
      }
      
      // Read booking.json (or quote.json as fallback)
      const bookingPath = path.join(intakePath, 'booking.json');
      const quotePath = path.join(intakePath, 'quote.json');
      
      if (fs.existsSync(bookingPath)) {
        inquiryData = JSON.parse(fs.readFileSync(bookingPath, 'utf-8'));
      } else if (fs.existsSync(quotePath)) {
        inquiryData = JSON.parse(fs.readFileSync(quotePath, 'utf-8'));
      } else {
        throw new Error('browns-inquiry-intake did not produce booking.json or quote.json');
      }

      // Copy intake outputs to pack
      copyIntakeOutputs(intakePath, packDir);
      intakeRan = true;
    } catch (error) {
      throw new Error(`browns-inquiry-intake failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (options.inquiry) {
    // Use existing inquiry JSON
    console.log(`Using existing inquiry JSON: ${options.inquiry}`);
    if (!fs.existsSync(options.inquiry)) {
      throw new Error(`Inquiry file not found: ${options.inquiry}`);
    }
    inquiryData = JSON.parse(fs.readFileSync(options.inquiry, 'utf-8'));
  } else {
    warnings.push('No inquiry data provided (--run-intake or --inquiry). Pack will be incomplete.');
  }

  // Step 2: Run browns-quote-invoice-draft (default ON unless explicitly disabled)
  if (options.runQuote !== false && inquiryData) {
    console.log('Running browns-quote-invoice-draft...');
    try {
      // Convert inquiry to quote format
      quoteData = inquiryToQuote(inquiryData);

      // Write temporary quote file
      const tempQuotePath = path.join(packDir, 'temp-quote.json');
      fs.writeFileSync(tempQuotePath, JSON.stringify(quoteData, null, 2));

      const quoteTool = path.join(process.cwd(), '../browns-quote-invoice-draft');
      
      if (!fs.existsSync(quoteTool)) {
        throw new Error('browns-quote-invoice-draft not found. Ensure sibling tool is installed.');
      }

      // Auto-build sibling tool if dist missing (PR #122, PR #129 pattern)
      const quoteDistPath = path.join(quoteTool, 'dist', 'index.js');
      if (!fs.existsSync(quoteDistPath)) {
        console.log('⚙️  Building browns-quote-invoice-draft (dist missing)...');
        
        // Install dependencies if node_modules missing
        const nodeModulesPath = path.join(quoteTool, 'node_modules');
        if (!fs.existsSync(nodeModulesPath)) {
          console.log('   Installing dependencies...');
          execSync('npm install', {
            cwd: quoteTool,
            stdio: 'inherit'
          });
        }
        
        // Build the tool
        execSync('npm run build', {
          cwd: quoteTool,
          stdio: 'inherit'
        });
        console.log('✅ browns-quote-invoice-draft built successfully\n');
      }

      const quoteOutdir = path.join(packDir, 'quote-temp');

      // Shell out to browns-quote-invoice-draft
      execSync(
        `cd ${quoteTool} && npm run draft -- --quote ${path.resolve(tempQuotePath)} --outdir ${path.resolve(quoteOutdir)}`,
        { stdio: 'inherit' }
      );

      // Copy quote outputs to pack
      copyQuoteOutputs(quoteOutdir, packDir);
      
      // Clean up temp files
      fs.unlinkSync(tempQuotePath);
      
      quoteRan = true;
    } catch (error) {
      warnings.push(`browns-quote-invoice-draft failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (options.runQuote === false) {
    warnings.push('browns-quote-invoice-draft skipped (--run-quote=false)');
  } else {
    warnings.push('browns-quote-invoice-draft skipped (no inquiry data)');
  }

  // Step 3: Generate PACK.md
  const packMd = generatePackMd(inquiryData, quoteData, intakeRan, quoteRan, warnings);
  fs.writeFileSync(path.join(packDir, 'PACK.md'), packMd);

  // Step 4: Generate APPROVAL.md
  const approvalMd = generateApprovalMd(inquiryData, quoteData);
  fs.writeFileSync(path.join(packDir, 'APPROVAL.md'), approvalMd);

  // Step 5: Generate manifest.json
  const manifest = generateManifest(packDir, intakeRan, quoteRan, inquiryData);
  fs.writeFileSync(path.join(packDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return {
    success: true,
    outdir: packDir,
    warnings,
    message: `Pack assembled successfully at ${packDir}`
  };
}

/**
 * Convert inquiry data to quote format
 */
function inquiryToQuote(inquiry: InquiryData): QuoteData {
  const quote: QuoteData = {
    guestName: inquiry.guestName,
    checkInDate: inquiry.checkInDate,
    checkOutDate: inquiry.checkOutDate,
    suiteOrUnit: inquiry.suiteOrUnit,
    adults: inquiry.adults,
    children: inquiry.children,
    channel: inquiry.channel,
    notes: inquiry.notes,
    currency: inquiry.currency || 'ZAR'
  };

  // Only include amounts if they exist in inquiry (never invent)
  if (inquiry.depositAmount && inquiry.depositAmount > 0) {
    quote.depositRequired = inquiry.depositAmount;
  }
  if (inquiry.totalAmount && inquiry.totalAmount > 0) {
    quote.total = inquiry.totalAmount;
  }
  if (inquiry.quoteAmount && inquiry.quoteAmount > 0) {
    quote.total = inquiry.quoteAmount;
  }

  return quote;
}

/**
 * Copy intake outputs to pack directory
 */
function copyIntakeOutputs(intakePath: string, packDir: string): void {
  const filesToCopy = ['booking.json', 'quote.json', 'missing-fields.md'];
  
  for (const file of filesToCopy) {
    const src = path.join(intakePath, file);
    if (fs.existsSync(src)) {
      const dest = path.join(packDir, `intake-${file}`);
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * Copy quote outputs to pack directory
 */
function copyQuoteOutputs(quoteOutdir: string, packDir: string): void {
  const filesToCopy = ['draft-quote-whatsapp.txt', 'draft-quote-email.txt', 'draft-proforma-email.txt'];
  
  for (const file of filesToCopy) {
    const src = path.join(quoteOutdir, file);
    if (fs.existsSync(src)) {
      const dest = path.join(packDir, file);
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * Generate PACK.md index
 */
function generatePackMd(
  inquiry: InquiryData | null,
  quote: QuoteData | null,
  intakeRan: boolean,
  quoteRan: boolean,
  warnings: string[]
): string {
  const lines: string[] = [];
  
  lines.push('# Browns Inquiry Quote Pipeline Pack');
  lines.push('');
  lines.push('**Purpose:** Dullstroom / The Browns orchestrated pack for single inquiry → quote draft.');
  lines.push('');
  lines.push('**SAFETY:** Never invents rates. Never auto-sends mail/WhatsApp. H7 approval required.');
  lines.push('');
  
  lines.push('## Pack Contents');
  lines.push('');
  
  if (intakeRan) {
    lines.push('### ✅ Inquiry Intake');
    lines.push('- `intake-booking.json` — Structured booking data');
    lines.push('- `intake-quote.json` — Structured quote data');
    lines.push('- `intake-missing-fields.md` — Missing fields checklist');
    lines.push('');
  } else {
    lines.push('### ⚠️  Inquiry Intake');
    lines.push('- Skipped or used existing inquiry JSON');
    lines.push('');
  }
  
  if (quoteRan) {
    lines.push('### ✅ Quote Drafts');
    lines.push('- `draft-quote-whatsapp.txt` — WhatsApp message draft');
    lines.push('- `draft-quote-email.txt` — Email quote draft');
    if (inquiry?.depositAmount && inquiry.depositAmount > 0) {
      lines.push('- `draft-proforma-email.txt` — Proforma invoice (deposit required)');
    }
    lines.push('');
  } else {
    lines.push('### ⚠️  Quote Drafts');
    lines.push('- Skipped or failed');
    lines.push('');
  }
  
  if (inquiry) {
    lines.push('## Inquiry Summary');
    lines.push('');
    if (inquiry.guestName) {
      lines.push(`- **Guest:** ${inquiry.guestName}`);
    }
    if (inquiry.checkInDate && inquiry.checkOutDate) {
      lines.push(`- **Dates:** ${inquiry.checkInDate} to ${inquiry.checkOutDate}`);
    }
    if (inquiry.suiteOrUnit) {
      lines.push(`- **Suite:** ${inquiry.suiteOrUnit}`);
    }
    if (inquiry.adults || inquiry.children) {
      const guests = [];
      if (inquiry.adults) guests.push(`${inquiry.adults} adult${inquiry.adults > 1 ? 's' : ''}`);
      if (inquiry.children) guests.push(`${inquiry.children} child${inquiry.children > 1 ? 'ren' : ''}`);
      lines.push(`- **Guests:** ${guests.join(', ')}`);
    }
    if (inquiry.channel) {
      lines.push(`- **Channel:** ${inquiry.channel}`);
    }
    lines.push('');
    
    const hasAmounts = !!(inquiry.depositAmount || inquiry.totalAmount || inquiry.quoteAmount);
    if (hasAmounts) {
      lines.push('### Amounts (from inquiry)');
      if (inquiry.depositAmount) {
        lines.push(`- **Deposit:** ${inquiry.currency || 'ZAR'} ${inquiry.depositAmount.toFixed(2)}`);
      }
      if (inquiry.totalAmount) {
        lines.push(`- **Total:** ${inquiry.currency || 'ZAR'} ${inquiry.totalAmount.toFixed(2)}`);
      }
      if (inquiry.quoteAmount) {
        lines.push(`- **Quote:** ${inquiry.currency || 'ZAR'} ${inquiry.quoteAmount.toFixed(2)}`);
      }
      lines.push('');
    } else {
      lines.push('### ⚠️  NO AMOUNTS PROVIDED');
      lines.push('');
      lines.push('Drafts will be availability-only. Add amounts manually from rate card if needed.');
      lines.push('');
      lines.push('[RATE CARD REQUIRED] if amounts are missing.');
      lines.push('');
    }
  }
  
  if (warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }
  
  lines.push('## Next Steps');
  lines.push('');
  lines.push('1. Review this pack index');
  lines.push('2. If amounts missing, fill from approved rate card (never invent)');
  lines.push('3. Read APPROVAL.md');
  lines.push('4. Get H7 approval before any guest send: `APPROVE SEND <thread-or-wa-id>`');
  lines.push('5. Never auto-send — Grant/Liana review required');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate APPROVAL.md checklist
 */
function generateApprovalMd(inquiry: InquiryData | null, quote: QuoteData | null): string {
  const lines: string[] = [];
  
  lines.push('# Browns Inquiry Quote Pipeline - APPROVAL CHECKLIST');
  lines.push('');
  lines.push('## Hard Gates');
  lines.push('');
  lines.push('### H7 - Quote Send');
  lines.push('☐ **Required approval:** `APPROVE SEND <thread-or-wa-id>`');
  lines.push('');
  lines.push('### lane:hospitality-partners Rules');
  if (inquiry?.checkInDate && inquiry?.checkOutDate) {
    lines.push('☐ **Dates confirmed:** ✅ Yes');
  } else {
    lines.push('☐ **Dates confirmed:** ❌ Missing');
  }
  if (inquiry?.suiteOrUnit) {
    lines.push('☐ **Suite confirmed:** ✅ Yes');
  } else {
    lines.push('☐ **Suite confirmed:** ❌ Missing');
  }
  if (inquiry?.adults) {
    lines.push('☐ **Guests confirmed:** ✅ Yes');
  } else {
    lines.push('☐ **Guests confirmed:** ❌ Missing');
  }
  lines.push('');
  
  lines.push('### N7 - Never Invent');
  lines.push('☐ **No invented rates:** Amounts only from inquiry or approved rate card');
  const hasAmounts = !!(inquiry?.depositAmount || inquiry?.totalAmount || inquiry?.quoteAmount);
  if (hasAmounts) {
    lines.push('☐ **Amounts source:** ✅ From inquiry');
  } else {
    lines.push('☐ **Amounts source:** ⚠️  [RATE CARD REQUIRED]');
  }
  lines.push('☐ **No auto-send:** Human review required');
  lines.push('');
  
  lines.push('## Data Verification');
  lines.push('');
  if (inquiry) {
    if (inquiry.guestName) {
      lines.push(`- Guest Name: ${inquiry.guestName}`);
    } else {
      lines.push('- Guest Name: _Not Set_');
    }
    if (inquiry.checkInDate) {
      lines.push(`- Check-in: ${inquiry.checkInDate}`);
    } else {
      lines.push('- Check-in: _Not Set_');
    }
    if (inquiry.checkOutDate) {
      lines.push(`- Check-out: ${inquiry.checkOutDate}`);
    } else {
      lines.push('- Check-out: _Not Set_');
    }
    if (inquiry.suiteOrUnit) {
      lines.push(`- Suite: ${inquiry.suiteOrUnit}`);
    } else {
      lines.push('- Suite: _Not Set_');
    }
    if (inquiry.adults || inquiry.children) {
      const guests = [];
      if (inquiry.adults) guests.push(`${inquiry.adults} adult${inquiry.adults > 1 ? 's' : ''}`);
      if (inquiry.children) guests.push(`${inquiry.children} child${inquiry.children > 1 ? 'ren' : ''}`);
      lines.push(`- Guests: ${guests.join(', ')}`);
    } else {
      lines.push('- Guests: _Not Set_');
    }
    
    if (hasAmounts) {
      lines.push('');
      lines.push('**Amounts:**');
      if (inquiry.depositAmount) {
        lines.push(`- Deposit: ${inquiry.currency || 'ZAR'} ${inquiry.depositAmount.toFixed(2)}`);
      }
      if (inquiry.totalAmount) {
        lines.push(`- Total: ${inquiry.currency || 'ZAR'} ${inquiry.totalAmount.toFixed(2)}`);
      }
      if (inquiry.quoteAmount) {
        lines.push(`- Quote: ${inquiry.currency || 'ZAR'} ${inquiry.quoteAmount.toFixed(2)}`);
      }
    } else {
      lines.push('');
      lines.push('**⚠️  NO AMOUNTS PROVIDED**');
      lines.push('');
      lines.push('[RATE CARD REQUIRED] — Add amounts manually from approved rate card before sending.');
    }
  } else {
    lines.push('_No inquiry data available_');
  }
  lines.push('');
  
  lines.push('## Safety Reminders');
  lines.push('');
  lines.push('- ✅ Offline only');
  lines.push('- ✅ Never auto-send');
  lines.push('- ✅ Dullstroom / The Browns only');
  lines.push('- ⚠️  H7 gate required before any send');
  lines.push('- ⚠️  Never invent rates or amounts');
  lines.push('');
  
  lines.push('## Approval');
  lines.push('');
  lines.push('☐ All hard gates checked');
  lines.push('☐ Dates + suite + guests confirmed');
  lines.push('☐ Amounts verified (or [RATE CARD REQUIRED] acknowledged)');
  lines.push('☐ No invented rates/amounts');
  lines.push('☐ H7 approval obtained');
  lines.push('☐ Ready to proceed with quote send (Grant/Liana approval)');
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Generate manifest.json
 */
function generateManifest(packDir: string, intakeRan: boolean, quoteRan: boolean, inquiry: InquiryData | null): Manifest {
  const files = fs.readdirSync(packDir);
  
  const manifest: Manifest = {
    tool: 'browns-inquiry-quote-pipeline-pack',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    intakeRan,
    quoteRan,
    files,
    hasAmounts: !!(inquiry?.depositAmount || inquiry?.totalAmount || inquiry?.quoteAmount)
  };
  
  if (inquiry?.guestName) {
    manifest.guestName = inquiry.guestName;
  }
  if (inquiry?.checkInDate) {
    manifest.checkInDate = inquiry.checkInDate;
  }
  if (inquiry?.checkOutDate) {
    manifest.checkOutDate = inquiry.checkOutDate;
  }
  
  return manifest;
}
