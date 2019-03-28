package com.kumulos.android.shoutem;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.location.Location;

import com.google.android.gms.location.LocationResult;
import com.kumulos.android.Kumulos;

public class LocationReceiver extends BroadcastReceiver {
    static final String ACTION_PROCESS_UPDATE = "com.kumulos.android.shoutem.LocationReceiver.PROCESS_UPDATE";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (null == intent) {
            return;
        }

        String action = intent.getAction();

        if (null == action) {
            return;
        }

        switch (action) {
            case ACTION_PROCESS_UPDATE:
                LocationResult result = LocationResult.extractResult(intent);
                if (null == result) {
                    return;
                }

                for (Location location : result.getLocations()) {
                    Kumulos.sendLocationUpdate(context, location);
                }
                break;
        }
    }
}
