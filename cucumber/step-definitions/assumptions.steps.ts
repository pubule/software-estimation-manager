import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { AssumptionsActions } from '../../src/renderer/react/actions/AssumptionsActions.ts';

When('I add an assumption with description {string} and type {string} and impact {string}', function (description: string, type: string, impact: string) {
  const actions = this.getActions(AssumptionsActions);
  const id = actions.generateNextAssumptionId();
  actions.createAssumption({
    id,
    description,
    type: type as any,
    impact: impact as any,
  });
});

When('I edit assumption {string} with description {string} and impact {string}', function (id: string, description: string, impact: string) {
  const actions = this.getActions(AssumptionsActions);
  const assumptions = this.getState().currentProject?.assumptions || [];
  const existing = assumptions.find((a: any) => a.id === id);
  assert.ok(existing, `Assumption ${id} not found for editing`);
  actions.updateAssumption(id, { ...existing, description, impact });
});

When('I delete assumption {string}', function (id: string) {
  const actions = this.getActions(AssumptionsActions);
  actions.deleteAssumption(id);
});

Then('assumption {string} should have description {string}', function (id: string, expected: string) {
  const assumptions = this.getState().currentProject?.assumptions || [];
  const assumption = assumptions.find((a: any) => a.id === id);
  assert.ok(assumption, `Assumption ${id} not found`);
  assert.strictEqual(assumption.description, expected);
});

Then('assumption {string} should have impact {string}', function (id: string, expected: string) {
  const assumptions = this.getState().currentProject?.assumptions || [];
  const assumption = assumptions.find((a: any) => a.id === id);
  assert.ok(assumption, `Assumption ${id} not found`);
  assert.strictEqual(assumption.impact, expected);
});

Then('assumption at index {int} should have type {string}', function (index: number, expected: string) {
  const assumptions = this.getState().currentProject?.assumptions || [];
  assert.ok(assumptions.length > index, `Expected at least ${index + 1} assumptions, got ${assumptions.length}`);
  assert.strictEqual(assumptions[index]?.type, expected);
});

Then('adding assumption without description should fail validation', function () {
  const actions = this.getActions(AssumptionsActions);
  const result = actions.validateAssumptionData({ id: 'ASS-999', description: '', type: 'Technical', impact: 'Low' });
  assert.ok(!result.isValid, 'Expected validation to fail');
  assert.ok(result.errors.description, 'Expected description validation error');
});
