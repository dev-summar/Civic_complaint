const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const rnWebModules =
  /node_modules[/\\](?!(react-native-vector-icons|react-native-gesture-handler|react-native-reanimated|react-native-screens|react-native-safe-area-context|@react-navigation|@react-native-async-storage|react-native-svg)[/\\]).*/;

module.exports = {
  entry: path.resolve(__dirname, 'src/index.web.tsx'),
  output: {
    path: path.resolve(__dirname, 'web/dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
    alias: {
      // Exact match only — do NOT alias deep react-native/* paths
      'react-native$': 'react-native-web',
      'react-native-maps': path.resolve(__dirname, 'web/mapsStub.js'),
      'react-native-maps/lib/MapMarkerNativeComponent': path.resolve(
        __dirname,
        'web/mapsStub.js',
      ),
      'react-native-worklets': path.resolve(__dirname, 'web/emptyStub.js'),
      'react-native-image-picker': path.resolve(__dirname, 'web/imagePickerStub.js'),
      '@react-native-community/geolocation': path.resolve(
        __dirname,
        'web/geolocationStub.js',
      ),
      'react-native-haptic-feedback': path.resolve(__dirname, 'web/emptyStub.js'),
      'react-native-linear-gradient': path.resolve(
        __dirname,
        'web/linearGradientStub.js',
      ),
      '@': path.resolve(__dirname, 'src'),
    },
    fullySpecified: false,
  },
  module: {
    rules: [
      {
        // React Navigation ships ESM without .js extensions in imports
        test: /\.m?js$/,
        resolve: {fullySpecified: false},
      },
      {
        test: /\.(tsx?|jsx?)$/,
        exclude: rnWebModules,
        use: {
          loader: 'babel-loader',
          options: {
            // Ignore babel.config.js (Metro) — that preset emits CommonJS
            // `exports`, which breaks in the browser under webpack.
            configFile: false,
            babelrc: false,
            presets: [
              [
                'module:@react-native/babel-preset',
                {disableImportExportTransform: true},
              ],
            ],
            plugins: [
              [
                'module-resolver',
                {
                  root: ['./src'],
                  extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.js'],
                  alias: {
                    '@': './src',
                  },
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg|ttf|woff2?)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'web/index.html'),
    }),
    new webpack.ProvidePlugin({
      process: path.resolve(__dirname, 'web/processPolyfill.js'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(true),
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.API_BASE_URL': JSON.stringify(
        process.env.API_BASE_URL || 'http://10.253.5.161:5000/api/v1',
      ),
      'process.env.SOCKET_URL': JSON.stringify(
        process.env.SOCKET_URL || 'http://10.253.5.161:5000',
      ),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(
        process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
      ),
    }),
  ],
  ignoreWarnings: [/Failed to parse source map/, /react-native-worklets/],
  devServer: {
    // Don't serve web/index.html as static — HtmlWebpackPlugin owns /
    static: {directory: path.join(__dirname, 'web/public'), watch: false},
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
};
