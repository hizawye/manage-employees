const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Plugin: Ensure newArchEnabled=true in gradle.properties.
 * Required by react-native-reanimated 4.x and react-native-worklets.
 */
const withFixNewArch = (config) => {
  return withProjectBuildGradle(config, (config) => {
    const fs = require("fs");
    const path = require("path");

    const gradlePropsPath = path.resolve(
      config.modRequest.platformProjectRoot,
      "gradle.properties"
    );

    if (fs.existsSync(gradlePropsPath)) {
      let content = fs.readFileSync(gradlePropsPath, "utf8");

      if (content.includes("newArchEnabled=false")) {
        content = content.replace("newArchEnabled=false", "newArchEnabled=true");
      } else if (!content.includes("newArchEnabled=true")) {
        content = content + "\nnewArchEnabled=true\n";
      }

      fs.writeFileSync(gradlePropsPath, content);
    }

    return config;
  });
};

module.exports = withFixNewArch;