import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { matchSubjects, parseSubjectsCSV, parseSubjectsTXT } from './subject-matcher.js';
import { FileIndexEntry } from './types.js';

test('matchSubjects - matches with common tokens', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'SARS-Tax-Return-2024.pdf',
      inferredEntities: ['sars'],
      inferredDates: ['2024'],
      extension: '.pdf',
      matchedSubjects: [],
      notes: ''
    }
  ];
  
  const subjects = [
    { subject: 'SARS Annual Tax Return Reminder' }
  ];
  
  const result = matchSubjects(entries, subjects);
  assert.equal(result[0].matchedSubjects.length, 1);
  assert.ok(result[0].matchedSubjects[0].includes('SARS'));
});

test('matchSubjects - no match with different tokens', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'plimmer-invoice.pdf',
      inferredEntities: ['plimmer'],
      inferredDates: [],
      extension: '.pdf',
      matchedSubjects: [],
      notes: ''
    }
  ];
  
  const subjects = [
    { subject: 'Charisse Medical Statement' }
  ];
  
  const result = matchSubjects(entries, subjects);
  assert.equal(result[0].matchedSubjects.length, 0);
});

test('matchSubjects - includes date in match', () => {
  const entries: FileIndexEntry[] = [
    {
      filename: 'CIPC-notice.pdf',
      inferredEntities: ['cipc'],
      inferredDates: [],
      extension: '.pdf',
      matchedSubjects: [],
      notes: ''
    }
  ];
  
  const subjects = [
    { subject: 'CIPC Annual Return Notice', date: '2024-03-15' }
  ];
  
  const result = matchSubjects(entries, subjects);
  assert.equal(result[0].matchedSubjects.length, 1);
  assert.ok(result[0].matchedSubjects[0].includes('2024-03-15'));
});

test('parseSubjectsCSV - valid CSV', () => {
  const csv = `Subject,Date
"SARS Tax Notice",2024-01-15
"CIPC Annual Return",2024-02-20`;
  
  const subjects = parseSubjectsCSV(csv);
  assert.equal(subjects.length, 2);
  assert.equal(subjects[0].subject, 'SARS Tax Notice');
  assert.equal(subjects[0].date, '2024-01-15');
  assert.equal(subjects[1].subject, 'CIPC Annual Return');
  assert.equal(subjects[1].date, '2024-02-20');
});

test('parseSubjectsCSV - CSV without date column', () => {
  const csv = `Subject
"Bank Statement"
"Invoice from Supplier"`;
  
  const subjects = parseSubjectsCSV(csv);
  assert.equal(subjects.length, 2);
  assert.equal(subjects[0].subject, 'Bank Statement');
  assert.equal(subjects[0].date, undefined);
});

test('parseSubjectsCSV - empty CSV', () => {
  const csv = `Subject`;
  const subjects = parseSubjectsCSV(csv);
  assert.equal(subjects.length, 0);
});

test('parseSubjectsTXT - multiple lines', () => {
  const txt = `SARS Tax Notice
CIPC Annual Return
Bank Statement`;
  
  const subjects = parseSubjectsTXT(txt);
  assert.equal(subjects.length, 3);
  assert.equal(subjects[0].subject, 'SARS Tax Notice');
  assert.equal(subjects[1].subject, 'CIPC Annual Return');
  assert.equal(subjects[2].subject, 'Bank Statement');
});

test('parseSubjectsTXT - empty lines ignored', () => {
  const txt = `SARS Tax Notice

CIPC Annual Return
`;
  
  const subjects = parseSubjectsTXT(txt);
  assert.equal(subjects.length, 2);
});
