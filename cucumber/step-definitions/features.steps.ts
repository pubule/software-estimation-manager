import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { FeatureActions } from '../../src/renderer/react/actions/FeatureActions.ts';

When('I add a feature with name {string} and manDays {int}', function (name: string, manDays: number) {
  const actions = this.getActions(FeatureActions);
  actions.addFeature({
    id: `F-${Date.now()}`,
    name,
    description: '',
    category: 'General',
    featureType: 'New Development',
    supplier: 'vendor-internal',
    manDays,
  });
});

When('I delete feature at index {int}', function (index: number) {
  const actions = this.getActions(FeatureActions);
  actions.deleteFeature(index);
});

When('I update feature at index {int} with name {string} and manDays {int}', function (index: number, name: string, manDays: number) {
  const actions = this.getActions(FeatureActions);
  const existing = this.getState().currentProject.features[index];
  actions.updateFeature(index, { ...existing, name, manDays });
});

When('I duplicate feature at index {int}', function (index: number) {
  const actions = this.getActions(FeatureActions);
  const original = this.getState().currentProject.features[index];
  // duplicateFeature only opens modal with pre-populated data.
  // Simulate the full flow: call duplicateFeature, then addFeature with a copy.
  actions.duplicateFeature(original);
  actions.addFeature({
    ...original,
    id: `${original.id}-copy`,
    name: `${original.name} - Copy`,
  });
});

Then('features count should be {int}', function (expected: number) {
  const features = this.getState().currentProject?.features || [];
  assert.strictEqual(features.length, expected);
});

Then('feature at index {int} should have name {string}', function (index: number, expected: string) {
  const feature = this.getState().currentProject.features[index];
  assert.strictEqual(feature.name, expected);
});

Then('feature at index {int} should have manDays {int}', function (index: number, expected: number) {
  const feature = this.getState().currentProject.features[index];
  assert.strictEqual(feature.manDays, expected);
});

Then('feature at index {int} should have role {string}', function (index: number, expected: string) {
  const feature = this.getState().currentProject.features[index];
  assert.strictEqual(feature.role, expected);
});

Then('the last feature name should contain {string}', function (substring: string) {
  const features = this.getState().currentProject.features;
  const last = features[features.length - 1];
  assert.ok(last.name.includes(substring), `Expected "${last.name}" to contain "${substring}"`);
});

Then('adding a feature should throw an error', function () {
  const actions = this.getActions(FeatureActions);
  assert.throws(() => {
    actions.addFeature({
      id: 'F-fail',
      name: 'Fail',
      description: '',
      category: 'General',
      featureType: 'New Development',
      supplier: 'vendor-internal',
      manDays: 5,
    });
  });
});
