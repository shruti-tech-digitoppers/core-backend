import { License } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

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
