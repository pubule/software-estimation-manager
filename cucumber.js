module.exports = {
  default: {
    require: ['cucumber/support/**/*.js'],
    requireModule: ['tsx/cjs'],
    import: ['cucumber/step-definitions/**/*.ts'],
    format: ['progress-bar'],
    paths: ['features/**/*.feature'],
    timeout: 10000,
  },
};
