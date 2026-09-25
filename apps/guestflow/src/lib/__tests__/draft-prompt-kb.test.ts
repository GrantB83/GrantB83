import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  buildDraftPrompt,
  formatKnowledgeForPrompt,
  NO_FACT_OUTSIDE_KB_INSTRUCTION,
} from '@/lib/property-knowledge'
import evalQuestions from '../../../__tests__/fixtures/kb-eval-questions.json'

describe('draft prompt knowledge injection', () => {
  const promptTemplate = readFileSync(
    path.join(process.cwd(), 'prompts', 'DRAFT_PROMPT.md'),
    'utf-8'
  )

  it('injects the knowledge block and the no-fact-outside-KB instruction', () => {
    const knowledge = formatKnowledgeForPrompt([
      {
        id: 1,
        tenant_id: 1,
        property: 'shared',
        section: 'checkin_checkout',
        key: 'check_in_from',
        value: 'From 14:00',
        source: 'test',
        last_updated_at: null,
        last_updated_by: null,
      },
    ])
    const prompt = buildDraftPrompt(promptTemplate, {
      fromNumber: '+27820000000',
      guestName: 'Alex',
      intent: 'general_question',
      confidence: 0.9,
      messageText: 'What time is check-in?',
      propertyKnowledge: knowledge,
    })

    expect(prompt).toContain(NO_FACT_OUTSIDE_KB_INSTRUCTION)
    expect(prompt).toContain('From 14:00')
    expect(prompt).toContain('What time is check-in?')
    expect(prompt).not.toContain('{property_knowledge}')
  })

  it('does not introduce facts that are absent from the knowledge base', () => {
    const knowledge = formatKnowledgeForPrompt([
      {
        id: 1,
        tenant_id: 1,
        property: 'shared',
        section: 'local_recommendations',
        key: 'restaurants',
        value: 'ask staff',
        source: 'test',
        last_updated_at: null,
        last_updated_by: null,
      },
    ])
    const prompt = buildDraftPrompt(promptTemplate, {
      fromNumber: '+27820000000',
      guestName: 'Alex',
      intent: 'general_question',
      confidence: 0.8,
      messageText: 'Where should we eat tonight? Is Harvest and High recommended?',
      propertyKnowledge: knowledge,
    })

    expect(prompt).toContain(NO_FACT_OUTSIDE_KB_INSTRUCTION)
    expect(prompt).toMatch(/ask staff/i)
    expect(prompt).not.toMatch(/Harvest and High is open until/i)
    expect(prompt).not.toContain('invented tasting menu')
  })

  it('has a 10-question GFM eval fixture', () => {
    expect(evalQuestions).toHaveLength(10)
    expect(evalQuestions.every((item) => item.question && item.id)).toBe(true)
  })
})
