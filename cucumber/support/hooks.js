const { Before, After } = require('@cucumber/cucumber');

Before(function () {
  this.initStore();
});

After(function () {
  this._actions = {};
});
