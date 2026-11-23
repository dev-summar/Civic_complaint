const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers: 1,
  resolver: {
    useWatchman: false,
    blockList: exclusionList([
      /\\backend\\.*/,
      /\\cloudflare-backend\\.*/,
      /\\android\\app\\build\\.*/,
      /\\android\\app\\prebuilt\\.*/,
      /\\android\\build\\.*/,
      /node_modules[/\\].*[/\\]android[/\\](\.cxx|\.gradle|build)[/\\].*/,
    ]),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
