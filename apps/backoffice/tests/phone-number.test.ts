import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPhoneNumber } from '../src/browser/phone-number.ts';

test('French local and international inputs have the same national display', () => {
  for (const value of [
    '0612345678',
    '06.12.34.56.78',
    '06 12 34 56 78',
    '+33612345678',
    '0033612345678',
  ]) {
    assert.equal(formatPhoneNumber(value), '06 12 34 56 78');
  }
});

test('foreign country codes and extensions remain visible', () => {
  assert.equal(formatPhoneNumber('+442079460018'), '+44 20 7946 0018');
  assert.equal(formatPhoneNumber('+14155552671'), '+1 415 555 2671');
  assert.equal(
    formatPhoneNumber('+442079460018 ext. 123'),
    '+44 20 7946 0018 x123'
  );
});

test('invalid, incomplete or annotated values are preserved rather than guessed', () => {
  for (const value of [
    '1234',
    '+999123456789',
    'Téléphone : 0612345678',
    'texte',
  ])
    assert.equal(formatPhoneNumber(value), value);
  assert.equal(formatPhoneNumber(undefined), '');
  assert.equal(formatPhoneNumber(''), '');
});
