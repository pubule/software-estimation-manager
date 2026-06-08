import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';

Then('the current project name should be {string}', function (expected: string) {
  assert.strictEqual(this.getState().currentProject.project.name, expected);
});

Then('the current project code should be {string}', function (expected: string) {
  assert.strictEqual(this.getState().currentProject.project.projectCode, expected);
});

Then('the store should have a current project', function () {
  assert.ok(this.getState().currentProject !== null);
});

Then('the store should not have a current project', function () {
  assert.strictEqual(this.getState().currentProject, null);
});

When('the project is cleared', function () {
  this.getState().setProject(null);
});

Then('assumptions count should be {int}', function (expected: number) {
  const assumptions = this.getState().currentProject?.assumptions || [];
  assert.strictEqual(assumptions.length, expected);
});

Then('the approval status should be {string}', function (expected: string) {
  const project = this.getState().currentProject;
  const status = project.project?.approvalStatus || project.approvalStatus;
  assert.strictEqual(status, expected);
});

When('I set approval status to {string}', function (status: string) {
  this.getState().setProjectApprovalStatus(status);
});
