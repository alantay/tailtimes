const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { resolve } = require('metro-resolver');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// In the monorepo, prefer the mobile app's own React packages while still
// allowing Metro to read hoisted workspace dependencies from the repo root.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
  expo: path.resolve(__dirname, 'node_modules/expo'),
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forcedModules = {
    react: path.resolve(__dirname, 'node_modules/react/index.js'),
    'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
    'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    'react-native': path.resolve(__dirname, 'node_modules/react-native/index.js'),
  };

  if (forcedModules[moduleName]) {
    return {
      filePath: forcedModules[moduleName],
      type: 'sourceFile',
    };
  }

  return resolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './global.css',
});
