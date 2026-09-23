import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import {
  toExcelDate,
  toFiniteNumber,
  DATE_FORMAT,
} from '../../src/excel-report-format.js';

let coercedDate: Date | null;
let coercedNumber: number | null;

/** Resolves the bare words "null" and "undefined" from an Examples table. */
function absentLiteral(word: string): null | undefined {
  return word === 'null' ? null : undefined;
}

When('I coerce {string} to an Excel date', function (raw: string) {
  coercedDate = toExcelDate(raw);
});

When('I coerce the literal {word} to an Excel date', function (word: string) {
  coercedDate = toExcelDate(absentLiteral(word));
});

Then('the coerced date is a Date whose ISO day is {string}', function (expected: string) {
  assert.ok(coercedDate instanceof Date, 'expected a Date instance');
  assert.strictEqual((coercedDate as Date).toISOString().slice(0, 10), expected);
});

Then('the coerced date is null', function () {
  assert.strictEqual(coercedDate, null);
});

When('I coerce {string} to a finite number', function (raw: string) {
  coercedNumber = toFiniteNumber(raw);
});

When('I coerce the literal {word} to a finite number', function (word: string) {
  coercedNumber = toFiniteNumber(absentLiteral(word));
});

Then('the coerced number is null', function () {
  assert.strictEqual(coercedNumber, null);
});

Then('the coerced number is {float}', function (expected: number) {
  assert.strictEqual(coercedNumber, expected);
});

Then('the date number format is {string}', function (expected: string) {
  assert.strictEqual(DATE_FORMAT, expected);
});
