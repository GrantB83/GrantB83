/**
 * Output file generation for Heavy Metal delivery POD draft
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import type { PodData, Manifest } from './types.js';

/**
 * Generate all output files
 */
export async function generateOutputs(
  pod: PodData,
  missingFields: string[],
  outdir: string,
  source: string
): Promise<void> {
  await mkdir(outdir, { recursive: true });

  const timestamp = new Date().toISOString();

  // Generate pod.json (normalized)
  const podPath = join(outdir, 'pod.json');
  await writeFile(podPath, JSON.stringify(pod, null, 2));

  // Generate pod.md (DRAFT POD note)
  const podMdPath = join(outdir, 'pod.md');
  const podMdContent = generatePodMarkdown(pod);
  await writeFile(podMdPath, podMdContent);

  // Generate missing-fields.md
  const missingPath = join(outdir, 'missing-fields.md');
  const missingContent = generateMissingFields(missingFields, pod);
  await writeFile(missingPath, missingContent);

  // Generate APPROVAL.md
  const approvalPath = join(outdir, 'APPROVAL.md');
  const approvalContent = generateApproval(pod, missingFields);
  await writeFile(approvalPath, approvalContent);

  // Generate manifest.json
  const manifestPath = join(outdir, 'manifest.json');
  const manifest: Manifest = {
    generated_at: timestamp,
    source,
    outputs: {
      pod: 'pod.json',
      pod_md: 'pod.md',
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
 * Generate DRAFT proof-of-delivery markdown
 */
function generatePodMarkdown(pod: PodData): string {
  let content = `# Heavy Metal Sand & Stone - Proof of Delivery

**DRAFT ONLY - Review and complete before filing**

---

## Delivery Details

**Date:** ${pod.deliveredAt || '[DATE_NOT_RECORDED]'}  
**Customer:** ${pod.customer || '[CUSTOMER_NAME]'}  
`;

  if (pod.phone) {
    content += `**Phone:** ${pod.phone}  \n`;
  }

  content += `
## Material Delivered

**Material:** ${pod.material || '[MATERIAL]'}  
**Volume:** ${pod.volume || '[VOLUME]'} ${pod.unit || '[UNIT]'}  

## Delivery Location

${pod.deliveryLocation || '[DELIVERY_LOCATION]'}

## Delivery Details

`;

  if (pod.vehicle) {
    content += `**Vehicle:** ${pod.vehicle}  \n`;
  }

  if (pod.driver) {
    content += `**Driver:** ${pod.driver}  \n`;
  }

  if (pod.notes) {
    content += `\n**Notes:** ${pod.notes}\n`;
  }

  content += `\n---

## Signature

`;

  if (pod.signedBy) {
    content += `**Received and signed by:** ${pod.signedBy}\n\n`;
    content += `✅ Signature recorded\n`;
  } else {
    content += `⚠️ **No signature recorded**\n\n`;
    content += `**NEVER invent or assume signature.** If delivery was not signed for, this field stays blank.\n`;
  }

  content += `\n---

**Generated:** ${new Date().toISOString()}  
**Status:** DRAFT  
**Entity:** Heavy Metal Sand & Stone, Dullstroom  

⚠️ **CoS owns WhatsApp send. Never auto-send. Confirm volume + location before any communication.**
`;

  return content;
}

/**
 * Generate missing fields report
 */
function generateMissingFields(missingFields: string[], pod: PodData): string {
  let content = `# Missing Fields Report

**Generated:** ${new Date().toISOString()}

`;

  if (missingFields.length === 0) {
    content += `✅ All required fields present.\n\n`;
    content += `⚠️ Still review APPROVAL.md to verify accuracy.\n\n`;
    
    // Check signature separately since it's optional but critical
    if (!pod.signedBy) {
      content += `## ⚠️ Signature Notice\n\n`;
      content += `No signature recorded. If delivery was signed for, add \`signedBy\` to pod.json.\n\n`;
      content += `**NEVER invent signatures.** Only record if actually present.\n`;
    }
    
    return content;
  }

  content += `The following required fields were not found and must be filled:\n\n`;

  const fieldDescriptions: Record<string, string> = {
    customer: 'Customer name',
    material: 'Material type (sand, stone, gravel, etc.)',
    volume: 'Volume quantity',
    unit: 'Volume unit (m³, ton, load)',
    deliveryLocation: 'Delivery address/location',
    deliveredAt: 'Delivery date (and time if known)',
  };

  for (const field of missingFields) {
    const desc = fieldDescriptions[field] || field;
    content += `- [ ] **${field}**: ${desc}\n`;
  }

  content += `\n## Optional Fields\n\n`;
  
  const optionalChecks = [
    { field: 'phone', present: !!pod.phone, label: 'Customer phone' },
    { field: 'vehicle', present: !!pod.vehicle, label: 'Vehicle/registration' },
    { field: 'driver', present: !!pod.driver, label: 'Driver name' },
    { field: 'notes', present: !!pod.notes, label: 'Additional notes' },
    { field: 'signedBy', present: !!pod.signedBy, label: 'Signature (NEVER INVENT)' },
  ];

  for (const check of optionalChecks) {
    const icon = check.present ? '✅' : '⚠️';
    content += `${icon} **${check.field}**: ${check.label}${check.present ? '' : ' - not present'}\n`;
  }

  content += `\n## Action Required

1. Edit \`pod.json\` to add missing required fields
2. Review source delivery documentation
3. Contact driver or yard if critical info missing
4. **NEVER invent volume, location, or signature**

`;

  return content;
}

/**
 * Generate approval document
 */
function generateApproval(pod: PodData, missingFields: string[]): string {
  let content = `# APPROVAL REQUIRED - Heavy Metal POD Draft

**Generated:** ${new Date().toISOString()}

⚠️ **READ THIS BEFORE USING OUTPUTS** ⚠️

---

## Extracted Data

### Customer
- **Name:** ${pod.customer || '❌ NOT FOUND'}
`;

  if (pod.phone) {
    content += `- **Phone:** ${pod.phone}\n`;
  } else {
    content += `- **Phone:** ⚠️ Not recorded\n`;
  }

  content += `
### Material
- **Type:** ${pod.material || '❌ NOT FOUND'}
- **Volume:** ${pod.volume || '❌ NOT FOUND'} ${pod.unit || '❌'}

### Delivery
- **Location:** ${pod.deliveryLocation || '❌ NOT FOUND'}
- **Date/Time:** ${pod.deliveredAt || '❌ NOT FOUND'}

### Delivery Details
`;

  if (pod.vehicle) {
    content += `- **Vehicle:** ${pod.vehicle}\n`;
  } else {
    content += `- **Vehicle:** ⚠️ Not recorded\n`;
  }

  if (pod.driver) {
    content += `- **Driver:** ${pod.driver}\n`;
  } else {
    content += `- **Driver:** ⚠️ Not recorded\n`;
  }

  if (pod.notes) {
    content += `- **Notes:** ${pod.notes}\n`;
  }

  content += `\n### Signature\n`;

  if (pod.signedBy) {
    content += `- ✅ **Signed by:** ${pod.signedBy}\n`;
  } else {
    content += `- ⚠️ **No signature recorded**\n`;
    content += `- **CRITICAL:** NEVER invent or assume signatures\n`;
    content += `- If delivery was not signed for, leave blank\n`;
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
    content += `✅ All required fields present.\n\n⚠️ **Still verify accuracy below**\n`;
  }

  content += `\n---

## Safety Checklist

Before using \`pod.json\` or \`pod.md\`:

- [ ] ✅ All missing required fields filled in \`pod.json\`
- [ ] ✅ Volume and unit match actual delivery
- [ ] ✅ Delivery location is accurate
- [ ] ✅ Delivery date/time is correct
- [ ] ✅ Material matches what was delivered
- [ ] ✅ Customer name verified
- [ ] ✅ **Signature: ONLY recorded if actually present - NEVER INVENTED**
- [ ] ✅ Vehicle and driver info accurate (if present)
- [ ] ✅ No invented data anywhere

---

## Critical Rules

### Volume & Location
From \`docs/automation/approval-gates.md\` lane:heavy-metal:
- **Confirm volume + location before any communication**
- Never guess or estimate volumes
- Location must be verified from delivery documentation

### Signature
- **NEVER invent \`signedBy\` field**
- If delivery was not signed for, field stays \`undefined\`
- Only record signatures that actually exist on documentation
- Unsigned deliveries are valid - don't fabricate

### WhatsApp Communication
- **CoS owns all WhatsApp sends**
- **NEVER auto-send**
- Manual approval required for every message

---

## Next Steps

1. Review all extracted data above
2. Fill any missing required fields in \`pod.json\`
3. Verify signature status (present or legitimately absent)
4. Check volume and location against source documentation
5. Review \`pod.md\` DRAFT for accuracy
6. **Do NOT send** until approved by CoS/Grant

---

**Generated by:** hm-delivery-pod-draft v1.0.0  
**Lane:** heavy-metal  
**Entity:** Heavy Metal Sand & Stone  
**Location:** Dullstroom
`;

  return content;
}
