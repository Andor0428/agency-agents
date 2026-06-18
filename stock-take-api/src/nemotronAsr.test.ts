import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nemotronLanguageForLocale } from './services/nemotronAsr/index.js';

describe('Nemotron ASR helpers', () => {
  it('maps en-GB locale for British English', () => {
    assert.equal(nemotronLanguageForLocale('en-GB'), 'en-GB');
    assert.equal(nemotronLanguageForLocale(undefined), 'en-GB');
  });

  it('passes through other Nemotron locale codes', () => {
    assert.equal(nemotronLanguageForLocale('en-US'), 'en-US');
    assert.equal(nemotronLanguageForLocale('de-DE'), 'de-DE');
  });
});
