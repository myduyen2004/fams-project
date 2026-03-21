import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions are not configured for web in this project.',
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        throw UnsupportedError(
          'DefaultFirebaseOptions are only configured for Android. '
          'Run flutterfire configure after adding the final Firebase apps for the remaining platforms.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDW4JfzbAINNovwL1HqPPppFuOB55n_LlQ',
    appId: '1:305133803982:android:38838bde4c0df8e0d6339f',
    messagingSenderId: '305133803982',
    projectId: 'fams-f225e',
    storageBucket: 'fams-f225e.firebasestorage.app',
  );
}