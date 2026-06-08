module.exports = {
  default: {
    require: ['cucumber/support/**/*.js'],
    requireModule: ['tsx/cjs'],
    import: ['cucumber/step-definitions/**/*.ts'],
    format: ['progress-bar'],
    paths: ['features/**/*.feature'],
    timeout: 10000,
  },
  'version-history': {
    require: ['cucumber/support/**/*.js'],
    requireModule: ['tsx/cjs'],
    import: ['cucumber/step-definitions/**/*.ts'],
    format: ['progress-bar'],
    paths: ['features/version-history.feature'],
    timeout: 10000,
  },
  tickets: {
    require: ['cucumber/support/**/*.js'],
    requireModule: ['tsx/cjs'],
    import: ['cucumber/step-definitions/**/*.ts'],
    format: ['progress-bar'],
    paths: ['features/tickets.feature'],
    timeout: 10000,
  },
};
