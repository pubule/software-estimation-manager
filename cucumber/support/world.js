const { setWorldConstructor } = require('@cucumber/cucumber');
const { setupWindowMock, resetStore, setConfigManager } = require('./mocks/window-mock');
const path = require('path');
const fs = require('fs');

class TestWorld {
  constructor() {
    this.store = null;
    this._actions = {};
  }

  initStore() {
    setupWindowMock();
    this.store = resetStore();
    return this.store;
  }

  getState() {
    return this.store.getState();
  }

  loadFixture(name) {
    const fixturePath = path.join(__dirname, '..', 'fixtures', `${name}.json`);
    const data = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    return data;
  }

  loadProject(fixtureName) {
    const project = this.loadFixture(fixtureName);
    this.getState().setProject(project);
    return project;
  }

  loadConfig(fixtureName) {
    const config = this.loadFixture(fixtureName || 'config');
    setConfigManager(config);
    return config;
  }

  getActions(ActionClass) {
    const name = ActionClass.name;
    if (!this._actions[name]) {
      this._actions[name] = new ActionClass();
    }
    return this._actions[name];
  }
}

setWorldConstructor(TestWorld);
module.exports = TestWorld;
