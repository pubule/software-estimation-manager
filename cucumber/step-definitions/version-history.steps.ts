import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import { VersionHistoryActions } from '../../src/renderer/react/actions/VersionHistoryActions.ts';

When('I create a version with reason {string}', async function (reason: string) {
  const actions = this.getActions(VersionHistoryActions);
  await actions.createVersion(reason);
});

Then('versions count should be {int}', function (expected: number) {
  const versions = this.getState().currentProject?.versions || [];
  assert.strictEqual(versions.length, expected);
});

Then('the latest version reason should be {string}', function (expected: string) {
  const versions = this.getState().currentProject?.versions || [];
  const latest = versions[versions.length - 1];
  assert.strictEqual(latest.reason, expected);
});

Then('the latest version should have {int} features', function (expected: number) {
  const versions = this.getState().currentProject?.versions || [];
  const latest = versions[versions.length - 1];
  const featureCount = latest.projectSnapshot?.features?.length || 0;
  assert.strictEqual(featureCount, expected);
});
