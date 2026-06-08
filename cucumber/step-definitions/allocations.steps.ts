import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';

When('I add a resource allocation for member {string} on project {string}', function (memberId: string, projectId: string) {
  const state = this.getState();
  const allocations = state.resourceAllocations || [];
  state.setResourceAllocations([
    ...allocations,
    { id: `alloc-${Date.now()}`, teamMemberId: memberId, projectId, monthlyAllocations: {} },
  ]);
});

When('I delete the resource allocation at index {int}', function (index: number) {
  const state = this.getState();
  const allocations = [...(state.resourceAllocations || [])];
  allocations.splice(index, 1);
  state.setResourceAllocations(allocations);
});

Then('resource allocations should contain {int} entries', function (expected: number) {
  const allocations = this.getState().resourceAllocations || [];
  assert.strictEqual(allocations.length, expected);
});
