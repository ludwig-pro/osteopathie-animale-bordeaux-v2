import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampColumnWidth,
  contactColumns,
  maximumColumnWidth,
  parseColumnWidths,
} from '../src/browser/contact-column-widths.ts';

test('invalid or missing browser preferences cannot hide a contact column', () => {
  const defaults = parseColumnWidths(null);
  for (const raw of ['{broken', 'null', '[]', 'true', '"text"'])
    assert.deepEqual(parseColumnWidths(raw), defaults);
  const restored = parseColumnWidths(
    JSON.stringify({
      name: 412,
      phone: -200,
      animals: 9000,
      appointment: 'bad',
      unknown: 600,
    })
  );
  assert.equal(restored.name, 412);
  assert.equal(restored.phone, contactColumns[1].min);
  assert.equal(restored.animals, maximumColumnWidth);
  assert.equal(restored.appointment, defaults.appointment);
  assert.equal(restored.lists, defaults.lists);
  assert.equal(Object.keys(restored).length, contactColumns.length);
});

test('column widths stay within readable limits and invalid numbers restore defaults', () => {
  for (const column of contactColumns) {
    assert.equal(clampColumnWidth(column, -1000), column.min);
    assert.equal(clampColumnWidth(column, 10000), maximumColumnWidth);
    assert.equal(clampColumnWidth(column, 250.7), 251);
    assert.equal(clampColumnWidth(column, NaN), column.width);
    assert.equal(clampColumnWidth(column, Infinity), column.width);
    assert.equal(clampColumnWidth(column, column.width), column.width);
  }
});
