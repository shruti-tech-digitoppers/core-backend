import { License, School } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';

export const funActivateLicense = async (req, res) => {
  const { licenseKey, deviceId } = req.body;

  const license = await License.findOne({ licenseKey });

  // check if license key is valid
  if (!license) {
    return res.status(404).json({ message: 'License not found', errorCode: ERROR_CODES.DATA_NOT_FOUND });
  }

  // check if license is frozen
  if (license.isFreeze) {
    return res.status(400).json({ message: 'License is not usable', errorCode: ERROR_CODES.NOT_ACCEPTABLE });
  }

  // check if license is registered to another device
  if (license.isRegistered) {
    if (license.registeredTo !== deviceId)
      return res.status(400).json({ message: 'License is already registered to another device', errorCode: ERROR_CODES.NOT_ACCEPTABLE });

    // check if license is expired
    if (license.licenseDays * 24 * 60 * 60 * 1000 < Date.now() - +new Date(license.registeredAt)) {
      return res.status(400).json({ message: 'License is expired', errorCode: ERROR_CODES.NOT_ACCEPTABLE });
    }
  }

  // activate license
  license.isRegistered = true;
  license.registeredTo = deviceId;

  if (license.registeredTo == deviceId) {
    license.reusedAt = new Date();
  } else {
    license.registeredAt = new Date();
  }

  try {
    await license.save();
  } catch (error) {
    return res.status(500).json({ message: 'Error activating license', error: error.message, errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
  }

  // todo: return configurations for the app to use after activation

  // fetch school details
  const school = await School.findOne({ _id: license.schoolId }).lean();
  return res.status(200).json({ message: 'License activated', data: { school, config: {} } });
};

export const funDeactivateLicense = async (req, res) => {
  const { licenseKey } = req.body;

  const license = await License.findOne({ licenseKey });
};

//export const addLicensesToSchool = async (req, res) => {
//  const { schoolId, noOfLicenses } = req.body;

//  const partOfSchoolId = schoolId.slice(schoolId.length - 3, schoolId.length);
//  const licenses = await License.insertMany(Array.from({ length: noOfLicenses }, (_, index) => ({ licenseKey: `lic${partOfSchoolId}${index + 1}`, schoolId })));

//  return res.status(200).json({ message: 'Licenses added', data: licenses });
//};
