import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { DraftOutputs } from './types.js';

/**
 * Writes all draft outputs to a job folder
 */
export function writeOutputs(outputs: DraftOutputs, outDir: string): void {
  // Create output directory if it doesn't exist
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // Create job folder with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const guestSlug = outputs.manifest.booking.guestName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const jobFolder = join(outDir, `${timestamp}-${guestSlug}`);

  mkdirSync(jobFolder, { recursive: true });

  // Write welcome WhatsApp
  writeFileSync(
    join(jobFolder, 'draft-welcome-whatsapp.txt'),
    outputs.welcomeWhatsApp,
    'utf-8'
  );

  // Write welcome email
  const emailContent = `Subject: ${outputs.welcomeEmail.subject}

${outputs.welcomeEmail.body}`;
  writeFileSync(
    join(jobFolder, 'draft-welcome-email.txt'),
    emailContent,
    'utf-8'
  );

  // Write late check-in
  writeFileSync(
    join(jobFolder, 'draft-late-checkin.txt'),
    outputs.lateCheckIn,
    'utf-8'
  );

  // Write team check-in
  writeFileSync(
    join(jobFolder, 'draft-team-checkin.txt'),
    outputs.teamCheckIn,
    'utf-8'
  );

  // Write approval notice
  writeFileSync(
    join(jobFolder, 'APPROVAL.md'),
    outputs.approval,
    'utf-8'
  );

  // Write manifest
  writeFileSync(
    join(jobFolder, 'manifest.json'),
    JSON.stringify(outputs.manifest, null, 2),
    'utf-8'
  );

  console.log(`\n✅ Job folder created: ${jobFolder}`);
  console.log(`\nGenerated files:`);
  for (const file of outputs.manifest.outputFiles) {
    console.log(`  ✓ ${file}`);
  }
}
