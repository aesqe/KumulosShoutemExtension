const {
  getAppGradlePath,
  getMainApplicationPath,
  getAppDelegatePath,
  getPodfileTemplatePath,
  inject,
  replace,
  ANCHORS,
  projectPath
} = require("@shoutem/build-tools");
const path = require("path");
const fs = require("fs");

const consts = require("./consts");
const { getKumulosSettings } = require("./config");

function empty(v) {
  return !v || !v.length;
}

function settingsValid(settings) {
  return settings && !empty(settings.apiKey) && !empty(settings.secretKey);
}

const {
  getProjectInfoPlist,
  writePlist,
  mergeKumulosPlist
} = require("./plist-helper");

function injectIos() {
  const appDelegatePath = getAppDelegatePath({ cwd: projectPath });
  const podfilePath = getPodfileTemplatePath({ cwd: projectPath });

  inject(
    appDelegatePath,
    ANCHORS.IOS.APP_DELEGATE.IMPORT,
    consts.ios.delegateImports
  );

  inject(
    appDelegatePath,
    ANCHORS.IOS.APP_DELEGATE.BODY,
    consts.ios.delegateBody
  );

  inject(
    podfilePath,
    ANCHORS.IOS.PODFILE.EXTENSION_DEPENDENCIES,
    consts.ios.podDeps
  );

  replace(
    appDelegatePath,
    consts.ios.findDelegateLine,
    consts.ios.replaceDelegateLine
  );
  replace(
    appDelegatePath,
    consts.ios.findDidLaunch,
    consts.ios.replaceDidLaunch
  );

  const settings = getKumulosSettings();
  if (!settingsValid(settings)) {
    console.error("Kumulos settings not found, skipping iOS config");
    return;
  }

  mergeKumulosPlist();
  // Inject iBeacon vendor UUID
  const nearBeeApiKey = settings.nearBeeApiKey || "";
  const nearBeeOrgId = settings.nearBeeOrgId || "";

  const { projectInfoPlistPath, projectPlist } = getProjectInfoPlist();
  projectPlist["co.nearbee.api_key"] = nearBeeApiKey;
  projectPlist["co.nearbee.organization_id"] = nearBeeOrgId;
  writePlist(projectInfoPlistPath, projectPlist);
  console.info(`Kumulos injected NearBee creds`);
}

function injectAndroid() {
  const settings = getKumulosSettings();

  const appGradlePath = getAppGradlePath({ cwd: projectPath });
  const appPath = getMainApplicationPath({ cwd: projectPath });
  // Gradle tweaks
  const nearBeeOrgId = settings ? settings.nearBeeOrgId || "" : "";
  const nearBeeApiKey = settings ? settings.nearBeeApiKey || "" : "";
  inject(
    appGradlePath,
    ANCHORS.ANDROID.GRADLE.APP.ANDROID_END,
    `
    // Kumulos SDK start
    defaultConfig {
      manifestPlaceholders = [
            nearbee_org_id: '${nearBeeOrgId}',
            nearbee_api_key: '${nearBeeApiKey}'
      ]
    }

    packagingOptions {
        exclude 'META-INF/NOTICE'
        exclude 'META-INF/ASL2.0'
        exclude 'META-INF/LICENSE'
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    // Kumulos SDK end
  `
  );
  inject(
    appGradlePath,
    ANCHORS.ANDROID.GRADLE.APP.DEPENDENCIES,
    `
    // Kumulos SDK start
    debugImplementation 'com.kumulos.android:kumulos-android-debug:6.0.0-shoutem'
    releaseImplementation 'com.kumulos.android:kumulos-android-release:6.0.0-shoutem'

    implementation 'co.nearbee:nearbeesdk:0.1.6'
    // Kumulos SDK end
  `
  );
  // imports
  inject(
    appPath,
    ANCHORS.ANDROID.MAIN_APPLICATION.IMPORT,
    `
import com.kumulos.android.KumulosConfig;
import com.kumulos.android.Kumulos;
`
  );

  if (!settingsValid(settings) || empty(settings.fcmGoogleServicesJson)) {
    console.error("Kumulos settings not found, skipping Android config");
    return;
  }

  inject(
    appGradlePath,
    ANCHORS.ANDROID.GRADLE.APP.PLUGINS,
    `
    apply plugin: "com.google.gms.google-services"
  `
  );

  // init code
  const apiKey = settings.apiKey || "";
  const secretKey = settings.secretKey || "";
  inject(
    appPath,
    ANCHORS.ANDROID.MAIN_APPLICATION.ON_CREATE_END,
    `
KumulosConfig kcfg = new KumulosConfig.Builder("${apiKey}", "${secretKey}").build();
Kumulos.initialize(this, kcfg);
Kumulos.pushRegister(this);
  `
  );

  writeGoogleServicesFile(settings);
}

function writeGoogleServicesFile(settings) {
  const androidAppDir = path.join(projectPath, "android", "app");
  const outFile = path.join(androidAppDir, "google-services.json");
  fs.writeFileSync(outFile, settings.fcmGoogleServicesJson);
}

function injectKumulos() {
  injectIos();
  injectAndroid();
}

module.exports = {
  injectKumulos
};
