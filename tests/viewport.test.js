import test from 'node:test';
import assert from 'node:assert/strict';
import { panelSide } from '../src/viewport.js';
test('upgrades choose the opposite world side, with stable central selection', () => {
  assert.equal(panelSide(145), 'right');
  assert.equal(panelSide(820), 'left');
  assert.equal(panelSide(480), 'right');
  assert.equal(panelSide(480, 'left'), 'left');
  assert.equal(panelSide(479, 'left'), 'right');
  assert.equal(panelSide(481, 'right'), 'left');
});
