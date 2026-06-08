module.exports = {
  default: {
    require: ['cucumber/support/**/*.js', 'cucumber/step-definitions/**/*.ts'],
    requireModule: ['tsx/cjs'],
    format: ['progress-bar'],
    paths: ['features/**/*.feature'],
    timeout: 10000,
  },
};
