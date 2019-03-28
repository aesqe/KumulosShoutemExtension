const iOSLocationDelegateCode = `
#pragma mark - Location handling
- (void) setupLocationMonitoring:(NSDictionary*) launchOptions {
  self.lm = [CLLocationManager new];
  self.lm.allowsBackgroundLocationUpdates = YES;
  self.lm.pausesLocationUpdatesAutomatically = NO;
  [self.lm setDelegate:self];

  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];

  if (kCLAuthorizationStatusNotDetermined == status) {
    [self.lm requestAlwaysAuthorization];
  }
  else if (kCLAuthorizationStatusAuthorizedAlways == status) {
    [self startLocationMonitoring];
  }
}

- (void) startLocationMonitoring {
  if (CLLocationManager.significantLocationChangeMonitoringAvailable) {
    [self.lm startMonitoringSignificantLocationChanges];
  }

  self.nearBee = [NearBee initNearBee];
  [self.nearBee setDelegate:self];
  [self.nearBee startScanning];
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
  if (kCLAuthorizationStatusAuthorizedAlways == status) {
    [self startLocationMonitoring];
  }
  else {
    if (CLLocationManager.significantLocationChangeMonitoringAvailable) {
      [self.lm stopMonitoringSignificantLocationChanges];
    }
  }
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations {
  if (Kumulos.shared) {
    for (CLLocation* loc in locations) {
      [Kumulos.shared sendLocationUpdate:loc];
    }
  }
}

#pragma mark - NearBee delegates

- (void)onBeaconsFound:(NSArray<NearBeeBeacon *> * _Nonnull)beacons {
  for (NearBeeBeacon *beacon in beacons) {
    if (!beacon.eddystoneUID) {
      continue;
    }

    NSString *namespace = [beacon.eddystoneUID substringWithRange:NSMakeRange(0, 20)];
    NSString *instance = [beacon.eddystoneUID substringFromIndex:20];
    [Kumulos.shared trackEventImmediately:@"k.engage.beaconEnteredProximity"
                           withProperties:@{
                                            @"type": @(2),
                                            @"namespace": namespace,
                                            @"instance": instance
                                            }];
  }
}

- (void)onBeaconsLost:(NSArray<NearBeeBeacon *> * _Nonnull)beacons {
  // Noop
}

- (void)onBeaconsUpdated:(NSArray<NearBeeBeacon *> * _Nonnull)beacons {
  // Noop
}

- (void)onError:(NSError * _Nonnull)error {
  NSLog(@"NearBee error: %@", error);
}
`;

const iOSPushDelegateCode = `
#pragma mark - Push delegates
- (void) application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  if (Kumulos.shared) {
    [Kumulos.shared pushRegisterWithDeviceToken:deviceToken];
  }
  else {
    NSLog(@"Kumulos.shared was nil didRegisterForRemoteNotificationsWithDeviceToken");
  }
}

// iOS9 handler for push notifications
// iOS9+10 handler for background data pushes (content-available)
- (void) application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  if ([[UIApplication sharedApplication] applicationState] == UIApplicationStateInactive) {
    [Kumulos.shared pushTrackOpenFromNotification:userInfo];

#ifndef __IPHONE_10_0
    // Handle opening URLs on notification taps (iOS9)
    NSString *url = userInfo[@"custom"][@"u"];
    if (url) {
      dispatch_async(dispatch_get_main_queue(), ^{
        [self.nearBee displayContentOfEddystoneUrl:url];
      });
    }
#endif
  }

  completionHandler(UIBackgroundFetchResultNoData);
}

// Called on iOS10 when your app is in the foreground to allow customizing the display of the notification
- (void) userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler {
  completionHandler(UNNotificationPresentationOptionNone);
}

// iOS10 handler for when a user taps a notification
#ifdef __IPHONE_11_0
- (void) userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)(void))completionHandler {
#else
- (void) userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response withCompletionHandler:(void (^)())completionHandler {
#endif
  NSDictionary* userInfo = [[[[response notification] request] content] userInfo];
  [Kumulos.shared pushTrackOpenFromNotification:userInfo];

  // Handle URL pushes
  NSString *url = userInfo[@"custom"][@"u"];
  if (url) {
    [self.nearBee displayContentOfEddystoneUrl:url];
  }

  completionHandler();
}
`;

module.exports = {
  ios: {
    podDeps: `
  pod 'NearBee', '0.1.0'
`,
    delegateBody: `
${iOSLocationDelegateCode}
${iOSPushDelegateCode}
`,
    findDelegateLine: `@implementation AppDelegate`,
    replaceDelegateLine: `
@interface AppDelegate () <UNUserNotificationCenterDelegate, CLLocationManagerDelegate, NearBeeDelegate>

@property (nonatomic, strong) CLLocationManager *lm;
@property (nonatomic, strong) NearBee *nearBee;

@end

@implementation AppDelegate
`,
    findDidLaunch: `return YES;`,
    replaceDidLaunch: `
  [self setupLocationMonitoring:launchOptions];
  [[UNUserNotificationCenter currentNotificationCenter] setDelegate:self];
  [Kumulos.shared pushRequestDeviceToken];

  return YES;
`,
    delegateImports: `
@import CoreLocation;
@import UserNotifications;
#import "KumulosSDK.h"
#import <NearBee/NearBee-Swift.h>
`
  },
  android: {}
};
