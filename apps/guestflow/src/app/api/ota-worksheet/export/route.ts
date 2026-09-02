import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { worksheetData, format } = await request.json()

    if (!worksheetData || !format) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let content: string
    let contentType: string
    let filename: string

    if (format === 'markdown') {
      content = generateMarkdown(worksheetData)
      contentType = 'text/markdown'
      filename = 'ota-rate-worksheet.md'
    } else if (format === 'csv') {
      content = generateCSV(worksheetData)
      contentType = 'text/csv'
      filename = 'ota-rate-worksheet.csv'
    } else if (format === 'html') {
      content = generateHTML(worksheetData)
      contentType = 'text/html'
      filename = 'ota-rate-worksheet.html'
    } else {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    console.error('Error exporting OTA worksheet:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateMarkdown(data: any): string {
  const { tenantName, generatedAt, rateCards, promoExample } = data

  let md = `# OTA Rate Worksheet\n\n`
  md += `**Property:** ${tenantName}\n`
  md += `**Generated:** ${generatedAt}\n`
  md += `**Status:** DRAFT ONLY — Manual OTA/Nightsbridge Entry\n\n`
  
  md += `---\n\n`
  md += `⚠️ **APPROVAL REMINDER**: Grant/tenant approval required before applying any rates to live OTA or Nightsbridge systems.\n\n`
  md += `This worksheet is for **manual review and entry only**. Never auto-apply to live APIs.\n\n`
  md += `---\n\n`

  md += `## Rate Cards\n\n`
  
  if (rateCards.length === 0) {
    md += `No rate cards available. Upload rate cards first.\n\n`
  } else {
    md += `| Room Type | Season | Rate/Night | Currency | Min Nights | Valid From | Valid To | Notes |\n`
    md += `|-----------|--------|------------|----------|------------|------------|----------|-------|\n`
    
    for (const rate of rateCards) {
      const roomType = rate.room_type || '[ROOM TYPE REQUIRED]'
      const season = rate.season || 'standard'
      const ratePerNight = rate.rate_per_night ? rate.rate_per_night.toString() : '[RATE BLANK]'
      const currency = rate.currency || 'ZAR'
      const minNights = rate.min_nights || '1'
      const validFrom = rate.valid_from || '—'
      const validTo = rate.valid_to || '—'
      const notes = rate.notes || '—'
      
      md += `| ${roomType} | ${season} | ${ratePerNight} | ${currency} | ${minNights} | ${validFrom} | ${validTo} | ${notes} |\n`
    }
    md += `\n`
  }

  if (promoExample) {
    md += `## Promotional Rate Example (Optional)\n\n`
    md += `**Promo Code:** ${promoExample.code}\n`
    md += `**Description:** ${promoExample.description}\n`
    md += `**Discount:** ${promoExample.discount}\n`
    md += `**Valid:** ${promoExample.validFrom} to ${promoExample.validTo}\n\n`
  }

  md += `---\n\n`
  md += `## Manual Entry Instructions\n\n`
  md += `1. Review all rates above for accuracy\n`
  md += `2. Verify blank rates are intentional (never invent pricing)\n`
  md += `3. Obtain Grant/tenant approval before proceeding\n`
  md += `4. Manually enter approved rates into OTA/Nightsbridge dashboards\n`
  md += `5. Do NOT use automated API uploads without explicit approval\n\n`
  md += `**Missing Rates:** Rows showing [RATE BLANK] indicate no rate card exists for that configuration. Contact property owner before inventing pricing.\n\n`

  return md
}

function generateCSV(data: any): string {
  const { rateCards } = data

  let csv = `room_type,season,rate_per_night,currency,min_nights,valid_from,valid_to,notes\n`
  
  if (rateCards.length === 0) {
    csv += `[NO RATES AVAILABLE],[UPLOAD REQUIRED],0,ZAR,1,,,Contact property owner\n`
    return csv
  }

  for (const rate of rateCards) {
    const roomType = rate.room_type || '[ROOM TYPE REQUIRED]'
    const season = rate.season || 'standard'
    const ratePerNight = rate.rate_per_night || '[RATE BLANK]'
    const currency = rate.currency || 'ZAR'
    const minNights = rate.min_nights || '1'
    const validFrom = rate.valid_from || ''
    const validTo = rate.valid_to || ''
    const notes = rate.notes || ''
    
    csv += `"${roomType}","${season}","${ratePerNight}","${currency}","${minNights}","${validFrom}","${validTo}","${notes}"\n`
  }

  return csv
}

function generateHTML(data: any): string {
  const { tenantName, generatedAt, rateCards, promoExample } = data

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTA Rate Worksheet - ${tenantName}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 2rem auto;
      padding: 2rem;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #1e40af;
      border-bottom: 3px solid #1e40af;
      padding-bottom: 0.5rem;
    }
    .meta {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 1rem;
      margin: 1rem 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 0.75rem;
      text-align: left;
    }
    th {
      background: #1e40af;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background: #f9fafb;
    }
    .blank-rate {
      color: #dc2626;
      font-weight: 600;
    }
    .instructions {
      background: #eff6ff;
      border: 1px solid #3b82f6;
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }
    .promo {
      background: #f0fdf4;
      border: 1px solid #10b981;
      padding: 1rem;
      border-radius: 0.5rem;
      margin: 1rem 0;
    }
    @media print {
      body { margin: 0; padding: 1rem; }
      .warning { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>OTA Rate Worksheet</h1>
  
  <div class="meta">
    <p><strong>Property:</strong> ${tenantName}</p>
    <p><strong>Generated:</strong> ${generatedAt}</p>
    <p><strong>Status:</strong> DRAFT ONLY — Manual OTA/Nightsbridge Entry</p>
  </div>

  <div class="warning">
    <strong>⚠️ APPROVAL REMINDER:</strong> Grant/tenant approval required before applying any rates to live OTA or Nightsbridge systems.
    <br><br>
    This worksheet is for <strong>manual review and entry only</strong>. Never auto-apply to live APIs.
  </div>

  <h2>Rate Cards</h2>`

  if (rateCards.length === 0) {
    html += `<p class="blank-rate">No rate cards available. Upload rate cards first.</p>`
  } else {
    html += `<table>
    <thead>
      <tr>
        <th>Room Type</th>
        <th>Season</th>
        <th>Rate/Night</th>
        <th>Currency</th>
        <th>Min Nights</th>
        <th>Valid From</th>
        <th>Valid To</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>`

    for (const rate of rateCards) {
      const roomType = rate.room_type || '<span class="blank-rate">[ROOM TYPE REQUIRED]</span>'
      const season = rate.season || 'standard'
      const ratePerNight = rate.rate_per_night 
        ? rate.rate_per_night.toString() 
        : '<span class="blank-rate">[RATE BLANK]</span>'
      const currency = rate.currency || 'ZAR'
      const minNights = rate.min_nights || '1'
      const validFrom = rate.valid_from || '—'
      const validTo = rate.valid_to || '—'
      const notes = rate.notes || '—'
      
      html += `<tr>
        <td>${roomType}</td>
        <td>${season}</td>
        <td>${ratePerNight}</td>
        <td>${currency}</td>
        <td>${minNights}</td>
        <td>${validFrom}</td>
        <td>${validTo}</td>
        <td>${notes}</td>
      </tr>`
    }

    html += `</tbody></table>`
  }

  if (promoExample) {
    html += `
    <div class="promo">
      <h3>Promotional Rate Example (Optional)</h3>
      <p><strong>Promo Code:</strong> ${promoExample.code}</p>
      <p><strong>Description:</strong> ${promoExample.description}</p>
      <p><strong>Discount:</strong> ${promoExample.discount}</p>
      <p><strong>Valid:</strong> ${promoExample.validFrom} to ${promoExample.validTo}</p>
    </div>`
  }

  html += `
  <div class="instructions">
    <h3>Manual Entry Instructions</h3>
    <ol>
      <li>Review all rates above for accuracy</li>
      <li>Verify blank rates are intentional (never invent pricing)</li>
      <li>Obtain Grant/tenant approval before proceeding</li>
      <li>Manually enter approved rates into OTA/Nightsbridge dashboards</li>
      <li>Do NOT use automated API uploads without explicit approval</li>
    </ol>
    <p><strong>Missing Rates:</strong> Rows showing <span class="blank-rate">[RATE BLANK]</span> indicate no rate card exists for that configuration. Contact property owner before inventing pricing.</p>
  </div>

</body>
</html>`

  return html
}
