import { License } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';
export const checkLicenseStatus = async (licenseKey) => {
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
