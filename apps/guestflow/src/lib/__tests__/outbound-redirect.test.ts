import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { resolveOutboundRecipient, getOutboundStatus } from '../outbound-redirect'

describe('outbound-redirect', () => {
  // Store original env to restore after each test
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset env before each test
    delete process.env.OUTBOUND_MODE
    delete process.env.OUTBOUND_REDIRECT_TO_WA
    delete process.env.OUTBOUND_REDIRECT_TO_EMAIL
    delete process.env.OUTBOUND_LIVE_CLEAR
  })

  afterEach(() => {
    // Restore original env after each test
    process.env = { ...originalEnv }
  })

  describe('resolveOutboundRecipient', () => {
    describe('US1: Redirect mode with sinks configured', () => {
      it('should redirect WhatsApp to sink when mode=redirect and WA sink set', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'
        process.env.OUTBOUND_REDIRECT_TO_EMAIL = 'grant830318@gmail.com'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result).toEqual({
          to: '+15124064300',
          redirected: true,
          intendedTo: '+27821234567',
          mode: 'redirect'
        })
      })

      it('should redirect email to sink when mode=redirect and email sink set', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'
        process.env.OUTBOUND_REDIRECT_TO_EMAIL = 'grant830318@gmail.com'

        const result = resolveOutboundRecipient({
          channel: 'email',
          intendedTo: 'guest@example.com'
        })

        expect(result).toEqual({
          to: 'grant830318@gmail.com',
          redirected: true,
          intendedTo: 'guest@example.com',
          mode: 'redirect'
        })
      })

      it('should redirect when MODE is uppercase REDIRECT', () => {
        process.env.OUTBOUND_MODE = 'REDIRECT'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result.redirected).toBe(true)
        expect(result.to).toBe('+15124064300')
      })
    })

    describe('US2: Fail-closed missing sink', () => {
      it('should throw when mode=redirect and WA sink is missing', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_EMAIL = 'grant830318@gmail.com'
        // OUTBOUND_REDIRECT_TO_WA is missing

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set')
      })

      it('should throw when mode=redirect and email sink is missing', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'
        // OUTBOUND_REDIRECT_TO_EMAIL is missing

        expect(() => {
          resolveOutboundRecipient({
            channel: 'email',
            intendedTo: 'guest@example.com'
          })
        }).toThrow('Redirect enabled but OUTBOUND_REDIRECT_TO_EMAIL not set')
      })

      it('should throw when mode=redirect and WA sink is empty string', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '   ' // Empty after trim

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Redirect enabled but OUTBOUND_REDIRECT_TO_WA not set')
      })
    })

    describe('US3: Live mode with LIVE_CLEAR gate', () => {
      it('should send to original guest when mode=live and LIVE_CLEAR=true', () => {
        process.env.OUTBOUND_MODE = 'live'
        process.env.OUTBOUND_LIVE_CLEAR = 'true'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result).toEqual({
          to: '+27821234567',
          redirected: false,
          intendedTo: '+27821234567',
          mode: 'live'
        })
      })

      it('should send to original guest for email when mode=live and LIVE_CLEAR=true', () => {
        process.env.OUTBOUND_MODE = 'live'
        process.env.OUTBOUND_LIVE_CLEAR = 'true'

        const result = resolveOutboundRecipient({
          channel: 'email',
          intendedTo: 'guest@example.com'
        })

        expect(result).toEqual({
          to: 'guest@example.com',
          redirected: false,
          intendedTo: 'guest@example.com',
          mode: 'live'
        })
      })

      it('should throw when mode=live and LIVE_CLEAR=false', () => {
        process.env.OUTBOUND_MODE = 'live'
        process.env.OUTBOUND_LIVE_CLEAR = 'false'

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Live mode requires OUTBOUND_LIVE_CLEAR=true')
      })

      it('should throw when mode=live and LIVE_CLEAR is missing', () => {
        process.env.OUTBOUND_MODE = 'live'
        // OUTBOUND_LIVE_CLEAR is missing

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Live mode requires OUTBOUND_LIVE_CLEAR=true')
      })

      it('should throw when mode=live and LIVE_CLEAR is empty string', () => {
        process.env.OUTBOUND_MODE = 'live'
        process.env.OUTBOUND_LIVE_CLEAR = ''

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Live mode requires OUTBOUND_LIVE_CLEAR=true')
      })

      it('should throw when mode=live and LIVE_CLEAR=TRUE (uppercase)', () => {
        process.env.OUTBOUND_MODE = 'live'
        process.env.OUTBOUND_LIVE_CLEAR = 'TRUE' // Must be lowercase "true"

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '+27821234567'
          })
        }).toThrow('Live mode requires OUTBOUND_LIVE_CLEAR=true')
      })
    })

    describe('US3: Unknown/missing OUTBOUND_MODE defaults to redirect', () => {
      it('should default to redirect when OUTBOUND_MODE is missing', () => {
        // OUTBOUND_MODE is not set
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result.mode).toBe('redirect')
        expect(result.redirected).toBe(true)
        expect(result.to).toBe('+15124064300')
      })

      it('should default to redirect when OUTBOUND_MODE is unknown value', () => {
        process.env.OUTBOUND_MODE = 'test_mode' // Unknown value
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result.mode).toBe('redirect')
        expect(result.redirected).toBe(true)
        expect(result.to).toBe('+15124064300')
      })

      it('should default to redirect when OUTBOUND_MODE is empty string', () => {
        process.env.OUTBOUND_MODE = '   ' // Empty after trim
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        const result = resolveOutboundRecipient({
          channel: 'whatsapp',
          intendedTo: '+27821234567'
        })

        expect(result.mode).toBe('redirect')
        expect(result.redirected).toBe(true)
      })
    })

    describe('Input validation', () => {
      it('should throw when channel is invalid', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        expect(() => {
          resolveOutboundRecipient({
            channel: 'invalid_channel' as any,
            intendedTo: '+27821234567'
          })
        }).toThrow('Invalid channel: invalid_channel')
      })

      it('should throw when intendedTo is empty', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: ''
          })
        }).toThrow('intendedTo is required')
      })

      it('should throw when intendedTo is whitespace only', () => {
        process.env.OUTBOUND_MODE = 'redirect'
        process.env.OUTBOUND_REDIRECT_TO_WA = '+15124064300'

        expect(() => {
          resolveOutboundRecipient({
            channel: 'whatsapp',
            intendedTo: '   '
          })
        }).toThrow('intendedTo is required')
      })
    })
  })

  describe('getOutboundStatus', () => {
    it('should return mode=redirect and redirectStatus=on when mode=redirect', () => {
      process.env.OUTBOUND_MODE = 'redirect'

      const status = getOutboundStatus()

      expect(status).toEqual({
        mode: 'redirect',
        redirectStatus: 'on'
      })
    })

    it('should return mode=live and redirectStatus=off when mode=live and LIVE_CLEAR=true', () => {
      process.env.OUTBOUND_MODE = 'live'
      process.env.OUTBOUND_LIVE_CLEAR = 'true'

      const status = getOutboundStatus()

      expect(status).toEqual({
        mode: 'live',
        redirectStatus: 'off'
      })
    })

    it('should return mode=live and redirectStatus=blocked when mode=live and LIVE_CLEAR=false', () => {
      process.env.OUTBOUND_MODE = 'live'
      process.env.OUTBOUND_LIVE_CLEAR = 'false'

      const status = getOutboundStatus()

      expect(status).toEqual({
        mode: 'live',
        redirectStatus: 'blocked'
      })
    })

    it('should return mode=live and redirectStatus=blocked when mode=live and LIVE_CLEAR missing', () => {
      process.env.OUTBOUND_MODE = 'live'
      // OUTBOUND_LIVE_CLEAR is missing

      const status = getOutboundStatus()

      expect(status).toEqual({
        mode: 'live',
        redirectStatus: 'blocked'
      })
    })

    it('should return mode=redirect and redirectStatus=on when OUTBOUND_MODE is missing (default)', () => {
      // All env vars missing

      const status = getOutboundStatus()

      expect(status).toEqual({
        mode: 'redirect',
        redirectStatus: 'on'
      })
    })

    it('should return mode=redirect when OUTBOUND_MODE is unknown value', () => {
      process.env.OUTBOUND_MODE = 'unknown'

      const status = getOutboundStatus()

      expect(status.mode).toBe('redirect')
      expect(status.redirectStatus).toBe('on')
    })
  })
})
