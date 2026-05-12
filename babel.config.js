module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { worklets: false }], 'nativewind/babel'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
