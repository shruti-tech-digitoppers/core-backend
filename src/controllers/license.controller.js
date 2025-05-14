import { License, School } from '../models/mongo.model.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { checkLicenseStatus } from '../utils/license.utils.js';
import { 
  generateSigningKey, 
  generateDeviceFingerprint, 
  encrypt, 
  generateOfflineToken,
  decrypt
} from '../utils/security.utils.js';

export const funActivateLicense = async (req, res) => {
  const { licenseKey, deviceId } = req.body;

  let licenseStatus;
  try {
    licenseStatus = await checkLicenseStatus(licenseKey);
    if (!licenseStatus.isActive) {
      return res.status(400).json({ message: licenseStatus.message, errorCode: licenseStatus.errorCode });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error checking license status', error: error.message, errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR });
  }
  
  const license = licenseStatus.licenseObj;

  // check if license is registered to another device
  if (license.isRegistered) {
    if (license.registeredTo !== deviceId)
      return res.status(400).json({ message: 'License is already registered to another device', errorCode: ERROR_CODES.NOT_ACCEPTABLE });

    // check if license is expired
    if (license.licenseDays * 24 * 60 * 60 * 1000 < Date.now() - +new Date(license.registeredAt)) {
      return res.status(400).json({ message: 'License is expired', errorCode: ERROR_CODES.NOT_ACCEPTABLE });
    }
  }

  // Generate security parameters
  const signingKey = generateSigningKey();
  const deviceFingerprint = generateDeviceFingerprint(deviceId);
  const offlineToken = generateOfflineToken(licenseKey);

  // Create security parameters object
  const securityParams = {
    signingKey,
    deviceFingerprint,
    offlineToken,
    validUntil: new Date(Date.now() + (license.licenseDays * 24 * 60 * 60 * 1000)),
    lastSyncTimestamp: Date.now(),
    securityVersion: '1.0'
  };

  // Encrypt security parameters with license key
  const encryptedSecurityParams = encrypt(securityParams, licenseKey);

  // activate license
  license.isRegistered = true;
  license.registeredTo = deviceId;
  license.securityParams = encryptedSecurityParams;

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

  // fetch school details
  const school = await School.findOne({ _id: license.schoolId }).lean();
  
  return res.status(200).json({ 
    message: 'License activated', 
    data: { 
      school, 
      config: {},
      securityParams: {
        apiKey: license.apiKey,
        deviceFingerprint,
        offlineToken,
        signingKey
      }
    } 
  });
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

export const funGetSecurityParams = async (req, res) => {
  const { licenseKey, deviceId } = req.body;

  if (!licenseKey || !deviceId) {
    return res.status(400).json({
      message: 'License key and device ID are required',
      errorCode: ERROR_CODES.BAD_REQUEST
    });
  }

  try {
    // Find the license
    const license = await License.findOne({ licenseKey });
    if (!license) {
      return res.status(404).json({
        message: 'License not found',
        errorCode: ERROR_CODES.DATA_NOT_FOUND
      });
    }

    // Verify device ID
    if (license.registeredTo !== deviceId) {
      return res.status(401).json({
        message: 'Device ID mismatch',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    // Check license status
    const licenseStatus = await checkLicenseStatus(licenseKey);
    if (!licenseStatus.isActive) {
      return res.status(401).json({
        message: licenseStatus.message,
        errorCode: licenseStatus.errorCode
      });
    }

    // If security params exist, decrypt and return them
    if (license.securityParams) {
      const securityParams = decrypt(license.securityParams, license.licenseKey);
      return res.status(200).json({
        message: 'Security parameters retrieved successfully',
        data: {
          apiKey: license.apiKey,
          deviceFingerprint: securityParams.deviceFingerprint,
          offlineToken: securityParams.offlineToken
        }
      });
    }

    // If security params don't exist, generate new ones
    const signingKey = generateSigningKey();
    const deviceFingerprint = generateDeviceFingerprint(deviceId);
    const offlineToken = generateOfflineToken(licenseKey);

    const securityParams = {
      signingKey,
      deviceFingerprint,
      offlineToken,
      validUntil: new Date(Date.now() + (license.licenseDays * 24 * 60 * 60 * 1000)),
      lastSyncTimestamp: Date.now(),
      securityVersion: '1.0'
    };

    // Encrypt and save security parameters
    const encryptedSecurityParams = encrypt(securityParams, license.licenseKey);
    license.securityParams = encryptedSecurityParams;
    await license.save();

    return res.status(200).json({
      message: 'New security parameters generated successfully',
      data: {
        apiKey: license.apiKey,
        deviceFingerprint,
        offlineToken
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: 'Error retrieving security parameters',
      error: error.message,
      errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR
    });
  }
};
