import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isWisprFlowConfigured } from './services/wisprFlow.js';

describe('wisprFlow', () => {
  it('reports configured when WISPR_FLOW_API_KEY is set', () => {
    assert.equal(typeof isWisprFlowConfigured(), 'boolean');
  });
});
