const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Plugin: Replace splash screen theme with plain AppCompat theme in styles.xml.
 * Removes dependency on Theme.SplashScreen from expo-splash-screen.
 */
const withFixSplashTheme = (config) => {
  return withAndroidManifest(config, (config) => {
    const stylesPath = require("path").resolve(
      config.modRequest.platformProjectRoot,
      "app/src/main/res/values/styles.xml"
    );

    const fs = require("fs");
    if (fs.existsSync(stylesPath)) {
      let content = fs.readFileSync(stylesPath, "utf8");

      // Replace Theme.SplashScreen parent with plain AppCompat
      content = content.replace(
        /parent="Theme\.SplashScreen"/g,
        'parent="Theme.AppCompat.DayNight.NoActionBar"'
      );

      // Replace SplashScreen-specific attrs with plain windowBackground
      content = content.replace(
        /<item name="windowSplashScreenBackground">[^<]+<\/item>\s*/g,
        ""
      );
      content = content.replace(
        /<item name="windowSplashScreenAnimatedIcon">[^<]+<\/item>\s*/g,
        ""
      );
      content = content.replace(
        /<item name="postSplashScreenTheme">[^<]+<\/item>\s*/g,
        ""
      );
      content = content.replace(
        /<item name="android:windowSplashScreenBehavior">[^<]+<\/item>\s*/g,
        ""
      );

      // Add plain windowBackground if not present
      if (!content.includes("android:windowBackground")) {
        content = content.replace(
          /(<style name="Theme\.App\.SplashScreen"[^>]*>)/,
          "$1\n    <item name=\"android:windowBackground\">#023c69</item>"
        );
      }

      // Fix status bar color
      content = content.replace(
        /<item name="android:statusBarColor">#6200ee<\/item>/,
        "<item name=\"android:statusBarColor\">#023c69</item>"
      );

      fs.writeFileSync(stylesPath, content);
    }

    // Also fix colors.xml - remove splashscreen_background
    const colorsPath = require("path").resolve(
      config.modRequest.platformProjectRoot,
      "app/src/main/res/values/colors.xml"
    );
    if (fs.existsSync(colorsPath)) {
      let colors = fs.readFileSync(colorsPath, "utf8");
      colors = colors.replace(/<color name="splashscreen_background">[^<]+<\/color>\s*/g, "");
      fs.writeFileSync(colorsPath, colors);
    }

    return config;
  });
};

module.exports = withFixSplashTheme;