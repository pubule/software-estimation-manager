import { Then } from '@cucumber/cucumber';
import * as assert from 'assert';

Then('there should be {int} vendors configured', function (expected: number) {
  const vendors = (global as any).window.app.configManager.getVendors();
  assert.strictEqual(vendors.length, expected);
});

Then('vendor {string} should be internal', function (vendorId: string) {
  const vendor = (global as any).window.app.configManager.getVendors().find((v: any) => v.id === vendorId);
  assert.ok(vendor, `Vendor ${vendorId} not found`);
  assert.strictEqual(vendor.isInternal, true);
});

Then('vendor {string} should not be internal', function (vendorId: string) {
  const vendor = (global as any).window.app.configManager.getVendors().find((v: any) => v.id === vendorId);
  assert.ok(vendor, `Vendor ${vendorId} not found`);
  assert.strictEqual(vendor.isInternal, false);
});

Then('vendor {string} should have {int} job clusters', function (vendorId: string, expected: number) {
  const vendor = (global as any).window.app.configManager.getVendors().find((v: any) => v.id === vendorId);
  assert.strictEqual(vendor.jobClusters.length, expected);
});

Then('rate for vendor {string} job cluster {string} seniority {string} should be {int}', function (vendorId: string, jcId: string, seniority: string, expected: number) {
  const rate = (global as any).window.app.configManager.getRate({ vendorId, jobCluster: jcId, seniority });
  assert.ok(rate, 'Rate not found');
  assert.strictEqual(rate.officialRate, expected);
});

Then('rate for vendor {string} should be null', function (vendorId: string) {
  const rate = (global as any).window.app.configManager.getRate({ vendorId, jobCluster: 'any', seniority: 'any' });
  assert.strictEqual(rate, null);
});

Then('there should be {int} team members', function (expected: number) {
  const config = this.loadFixture('config');
  const members = config.teams.flatMap((t: any) => t.members);
  assert.strictEqual(members.length, expected);
});

Then('team member {string} should have country {string}', function (memberId: string, expected: string) {
  const config = this.loadFixture('config');
  const members = config.teams.flatMap((t: any) => t.members);
  const member = members.find((m: any) => m.id === memberId);
  assert.ok(member, `Member ${memberId} not found`);
  assert.strictEqual(member.country, expected);
});
