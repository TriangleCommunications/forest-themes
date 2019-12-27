const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const execSync = require("child_process").execSync;

require('console-stamp')(console, { colors: { stamp: 'yellow' } });

const { getAllFiles } = require("./common");

const cwd = process.cwd();
const outputDir = "dist";
const semanticUIDir = path.join(cwd, "node_modules/fomantic-ui");
const semanticUIBackupDir = path.join(cwd, "node_modules/fomantic-ui-backup");

function ensureDistDir() {
  fse.ensureDirSync(path.join(outputDir, "bootswatch/v3"));
  fse.ensureDirSync(path.join(outputDir, "bootswatch/v4"));
  fse.ensureDirSync(path.join(outputDir, "semantic-ui/v2"));
}

function getThemeDirInSemanticUISrc(category, theme) {
  if (category === "semantic-ui/v2") {
    return theme;
  } else if (category === "bootswatch/v3" || category === "bootswatch/v4") {
    return `${category.replace("/", "-")}-${theme}`;
  }
}

function backupSemanticUI() {
  console.log(`backup node_modules/fomantic-ui...`);
  fse.removeSync(semanticUIBackupDir);
  fse.copySync(semanticUIDir, semanticUIBackupDir);
  fse.copySync("semantic.json", path.join(semanticUIDir, "semantic.json"));
}

function toBuildOrNotToBuild(category, theme) {
  // That is a question
  // :-)
  const themeDistCSSFiles = [
    path.join(cwd, outputDir, category, `semantic.${theme}.css`),
    path.join(cwd, outputDir, category, `semantic.${theme}.min.css`)
  ];

  const themeSrcDir = path.join(
    semanticUIDir,
    "src/themes",
    getThemeDirInSemanticUISrc(category, theme)
  );

  for (let themeDistCSSFile of themeDistCSSFiles) {
    if (!fs.existsSync(themeDistCSSFile)) {
      return true;
    }

    const themeDistCSSFileMtime = fs.statSync(themeDistCSSFile).mtimeMs;

    for (let themeSrcFile of getAllFiles(themeSrcDir)) {
      const themeSrcFileMtime = fs.statSync(themeSrcFile).mtimeMs;

      if (themeSrcFileMtime > themeDistCSSFileMtime) {
        return true;
      }
    }
  }

  return false;
}

function build(forceBuild) {
  const semanticUIV2Themes = [
    "amazon",
    "bootstrap3",
    "chubby",
    "flat",
    "github",
    "material",
    "twitter"
  ];

  const bootswatchV3Themes = [
    "cerulean",
    "cosmo",
    "cyborg",
    "darkly",
    "flatly",
    "journal",
    "lumen",
    "paper",
    "readable",
    "sandstone",
    "simplex",
    "slate",
    "solar",
    "spacelab",
    "superhero",
    "united",
    "yeti"
  ];

  const bootswatchV4Themes = [
    "cerulean",
    "cosmo",
    "cyborg",
    "darkly",
    "flatly",
    "journal",
    "litera",
    "lumen",
    "lux",
    "materia",
    "minty",
    "pulse",
    "sandstone",
    "simplex",
    "sketchy",
    "slate",
    "solar",
    "spacelab",
    "superhero",
    "united",
    "yeti"
  ];

  themes = {
    "bootswatch/v3": bootswatchV3Themes,
    "bootswatch/v4": bootswatchV4Themes,
    "semantic-ui/v2": semanticUIV2Themes
  };

  for (let category of ["bootswatch/v3", "bootswatch/v4"]) {
    for (let theme of themes[category]) {
      fse.copySync(
        path.join("src/themes/", category, theme),
        path.join(
          semanticUIDir,
          "src/themes",
          getThemeDirInSemanticUISrc(category, theme)
        )
      );
    }
  }

  for (let category of ["bootswatch/v3", "bootswatch/v4", "semantic-ui/v2"]) {
    if (category === "bootswatch/v3" || category === "bootswatch/v4") {
      // bootswatch themes only need assets from semantic-ui's default theme
      fse.copySync(
        path.join(semanticUIDir, "dist/themes/default"),
        path.join(outputDir, category, "themes/default")
      );
    } else {
      fse.copySync(
        path.join(semanticUIDir, "dist/themes"),
        path.join(outputDir, category, "themes")
      );
    }

    for (let theme of themes[category]) {
      fse.copySync(
        path.join("src/configs", category, `${theme}.theme.config`),
        path.join(semanticUIDir, "src/theme.config")
      );

      process.chdir(semanticUIDir);

      if (forceBuild || toBuildOrNotToBuild(category, theme)) {
        console.log(`building ${category}/${theme} theme...`);
        execSync("gulp build-css");

        fse.copySync(
          path.join("dist", "semantic.css"),
          path.join(cwd, outputDir, category, `semantic.${theme}.css`)
        );
        fse.copySync(
          path.join("dist", "semantic.min.css"),
          path.join(cwd, outputDir, category, `semantic.${theme}.min.css`)
        );
      } else {
        console.log(
          `skip building ${category}/${theme} theme.`
        );
      }

      process.chdir(cwd);
    }
  }
}

function restoreSemanticUI() {
  console.log(`restore node_modules/semantic-ui...`);
  fse.removeSync(semanticUIDir);
  fse.copySync(semanticUIBackupDir, semanticUIDir);
  fse.removeSync(semanticUIBackupDir);

  process.chdir(cwd);
}

function beforeExitSetup() {
  const exitSignals = [`SIGINT`, `SIGTERM`];
  exitSignals.forEach(eventType => {
    process.on(eventType, () => {
      console.error(`exit with ${eventType}`);
      restoreSemanticUI();
      process.exit(0);
    });
  });
}

function main() {
  const forceBuild = process.argv.length === 3 && process.argv[2] === "-f";
  beforeExitSetup();

  ensureDistDir();
  backupSemanticUI();
  build(forceBuild);
  restoreSemanticUI();
}

main();
