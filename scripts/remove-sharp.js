const fs = require("node:fs");
const path = require("node:path");

function nodeModuleRoots(projectRoot) {
  return [
    path.join(projectRoot, "node_modules"),
    path.join(projectRoot, ".next", "standalone", "node_modules"),
  ];
}

function sharpPackageDirectories(projectRoot) {
  const packages = [];
  for (const nodeModules of nodeModuleRoots(projectRoot)) {
    const sharp = path.join(nodeModules, "sharp");
    if (fs.existsSync(sharp)) packages.push(sharp);

    const imagePackages = path.join(nodeModules, "@img");
    if (!fs.existsSync(imagePackages)) continue;
    for (const name of fs.readdirSync(imagePackages)) {
      if (name.startsWith("sharp-") || name.startsWith("sharp-libvips-")) {
        packages.push(path.join(imagePackages, name));
      }
    }
  }
  return packages;
}

function removeSharpPackages(projectRoot) {
  const packages = sharpPackageDirectories(projectRoot);
  for (const directory of packages) fs.rmSync(directory, { recursive: true, force: true });
  return packages;
}

function assertNoSharpPackages(projectRoot) {
  const packages = sharpPackageDirectories(projectRoot);
  if (packages.length) {
    throw new Error(`Sharp is disabled for MoneyPot but was found in the packaged runtime: ${packages.join(", ")}`);
  }
}

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const removed = removeSharpPackages(root);
  console.log(removed.length ? `Removed ${removed.length} Sharp runtime package(s).` : "Sharp runtime packages are already absent.");
}

module.exports = { assertNoSharpPackages, removeSharpPackages, sharpPackageDirectories };
