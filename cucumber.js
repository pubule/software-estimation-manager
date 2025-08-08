module.exports = {
  default: {
    require: [
      'cucumber/support/**/*.js',
      'cucumber/step-definitions/**/*.js'
    ],
    format: ['progress'],
    paths: ['features/**/*.feature'],
    timeout: 60000
  }
};