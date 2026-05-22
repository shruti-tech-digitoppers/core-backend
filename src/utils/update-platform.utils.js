export const APP_PLATFORMS = Object.freeze(["android", "windows", "linux"]);
export const BUNDLE_PLATFORMS = Object.freeze([...APP_PLATFORMS, "all"]);
export const BUNDLE_TYPES = Object.freeze(["app", "content", "combined"]);

const ANDROID_LICENSE_PLATFORMS = new Set(["tablet", "ifp"]);

const normalizeString = (value) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized || undefined;
};

export const normalizeClientPlatform = (platform) => {
  const normalized = normalizeString(platform);
  if (ANDROID_LICENSE_PLATFORMS.has(normalized)) return "android";
  return APP_PLATFORMS.includes(normalized) ? normalized : undefined;
};

export const normalizeLicensePlatform = (platform) => {
  const normalized = normalizeString(platform);
  if (ANDROID_LICENSE_PLATFORMS.has(normalized)) return "android";
  return APP_PLATFORMS.includes(normalized) ? normalized : undefined;
};

export const normalizeBundlePlatform = (platform) => {
  const normalized = normalizeString(platform) || "android";
  return BUNDLE_PLATFORMS.includes(normalized) ? normalized : undefined;
};

export const normalizeRolloutPlatform = (platform, bundlePlatform) => {
  const fallback = normalizeBundlePlatform(bundlePlatform);
  const normalized = normalizeString(platform) || fallback || "android";
  return BUNDLE_PLATFORMS.includes(normalized) ? normalized : undefined;
};

export const arePlatformsCompatible = (licensePlatform, clientPlatform) => {
  const normalizedLicense = normalizeLicensePlatform(licensePlatform);
  const normalizedClient = normalizeClientPlatform(clientPlatform);
  return !!normalizedLicense && normalizedLicense === normalizedClient;
};

export const validateBundlePlatformForType = (type, platform) => {
  if (!BUNDLE_TYPES.includes(type)) {
    throw new Error("Invalid bundle type");
  }

  const normalizedPlatform = normalizeBundlePlatform(platform);
  if (!normalizedPlatform) {
    throw new Error("Invalid bundle platform");
  }

  if ((type === "app" || type === "combined") && normalizedPlatform === "all") {
    throw new Error('Bundle platform "all" is only valid for content bundles');
  }

  return normalizedPlatform;
};
