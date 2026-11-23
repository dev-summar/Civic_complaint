import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator} from '@/navigation/RootNavigator';
import {useAuthStore} from '@/store/authStore';
import {useAppStore} from '@/store/appStore';
import {ThemeProvider} from '@/theme';

/** Web entry — mirrors pi360 createRoot style (no reanimated / gesture-handler). */
function App(): React.JSX.Element {
  const hydrateAuth = useAuthStore(s => s.hydrate);
  const hydrateApp = useAppStore(s => s.hydrate);

  useEffect(() => {
    hydrateAuth();
    hydrateApp();
  }, [hydrateAuth, hydrateApp]);

  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, height: '100%', minHeight: '100vh' as unknown as number},
});

export default App;
