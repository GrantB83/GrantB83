/**
 * Output file generation for Heavy Metal quote intake
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { Quote, Manifest } from './types.js';

/**
 * Generate all output files
 */
export async function generateOutputs(
  quote: Quote,
  missingFields: string[],
  outdir: string,
  source: string
): Promise<void> {
  // Ensure output directory exists
  await mkdir(outdir, { recursive: true });

  const timestamp = new Date().toISOString();

  // Generate quote.json
  const quotePath = join(outdir, 'quote.json');
  await writeFile(quotePath, JSON.stringify(quote, null, 2));

  // Generate draft-reply.md
  const draftPath = join(outdir, 'draft-reply.md');
  const draftContent = generateDraftReply(quote, missingFields);
  await writeFile(draftPath, draftContent);

  // Generate missing-fields.md
  const missingPath = join(outdir, 'missing-fields.md');
  const missingContent = generateMissingFields(missingFields);
  await writeFile(missingPath, missingContent);

  // Generate APPROVAL.md
  const approvalPath = join(outdir, 'APPROVAL.md');
  const approvalContent = generateApproval(quote, missingFields);
  await writeFile(approvalPath, approvalContent);

  // Generate manifest.json
  const manifestPath = join(outdir, 'manifest.json');
  const manifest: Manifest = {
    generated_at: timestamp,
    source,
    outputs: {
      quote: 'quote.json',
      draft_reply: 'draft-reply.md',
      missing_fields: 'missing-fields.md',
      approval: 'APPROVAL.md',
      manifest: 'manifest.json',
    },
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ Generated outputs in: ${outdir}`);
  console.log(`📝 Review APPROVAL.md before using outputs`);
}

/**
 * Generate draft reply with placeholders
 */
function generateDraftReply(quote: Quote, missingFields: string[]): string {
  const hasPrice = quote.pricePerUnit || quote.totalPrice;
  
  let reply = `# Heavy Metal Sand & Stone - Quote Draft

**DRAFT ONLY - Review and complete before sending**

---

Hi ${quote.customerName || '[CUSTOMER_NAME]'},

Thank you for your inquiry about ${quote.materials?.join(', ') || '[MATERIAL]'}.

`;

  // Volume section
  if (quote.volume && quote.volumeUnit) {
    reply += `We can supply **${quote.volume} ${quote.volumeUnit}** of ${quote.materials?.[0] || '[MATERIAL]'}.\n\n`;
  } else {
    reply += `We can supply **[VOLUME] [UNIT]** of ${quote.materials?.[0] || '[MATERIAL]'}.\n\n`;
  }

  // Delivery location
  if (quote.deliveryLocation) {
    reply += `Delivery to **${quote.deliveryLocation}**.\n\n`;
  } else {
    reply += `Delivery to **[DELIVERY_LOCATION]**.\n\n`;
  }

  // Pricing section
  if (hasPrice) {
    if (quote.pricePerUnit) {
      reply += `**Price:** ${quote.currency || 'R'}${quote.pricePerUnit} per ${quote.volumeUnit || 'unit'}\n`;
    }
    if (quote.totalPrice) {
      reply += `**Total:** ${quote.currency || 'R'}${quote.totalPrice}\n`;
    }
    reply += '\n';
  } else {
    reply += `**Price:** [RATE_PER_UNIT] - **Never invent rates; confirm from approved price card**\n\n`;
  }

  // Date section
  if (quote.dateNeeded) {
    reply += `**Delivery Date:** ${quote.dateNeeded}\n\n`;
  } else {
    reply += `**Delivery Date:** [DATE_NEEDED]\n\n`;
  }

  reply += `Please confirm the details above and we'll arrange delivery.\n\n`;
  reply += `Best regards,\n`;
  reply += `Heavy Metal Sand & Stone\n`;
  reply += `Dullstroom\n\n`;

  reply += `---

## ⚠️ Before Sending

`;

  if (missingFields.length > 0) {
    reply += `**Missing fields:** ${missingFields.join(', ')}\n\n`;
  }

  reply += `1. ✅ Confirm volume and delivery location with customer\n`;
  reply += `2. ✅ Check approved price card for current rates\n`;
  reply += `3. ✅ Never invent or guess pricing\n`;
  reply += `4. ✅ Review APPROVAL.md for full safety checks\n`;
  reply += `5. ✅ WhatsApp send via CoS only (never auto-send)\n`;

  return reply;
}

/**
 * Generate missing fields report
 */
function generateMissingFields(missingFields: string[]): string {
  let content = `# Missing Fields Report

**Generated:** ${new Date().toISOString()}

`;

  if (missingFields.length === 0) {
    content += `✅ All fields extracted successfully.\n\n`;
    content += `⚠️ Still review APPROVAL.md to verify accuracy.\n`;
    return content;
  }

  content += `The following fields were not found in the inquiry text and must be filled manually:\n\n`;

  const fieldDescriptions: Record<string, string> = {
    customerName: 'Customer name',
    customerPhone: 'Customer phone number',
    materials: 'Material type (sand, stone, gravel, etc.)',
    volume: 'Volume quantity',
    volumeUnit: 'Volume unit (m³, ton, load)',
    deliveryLocation: 'Delivery address/location',
    dateNeeded: 'Date needed for delivery',
  };

  for (const field of missingFields) {
    const desc = fieldDescriptions[field] || field;
    content += `- [ ] **${field}**: ${desc}\n`;
  }

  content += `\n## Action Required

1. Edit \`quote.json\` to add missing fields
2. Re-read the original inquiry to find any missed information
3. Contact customer if critical info is missing
4. Never invent volume, location, or pricing

`;

  return content;
}

/**
 * Generate approval document
 */
function generateApproval(quote: Quote, missingFields: string[]): string {
  const hasPrice = quote.pricePerUnit || quote.totalPrice;

  let content = `# APPROVAL REQUIRED - Heavy Metal Quote

**Generated:** ${new Date().toISOString()}

⚠️ **READ THIS BEFORE USING OUTPUTS** ⚠️

---

## Extracted Data

### Customer
- **Name:** ${quote.customerName || '❌ NOT FOUND'}
- **Phone:** ${quote.customerPhone || '❌ NOT FOUND'}

### Materials
- **Type:** ${quote.materials?.join(', ') || '❌ NOT FOUND'}

### Volume
- **Quantity:** ${quote.volume || '❌ NOT FOUND'}
- **Unit:** ${quote.volumeUnit || '❌ NOT FOUND'}

### Delivery
- **Location:** ${quote.deliveryLocation || '❌ NOT FOUND'}
- **Date Needed:** ${quote.dateNeeded || '❌ NOT FOUND'}

### Pricing
`;

  if (hasPrice) {
    content += `- **Price per Unit:** ${quote.pricePerUnit ? `${quote.currency || 'R'}${quote.pricePerUnit}` : 'Not extracted'}\n`;
    content += `- **Total Price:** ${quote.totalPrice ? `${quote.currency || 'R'}${quote.totalPrice}` : 'Not extracted'}\n`;
    content += `\n⚠️ **Verify pricing against current approved price card**\n`;
  } else {
    content += `- ❌ **No pricing found in inquiry**\n`;
    content += `- ✅ Never invent rates - check approved price card\n`;
  }

  content += `\n---

## Missing Fields (${missingFields.length})

`;

  if (missingFields.length > 0) {
    for (const field of missingFields) {
      content += `- ❌ **${field}**\n`;
    }
    content += `\n⚠️ **STOP: Fill missing fields before proceeding**\n`;
  } else {
    content += `✅ All fields extracted.\n\n⚠️ **Still verify accuracy below**\n`;
  }

  content += `\n---

## Safety Checklist

Before using \`quote.json\` or \`draft-reply.md\`:

- [ ] ✅ All missing fields filled in \`quote.json\`
- [ ] ✅ Volume and unit verified from original inquiry
- [ ] ✅ Delivery location confirmed (never guess)
- [ ] ✅ Date needed is realistic and confirmed
- [ ] ✅ Materials match customer request exactly
- [ ] ✅ Pricing checked against approved price card
- [ ] ✅ Customer phone number is valid SA format
- [ ] ✅ Draft reply reviewed for accuracy
- [ ] ✅ No invented data anywhere

---

## Approval Gates (from docs/automation/approval-gates.md)

| Gate | Requirement |
|------|-------------|
| **H1** | \`APPROVE SEND <thread-or-wa-id>\` required for every quote |
| **lane:heavy-metal** | Confirm volume + location before any quote |
| **N7** | Never invent accommodation rates, water prices, or **sand quotes** |

⚠️ **WhatsApp send via CoS only - NEVER auto-send**

---

## Notes

${quote.notes ? quote.notes : 'No additional notes extracted.'}

---

## Human Decision Required

**Approval text required:**

\`\`\`
APPROVE SEND <whatsapp-thread-id>
\`\`\`

Do NOT proceed without:
1. Verifying volume and delivery location
2. Checking current price card
3. Manual review of all extracted fields
4. Explicit approval from Grant

---

**Generated by:** hm-quote-intake v1.0.0  
**Lane:** heavy-metal  
**Entity:** Heavy Metal Sand & Stone
`;

  return content;
}
