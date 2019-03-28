const { getAppConfiguration } = require("@shoutem/build-tools");
const getExtensionsFromConfiguration = require("@shoutem/build-tools/get-extensions-from-configuration");

function getKumulosSettings() {
  const appConfig = getAppConfiguration();
  const extensions = getExtensionsFromConfiguration(appConfig);
  const kumulos = extensions.find(e => e.id.indexOf(".kumulos") > -1);
  if (!kumulos) {
    throw "Kumulos extension not included in appConfig.json, aborting!";
  }

  return kumulos.attributes.settings;
}

module.exports = {
  getKumulosSettings: getKumulosSettings
};
