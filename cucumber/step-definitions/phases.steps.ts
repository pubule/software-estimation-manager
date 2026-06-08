import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { PhasesActions } from '../../src/renderer/react/actions/PhasesActions.ts';

Then('there should be {int} phase definitions', function (expected: number) {
  const defs = this.getState().phaseDefinitions;
  assert.strictEqual(defs.length, expected);
});

Then('phase {string} should exist', function (phaseId: string) {
  const defs = this.getState().phaseDefinitions;
  assert.ok(defs.find((p: any) => p.id === phaseId), `Phase ${phaseId} not found`);
});

When('I update phase {string} man days to {int}', async function (phaseId: string, manDays: number) {
  const actions = this.getActions(PhasesActions);
  await actions.updatePhaseManDays(phaseId, manDays);
});

Then('phase {string} should have man days {int}', function (phaseId: string, expected: number) {
  const state = this.getState();
  const phases = state.currentPhases || state.phaseDefinitions;
  const phase = phases.find((p: any) => p.id === phaseId);
  assert.strictEqual(phase?.manDays, expected);
});

When('I calculate phases totals', function () {
  const actions = this.getActions(PhasesActions);
  actions.calculateTotals();
});

Then('total phase man days should be greater than {int}', function (min: number) {
  const totals = this.getState().phasesTotals;
  assert.ok(totals?.manDays > min, `Total ${totals?.manDays} not > ${min}`);
});

When('I calculate the development phase', function () {
  const actions = this.getActions(PhasesActions);
  actions.calculateDevelopmentPhase();
});

Then('the development phase man days should equal the sum of feature manDays', function () {
  const state = this.getState();
  const features = state.currentProject?.features || [];
  const expectedTotal = features.reduce((sum: number, f: any) => sum + (parseFloat(f.manDays) || 0), 0);
  const phases = state.currentPhases || state.phaseDefinitions;
  const devPhase = phases.find((p: any) => p.id === 'development');
  assert.strictEqual(devPhase?.manDays, expectedTotal);
});

Then('the development phase should exist', function () {
  const phases = this.getState().currentPhases || this.getState().phaseDefinitions;
  const devPhase = phases.find((p: any) => p.id === 'development');
  assert.ok(devPhase, 'Development phase not found');
});
