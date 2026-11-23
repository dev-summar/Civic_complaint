import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, {useEffect} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from '@/navigation/RootNavigator';
import {useAuthStore} from '@/store/authStore';
import {useAppStore} from '@/store/appStore';
import {ThemeProvider} from '@/theme';
import {ToastHost} from '@/components/ui';
import {ErrorBoundary} from '@/components/ErrorBoundary';
import {connectSocket, disconnectSocket} from '@/services/socket.service';
import {warmMapTiles} from '@/components/maps/WebMapFrame';

function App(): React.JSX.Element {
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const hydrateApp = useAppStore(s => s.hydrate);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isHydrated = useAuthStore(s => s.isHydrated);

  useEffect(() => {
    hydrateAuth();
    hydrateApp();
    warmMapTiles();
  }, [hydrateAuth, hydrateApp]);

  useEffect(() => {
    if (isHydrated) {
      if (isAuthenticated) {
        connectSocket();
      } else {
        disconnectSocket();
      }
    }
  }, [isAuthenticated, isHydrated]);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
          <ToastHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
