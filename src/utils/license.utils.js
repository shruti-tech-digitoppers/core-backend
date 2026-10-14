import { License, School, Project, Organization } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

/**
 * App-side license refresh is an unauthenticated device reset.
 * Only these purpose markers may pass; anything else (including a missing flag) is live data.
 */
export const APP_REFRESH_PURPOSES = Object.freeze(['demo', 'testing']);

export function isAppRefreshPurpose(doc) {
  return APP_REFRESH_PURPOSES.includes(doc?.settings?.purpose);
}

/**
 * A license is refreshable from the app when its school, project, or organization
 * is explicitly demo or testing. Missing parents fail closed.
 * @param {{ schoolId?: unknown, projectId?: unknown, orgId?: unknown }} license
 * @returns {Promise<boolean>}
 */
export async function isAppRefreshableLicense(license) {
  const [school, project, org] = await Promise.all([
    license?.schoolId ? School.findById(license.schoolId).select('settings').lean() : null,
    license?.projectId ? Project.findById(license.projectId).select('settings').lean() : null,
    license?.orgId ? Organization.findById(license.orgId).select('settings').lean() : null,
  ]);
  return isAppRefreshPurpose(school) || isAppRefreshPurpose(project) || isAppRefreshPurpose(org);
}

/**
 * Shared license-state guard used by regular validation and migration flows.
 * Device binding can be optionally skipped for controlled flows that must
 * apply custom ownership checks (e.g., oldDeviceId/newDeviceId migration).
 * @param {string} licenseKey
 * @param {string | null} deviceId
 * @param {{ skipDeviceBindingCheck?: boolean }} [options]
 * @returns {Promise<{licenseObj: any, isActive: boolean, errorCode: string | null, message: string}>}
 */
export const checkLicenseStatus = async (licenseKey, deviceId, options = {}) => {
  const { skipDeviceBindingCheck = false } = options;
  const license = await License.findOne({ licenseKey });

  // check if license key is valid
  if (!license) {
    return {
      licenseObj: null,
      isActive: false,
      errorCode: ERROR_CODES.DATA_NOT_FOUND,
      message: 'License not found',
    };
  }

  if (license.isFreeze) {
    return {
      licenseObj: license,
      isActive: false,
      errorCode: ERROR_CODES.NOT_ACCEPTABLE,
      message: 'License is frozen',
    };
  }

  // check if license is expired
  if (license.isRegistered) {
    // check if license is registered to the device
    if (!skipDeviceBindingCheck && license.registeredTo !== deviceId) {
      return {
        licenseObj: license,
        isActive: false,
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'License is not registered to this device',
      };
    }

    const isExpired = license.licenseDays * 24 * 60 * 60 * 1000 < Date.now() - +new Date(license.registeredAt);
    if (isExpired) {
      return {
        licenseObj: license,
        isActive: false,
        errorCode: ERROR_CODES.NOT_ACCEPTABLE,
        message: 'License is expired',
      };
    }
  }

  return {
    licenseObj: license,
    isActive: true,
	  errorCode: null,
    message: 'License is active',
  };
};
