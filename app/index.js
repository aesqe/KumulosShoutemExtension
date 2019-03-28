import { NativeModules, PermissionsAndroid, Platform } from "react-native";

import Kumulos from "kumulos-react-native";
import { ext } from "./const";
import { getExtensionSettings } from "shoutem.application";

// Constants `screens` (from extension.js) and `reducer` (from index.js)
// are exported via named export
// It is important to use those exact names

// export everything from extension.js
export * from "./extension";

// list of exports supported by shoutem can be found here: https://shoutem.github.io/docs/extensions/reference/extension-exports

function empty(v) {
  return !v || !v.length;
}

export function appDidFinishLaunching(app) {
  const store = app.getStore();
  const state = store.getState();
  const settings = getExtensionSettings(state, ext());

  if (!settings || empty(settings.apiKey) || empty(settings.secretKey)) {
    console.warn(
      "No Kumulos API key or secret key configured, skipping initialization!"
    );
    return;
  }

  Kumulos.initialize({
    apiKey: settings.apiKey,
    secretKey: settings.secretKey
  });

  if ("android" === Platform.OS) {
    setupLocationTrackingAndroid();
  }
}

async function setupLocationTrackingAndroid() {
  let result;
  try {
    result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location-based Content",
        message:
          "This app would like to use your location to enable relevant content and functionality"
      }
    );
  } catch (e) {
    console.error(e);
    return;
  }

  if (PermissionsAndroid.RESULTS.GRANTED !== result) {
    return;
  }

  NativeModules.KumulosShoutem.startLocationTracking();
}
