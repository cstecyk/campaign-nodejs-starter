var assert = require('chai').assert;
var expressApp = require('../app.js');
var devConfig = require('../config.json');

describe('Server initialization', function() {
  it('sets device config from config.json, when in development mode', function() {
    var appConfig = expressApp.get('connectedDeviceConfig');
    assert.equal(appConfig.assetURL, devConfig.development.assetURL);
    assert.equal(appConfig.assetZoneId, devConfig.development.assetZoneId);
    assert.equal(appConfig.uaaURL, devConfig.development.uaaUri);
    assert.equal(appConfig.uaaClientId, devConfig.development.clientId);
    assert.equal(appConfig.uaaBase64ClientCredential, devConfig.development.base64ClientCredential);
  });
});
