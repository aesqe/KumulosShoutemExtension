
package com.kumulos.android.shoutem;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.text.TextUtils;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.kumulos.android.Kumulos;

import java.util.ArrayList;

import co.nearbee.NearBee;
import co.nearbee.NearBeeBeacon;
import co.nearbee.NearBeeException;
import co.nearbee.NearBeeListener;

public class KumulosShoutemModule extends ReactContextBaseJavaModule {

    private static final long LOC_UPDATE_MS = 3 * 60000;
    private static final long LOC_FASTEST_MS = 30000;
    private static final long LOC_MAX_WAIT_MS = 5 * 60000;

    private final ReactApplicationContext reactContext;

    public KumulosShoutemModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "KumulosShoutem";
    }

    @ReactMethod
    public void startLocationTracking() {
        FusedLocationProviderClient client = LocationServices.getFusedLocationProviderClient(reactContext);

        LocationRequest request = new LocationRequest();
        request.setInterval(LOC_UPDATE_MS);
        request.setFastestInterval(LOC_FASTEST_MS);
        request.setMaxWaitTime(LOC_MAX_WAIT_MS);
        request.setPriority(LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY);

        Intent intent = new Intent(reactContext, LocationReceiver.class);
        intent.setAction(LocationReceiver.ACTION_PROCESS_UPDATE);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(reactContext, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT);

        try {
            client.requestLocationUpdates(request, pendingIntent);
        } catch (SecurityException e) {
            e.printStackTrace();
        }

        this.startNearBeeScanning();
    }

    private void startNearBeeScanning() {
        if (!this.isNearBeeConfigured()) {
            return;
        }

        NearBee.Builder builder = new NearBee.Builder(reactContext);
        builder.setCallBackInterval(15)
                .setBackgroundNotificationsEnabled(true);
        NearBee nearBee = builder.build();

        nearBee.startScanning(new NearBeeListener() {
            @Override
            public void onUpdate(ArrayList<NearBeeBeacon> beaconsInRange) {
                // Noop
            }

            @Override
            public void onBeaconLost(ArrayList<NearBeeBeacon> lostBeacons) {
                // Noop
            }

            @Override
            public void onBeaconFound(ArrayList<NearBeeBeacon> foundBeacons) {
                for (NearBeeBeacon beacon : foundBeacons) {
                    String uid = beacon.getEddystoneUID();
                    String hexNamespace = uid.substring(0, 20);
                    String hexInstance = uid.substring(20);
                    Kumulos.trackEddystoneBeaconProximity(reactContext, hexNamespace, hexInstance, null);
                }
            }

            @Override
            public void onError(NearBeeException exception) {
                exception.printStackTrace();
            }
        });
    }

    private boolean isNearBeeConfigured() {
        String pkg = this.reactContext.getPackageName();

        ApplicationInfo info = null;
        try {
            info = this.reactContext.getPackageManager().getApplicationInfo(pkg, PackageManager.GET_META_DATA);
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }

        Bundle meta = info.metaData;
        String key = meta.getString("co.nearbee.api_key");
        String org = meta.getString("co.nearbee.organization_id");

        if (TextUtils.isEmpty(key) || TextUtils.isEmpty(org)) {
            return false;
        }

        return true;
    }
}