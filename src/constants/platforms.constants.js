// Keep in sync with digi-dashboard/src/constants/platforms.constants.js; both apps share one database.
export const LICENSE_PLATFORMS = Object.freeze(["tablet", "android_laptop", "windows", "linux", "ifp"]);

// smartshala: classroom hardware (IFP / OPS Windows) driven by a teacher for the whole class.
// epathshala_lab: individual devices (laptops, tablets, desktops) used mostly by students.
export const SOLUTIONS = Object.freeze(["smartshala", "epathshala_lab"]);

/**
 * Default solution for a platform when it is unambiguous. Windows/Linux can be either
 * (OPS in SmartShala vs desktops in a Lab), so they return null and must be set manually.
 */
export function defaultSolutionForPlatform(platform) {
  if (platform === "ifp") return "smartshala";
  if (platform === "tablet" || platform === "android_laptop") return "epathshala_lab";
  return null;
}
