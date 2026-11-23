import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stub = name => path.resolve(__dirname, `web/${name}`);

function androidMapsKey() {
  try {
    const xml = fs.readFileSync(
      path.resolve(__dirname, 'android/app/src/main/AndroidManifest.xml'),
      'utf8',
    );
    const match = xml.match(
      /com\.google\.android\.geo\.API_KEY[\s\S]*?android:value="([^"]+)"/,
    );
    return match?.[1] || '';
  } catch {
    return '';
  }
}

// Same style as pi360_student_side — Vite + React — with react-native-web aliases.
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [react()],
    base: '/',
    define: {
      global: 'window',
      __DEV__: JSON.stringify(mode !== 'production'),
      'process.env.NODE_ENV': JSON.stringify(
        mode === 'production' ? 'production' : 'development',
      ),
      'process.env.API_BASE_URL': JSON.stringify(
        env.API_BASE_URL ||
          env.VITE_API_BASE_URL ||
          'https://swachhsetu-api.summar-adm.workers.dev/api/v1',
      ),
      'process.env.SOCKET_URL': JSON.stringify(
        env.SOCKET_URL ||
          env.VITE_SOCKET_URL ||
          'https://swachhsetu-api.summar-adm.workers.dev',
      ),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(
        env.GOOGLE_MAPS_API_KEY || androidMapsKey() || 'YOUR_GOOGLE_MAPS_API_KEY',
      ),
      'process.env.MAPTILER_API_KEY': JSON.stringify(env.MAPTILER_API_KEY || ''),
      'process.env.GEOAPIFY_API_KEY': JSON.stringify(env.GEOAPIFY_API_KEY || ''),
    },
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: [
        {find: /^react-native$/, replacement: stub('reactNative.js')},
        {
          find: '@react-native/assets-registry/registry',
          replacement: stub('assetsRegistryStub.js'),
        },
        {
          find: '@react-native/assets-registry',
          replacement: stub('assetsRegistryStub.js'),
        },
        {find: 'react-native-maps', replacement: stub('mapsStub.js')},
        {find: 'react-native-worklets', replacement: stub('emptyStub.js')},
        {find: 'react-native-reanimated', replacement: stub('reanimatedStub.js')},
        {
          find: 'react-native-gesture-handler',
          replacement: stub('gestureHandlerStub.js'),
        },
        {
          find: 'react-native-image-picker',
          replacement: stub('imagePickerStub.js'),
        },
        {
          find: '@react-native-community/geolocation',
          replacement: stub('geolocationStub.js'),
        },
        {
          find: 'react-native-haptic-feedback',
          replacement: stub('emptyStub.js'),
        },
        {
          find: 'react-native-linear-gradient',
          replacement: stub('linearGradientStub.js'),
        },
        {
          find: 'react-native-vector-icons/Ionicons',
          replacement: stub('iconStub.js'),
        },
        {
          find: 'react-native-vector-icons',
          replacement: stub('iconStub.js'),
        },
        {find: '@', replacement: path.resolve(__dirname, 'src')},
      ],
      dedupe: ['react', 'react-dom', 'react-native-web'],
    },
    optimizeDeps: {
      esbuildOptions: {
        resolveExtensions: [
          '.web.tsx',
          '.web.ts',
          '.web.jsx',
          '.web.js',
          '.tsx',
          '.ts',
          '.jsx',
          '.js',
        ],
        loader: {'.js': 'jsx'},
      },
      include: ['react-native-web', 'react-native-safe-area-context'],
    },
    server: {
      open: true,
      port: 3000,
      host: true,
      watch: {
        ignored: [
          '**/*.apk',
          '**/android/**',
          '**/ios/**',
          '**/.gradle/**',
          '**/node_modules/**',
          '**/poster-assets/**',
        ],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: {
      open: true,
      port: 3000,
    },
  };
});
