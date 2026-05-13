const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Plugin: Fix MainActivity.kt for splash screen removal.
 * - Removes SplashScreenManager import if present (from older prebuilds)
 * - Ensures setTheme(R.style.AppTheme) is called before super.onCreate
 */
const withFixMainActivity = (config) => {
  return withAndroidManifest(config, (config) => {
    const path = require("path");
    const fs = require("fs");

    const mainActivityPath = path.resolve(
      config.modRequest.platformProjectRoot,
      "app/src/main/java/com/manageemployees/app/MainActivity.kt"
    );

    if (fs.existsSync(mainActivityPath)) {
      let content = fs.readFileSync(mainActivityPath, "utf8");

      // Remove SplashScreenManager import if it exists
      content = content.replace(
        /import\s+expo\.modules\.splashscreen\.SplashScreenManager\s*\n?/g,
        ""
      );

      // Remove old splash screen block if it exists
      content = content.replace(
        /\/\/ @generated begin expo-splashscreen[\s\S]*?@generated end expo-splashscreen\s*\n?/g,
        ""
      );

      // Ensure setTheme is called before super.onCreate
      if (!content.includes("setTheme(R.style.AppTheme)")) {
        content = content.replace(
          /(override fun onCreate\(savedInstanceState:\s*Bundle\?\) \{\s*)/,
          "$1    // Set the theme to AppTheme BEFORE onCreate to support\n    // coloring the background, status bar, and navigation bar.\n    setTheme(R.style.AppTheme)\n"
        );
      }

      fs.writeFileSync(mainActivityPath, content);
    }

    return config;
  });
};

module.exports = withFixMainActivity;