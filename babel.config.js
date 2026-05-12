module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'classic', worklets: false }], 'nativewind/babel'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
