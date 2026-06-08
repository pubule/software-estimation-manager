const common = {
  paths: ['features/**/*.feature'],
  require: ['cucumber/support/**/*.js', 'cucumber/step-definitions/**/*.ts'],
  requireModule: ['tsx/cjs'],
  format: ['progress-bar'],
  timeout: 10000,
};

module.exports = {
  default: common,
  features: { ...common, paths: ['features/features.feature'] },
  projects: { ...common, paths: ['features/projects.feature'] },
  phases: { ...common, paths: ['features/phases.feature'] },
  calculations: { ...common, paths: ['features/calculations.feature'] },
  capacity: { ...common, paths: ['features/capacity.feature'] },
  allocations: { ...common, paths: ['features/allocations.feature'] },
  assumptions: { ...common, paths: ['features/assumptions.feature'] },
  'version-history': { ...common, paths: ['features/version-history.feature'] },
  tickets: { ...common, paths: ['features/tickets.feature'] },
  configuration: { ...common, paths: ['features/configuration.feature'] },
};
