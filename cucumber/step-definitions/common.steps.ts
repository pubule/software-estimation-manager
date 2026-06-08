import { Given, Then } from '@cucumber/cucumber';
import * as assert from 'assert';

Given('a project is loaded from fixture {string}', function (fixtureName: string) {
  this.loadProject(fixtureName);
});

Given('the configuration is loaded', function () {
  this.loadConfig('config');
});

Given('no project is loaded', function () {
  this.getState().setProject(null);
});

Then('the project should be marked as dirty', function () {
  assert.strictEqual(this.getState().isDirty, true);
});

Then('the project should not be marked as dirty', function () {
  assert.strictEqual(this.getState().isDirty, false);
});
