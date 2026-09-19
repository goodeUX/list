import 'react-native-gesture-handler';
// `@expo/metro-runtime` MUST be the first import to ensure Fast Refresh works on web.
import '@expo/metro-runtime';

import 'react-native-reanimated';

// Must run after React Native has installed its console/dev tools so our filter
// sits on top of them and keeps the dropped messages out of the Metro terminal.
import './lib/silenceDevLogs';

import './splash-bootstrap';

import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

renderRootComponent(App);
