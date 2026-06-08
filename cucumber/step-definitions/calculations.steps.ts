import { Given, When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { CalculatorFactory } from '../../src/renderer/react/actions/calculators/CalculatorFactory';

let factory: CalculatorFactory | null = null;
let calcResult: any = null;

Given('working package mode is enabled', function () {
  const state = this.getState();
  const updated = {
    ...state.currentProject,
    workingPackageData: { enabled: true, gtoTotal: 100000, gdsTotal: 50000 },
  };
  state.setProject(updated);
});

When('I create a calculator factory', function () {
  factory = new CalculatorFactory({
    store: (global as any).window.appStore,
    configManager: (global as any).window.app.configManager,
  });
});

When('I reset the calculator factory', function () {
  CalculatorFactory.resetInstance();
});

Then('the calculation mode should be {string}', function (expected: string) {
  assert.ok(factory, 'Factory not created');
  assert.strictEqual(factory!.getCalculationMode(), expected);
});

Then('creating a factory without dependencies should throw', function () {
  assert.throws(() => CalculatorFactory.getInstance());
});

When('I create a calculator and run calculation', function () {
  factory = new CalculatorFactory({
    store: (global as any).window.appStore,
    configManager: (global as any).window.app.configManager,
  });
  const calculator = factory.createCalculator();
  calcResult = calculator.calculate();
});

Then('the calculation result should have vendor costs', function () {
  assert.ok(calcResult, 'No calculation result');
  assert.ok(Array.isArray(calcResult.vendorCosts), 'vendorCosts is not an array');
});

Then('the calculation result should have KPI data', function () {
  assert.ok(calcResult, 'No calculation result');
  assert.ok(calcResult.kpiData, 'No KPI data in result');
});
