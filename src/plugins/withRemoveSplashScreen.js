const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Plugin: Remove SplashScreenManager references from MainActivity.kt
 */
const withRemoveSplashScreen = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainActivityPath = require("path").resolve(
      config.modRequest.platformProjectRoot,
      "app/src/main/java/com/manageemployees/app/MainActivity.kt"
    );

    const fs = require("fs");
    if (fs.existsSync(mainActivityPath)) {
      let content = fs.readFileSync(mainActivityPath, "utf8");
      // Remove import
      content = content.replace(
        /import\s+expo\.modules\.splashscreen\.SplashScreenManager\s*\n?/g,
        ""
      );
      // Remove SplashScreenManager.registerOnActivity line and surrounding comments
      content = content.replace(
        /\/\/ @generated begin expo-splashscreen[\s\S]*?@generated end expo-splashscreen\s*\n?/g,
        ""
      );
      fs.writeFileSync(mainActivityPath, content);
    }

    return config;
  });
};

module.exports = withRemoveSplashScreen;