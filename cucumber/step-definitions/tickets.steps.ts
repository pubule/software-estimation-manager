import { When, Then } from '@cucumber/cucumber';
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TicketDashboardActions } from '../../src/renderer/react/actions/TicketDashboardActions.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

When('I import tickets from fixture {string}', function (fixtureName: string) {
  const csvPath = path.join(__dirname, '..', 'fixtures', fixtureName);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const actions = this.getActions(TicketDashboardActions);
  actions.importCsvData(csvContent);
});

When('I calculate ticket metrics', function () {
  const actions = this.getActions(TicketDashboardActions);
  actions.calculateMetrics();
});

When('I generate alerts', function () {
  const actions = this.getActions(TicketDashboardActions);
  actions.generateAlerts();
});

Then('ticket count should be {int}', function (expected: number) {
  const tickets = this.getState().ticketData || [];
  assert.strictEqual(tickets.length, expected);
});

Then('total tickets metric should be {int}', function (expected: number) {
  const metrics = this.getState().dashboardMetrics;
  assert.strictEqual(metrics?.totalTickets, expected);
});

Then('closed tickets metric should be {int}', function (expected: number) {
  const metrics = this.getState().dashboardMetrics;
  assert.strictEqual(metrics?.closedTickets, expected);
});

Then('open tickets metric should be {int}', function (expected: number) {
  const metrics = this.getState().dashboardMetrics;
  assert.strictEqual(metrics?.openTickets, expected);
});

Then('operator {string} should have resolved tickets', function (operator: string) {
  const operators = this.getState().operatorMetrics || [];
  const op = operators.find((o: any) => o.operatorName === operator);
  assert.ok(op, `Operator ${operator} not found in: ${JSON.stringify(operators.map((o: any) => o.operatorName))}`);
  assert.ok(op.resolvedTickets > 0, `Operator ${operator} has no resolved tickets`);
});

Then('alerts should include unassigned ticket warnings', function () {
  const alerts = this.getState().dashboardAlerts || [];
  assert.ok(alerts.length > 0, 'No alerts generated');
});
