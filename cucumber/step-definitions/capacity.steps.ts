import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';

let lastWorkingDays: number = 0;

Then('the working days calculator should be loadable', function () {
  const WorkingDaysCalculator = require('../../src/renderer/js/components/working-days-calculator.js');
  const calc = new WorkingDaysCalculator();
  assert.ok(calc, 'WorkingDaysCalculator not available');
  assert.ok(typeof calc.calculateWorkingDays === 'function');
});

When('I calculate working days for January 2026 in Italy', function () {
  const WorkingDaysCalculator = require('../../src/renderer/js/components/working-days-calculator.js');
  const calc = new WorkingDaysCalculator();
  lastWorkingDays = calc.calculateWorkingDays(1, 2026, 'IT');
});

Then('working days should be between {int} and {int}', function (min: number, max: number) {
  assert.ok(lastWorkingDays >= min && lastWorkingDays <= max,
    `Working days ${lastWorkingDays} not between ${min} and ${max}`);
});
