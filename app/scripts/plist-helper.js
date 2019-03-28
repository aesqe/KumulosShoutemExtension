const fs = require("fs");
const _ = require("lodash");
const plist = require("plist");
const path = require("path");
const { projectPath, getXcodeProjectName } = require("@shoutem/build-tools");

function parsePlist(plistPath) {
  const plistContent = fs.readFileSync(plistPath, "utf8");
  let plistResult = {};
  try {
    plistResult = plist.parse(plistContent);
  } catch (e) {
    console.error("Unable to parse plist", plistPath);
  }
  return plistResult;
}

function writePlist(plistPath, data) {
  fs.writeFileSync(plistPath, plist.build(data));
}

function getProjectInfoPlist() {
  const iosDirPath = path.join(projectPath, "ios");
  const xcodeProjectName = getXcodeProjectName({ cwd: iosDirPath });
  const projectInfoPlistPath = path.join(
    iosDirPath,
    xcodeProjectName,
    "Info.plist"
  );

  if (!fs.existsSync(projectInfoPlistPath)) {
    console.error(`Project Info.plist not found at ${projectInfoPlistPath}!`);
    process.exit(1);
  }

  const projectPlist = parsePlist(projectInfoPlistPath);
  return {
    projectInfoPlistPath,
    projectPlist
  };
}

function mergeKumulosPlist() {
  const { projectInfoPlistPath, projectPlist } = getProjectInfoPlist();
  const infoPlistFile = path.resolve(__dirname, "..", "ios", "Info.plist");

  console.log("Merging Info.plist file into project...");

  const extPlist = parsePlist(infoPlistFile);

  const mergedPlist = _.mergeWith(
    projectPlist,
    extPlist,
    (objValue, srcValue) => {
      if (_.isArray(objValue)) {
        return _.uniq(objValue.concat(srcValue));
      }

      return srcValue;
    }
  );

  writePlist(projectInfoPlistPath, mergedPlist);
  console.log("Info.plist merge - success!");
}

module.exports = {
  getProjectInfoPlist: getProjectInfoPlist,
  writePlist: writePlist,
  mergeKumulosPlist: mergeKumulosPlist
};
