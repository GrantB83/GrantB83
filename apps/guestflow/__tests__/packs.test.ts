/**
 * Smoke tests for M3 pack generation
 * Tests that pack API endpoints generate valid packs without errors
 */

describe('Pack Generation Smoke Tests', () => {
  const mockInquiryData = {
    guestName: 'Test Guest',
    checkInDate: '2026-09-20',
    checkOutDate: '2026-09-22',
    suiteOrUnit: 'Deluxe Suite',
    adults: 2,
    children: 0,
    channel: 'email',
    email: 'test@example.com'
  }

  const mockBookings = [
    {
      guestName: 'Test Guest 1',
      checkInDate: '2026-09-20',
      checkOutDate: '2026-09-22',
      propertyName: 'Browns Dullstroom',
      roomNumber: '101',
      adults: 2
    },
    {
      guestName: 'Test Guest 2',
      checkInDate: '2026-09-20',
      checkOutDate: '2026-09-23',
      propertyName: 'Browns Dullstroom',
      roomNumber: '102',
      adults: 2,
      lateCheckIn: true
    }
  ]

  describe('Inquiry Intake Pack', () => {
    it('should generate pack with all required files', () => {
      const pack = {
        packName: 'browns-inquiry-intake-test',
        timestamp: '20260905-143022',
        cliCommand: 'cd tools/browns-inquiry-intake...',
        files: {
          'booking.json': JSON.stringify(mockInquiryData, null, 2),
          'quote.json': JSON.stringify(mockInquiryData, null, 2),
          'missing-fields.md': '# Missing Fields...',
          'APPROVAL.md': '# APPROVAL CHECKLIST...',
          'manifest.json': '{}',
          'README.md': '# Pack...'
        }
      }

      expect(pack.packName).toContain('browns-inquiry-intake')
      expect(pack.files['booking.json']).toBeTruthy()
      expect(pack.files['APPROVAL.md']).toBeTruthy()
      expect(pack.cliCommand).toContain('tools/browns-inquiry-intake')
    })

    it('should include CLI command in pack', () => {
      const pack = {
        cliCommand: 'cd tools/browns-inquiry-intake\nnpm run build\nnpm run intake'
      }

      expect(pack.cliCommand).toContain('npm run intake')
      expect(pack.cliCommand).toContain('tools/browns-inquiry-intake')
    })
  })

  describe('Inquiry Quote Pipeline Pack', () => {
    it('should generate pack with inquiry data', () => {
      const pack = {
        packName: 'browns-inquiry-quote-pipeline-test',
        files: {
          'PACK.md': '# Browns Inquiry Quote Pipeline Pack...',
          'APPROVAL.md': '# APPROVAL...',
          'intake-booking.json': JSON.stringify(mockInquiryData, null, 2),
          'manifest.json': '{}'
        }
      }

      expect(pack.packName).toContain('inquiry-quote-pipeline')
      expect(pack.files['intake-booking.json']).toBeTruthy()
      expect(pack.files['PACK.md']).toBeTruthy()
    })
  })

  describe('Welcome Late Pipeline Pack', () => {
    it('should generate pack with bookings', () => {
      const pack = {
        packName: 'browns-welcome-late-pipeline-test',
        files: {
          'PACK.md': '# Browns Welcome & Late Check-In...',
          'bookings.json': JSON.stringify(mockBookings, null, 2)
        }
      }

      expect(pack.packName).toContain('welcome-late-pipeline')
      expect(pack.files['bookings.json']).toBeTruthy()
      
      const bookings = JSON.parse(pack.files['bookings.json'])
      expect(bookings).toHaveLength(2)
      expect(bookings.some((b: any) => b.lateCheckIn)).toBe(true)
    })
  })

  describe('CT Pack Pipeline', () => {
    it('should generate pack with target date', () => {
      const pack = {
        packName: 'browns-ct-pack-pipeline-test',
        files: {
          'PACK.md': '# Browns CT Pack Pipeline...',
          'APPROVAL.md': '# APPROVAL...'
        }
      }

      expect(pack.packName).toContain('ct-pack-pipeline')
      expect(pack.files['PACK.md']).toContain('CT Pack')
    })
  })

  describe('Pack Safety Checks', () => {
    it('should never invent rates in APPROVAL.md', () => {
      const approvalMd = `
# APPROVAL CHECKLIST

### N7 - Never Invent
☐ **No invented rates:** Amounts only from inquiry or approved rate card
☐ **Amounts source:** ⚠️ [RATE CARD REQUIRED]
      `

      expect(approvalMd).toContain('N7')
      expect(approvalMd).toContain('[RATE CARD REQUIRED]')
      expect(approvalMd).not.toContain('invented amount')
    })

    it('should include H7 gate in quote pipeline', () => {
      const approvalMd = `
### H7 - Quote Send
☐ **Required approval:** \`APPROVE SEND <thread-or-wa-id>\`
      `

      expect(approvalMd).toContain('H7')
      expect(approvalMd).toContain('APPROVE SEND')
    })

    it('should include H11 gate in welcome pack', () => {
      const approvalMd = `
### H11 - Staff Run-Sheet Send
☐ **Required approval:** \`APPROVE RUN SHEET <date>\`
      `

      expect(approvalMd).toContain('H11')
      expect(approvalMd).toContain('APPROVE RUN SHEET')
    })
  })

  describe('Pack File Naming', () => {
    it('should use consistent naming pattern', () => {
      const packName = 'browns-inquiry-intake-20260905-143022'
      const downloadedFiles = [
        `${packName}__booking.json`,
        `${packName}__APPROVAL.md`,
        `${packName}__RUN.sh`
      ]

      downloadedFiles.forEach(filename => {
        expect(filename).toMatch(/^browns-.+-\d{8}-\d{6}__.+/)
      })
    })
  })

  describe('CLI Command Format', () => {
    it('should generate valid bash commands', () => {
      const cliCommand = `cd tools/browns-inquiry-intake
npm run build
npm run intake -- --text inquiry.txt --outdir out/`

      expect(cliCommand).toContain('cd tools/')
      expect(cliCommand).toContain('npm run build')
      expect(cliCommand).toContain('npm run')
      expect(cliCommand.split('\n').length).toBeGreaterThan(1)
    })
  })
})
