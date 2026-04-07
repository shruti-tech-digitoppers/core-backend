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
    licenseStatus = await checkLicenseStatus(licenseKey, deviceId);
    if (!licenseStatus.isActive) {
      return res.status(400).json({ message: licenseStatus.message, errorCode: licenseStatus.errorCode });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error checking license status', error: error.message, errorCode: ERROR_CODES.SERVER_ERROR });
  }
  
  const license = licenseStatus.licenseObj;

  // Generate security parameters
  const signingKey = generateSigningKey();
  const deviceFingerprint = generateDeviceFingerprint(deviceId);
  const offlineToken = generateOfflineToken(licenseKey);

  // Expiry should start from the current activation moment for new devices,
  // but should not be extended when the same device reuses the license.
  const isSameDeviceReuse = license.registeredTo === deviceId;
  const activationAt = isSameDeviceReuse ? license.registeredAt : new Date();
  if (isSameDeviceReuse) {
    license.reusedAt = new Date();
  } else {
    license.registeredAt = activationAt;
  }

  // Create security parameters object
  const securityParams = {
    signingKey,
    deviceFingerprint,
    offlineToken,
    validUntil: new Date(new Date(activationAt).getTime() + (license.licenseDays * 24 * 60 * 60 * 1000)),
    lastSyncTimestamp: Date.now(),
    securityVersion: '1.0'
  };

  // Encrypt security parameters with license key
  const encryptedSecurityParams = encrypt(securityParams, licenseKey);

  // activate license
  license.isRegistered = true;
  license.registeredTo = deviceId;
  license.securityParams = encryptedSecurityParams;

  try {
    await license.save();
  } catch (error) {
    return res.status(500).json({ message: 'Error activating license', error: error.message, errorCode: ERROR_CODES.SERVER_ERROR });
  }

  // fetch school details
  const school = await School.findOne({ _id: license.schoolId }).lean();
  
  return res.status(200).json({
    success: true,
    message: 'License activated', 
    data: {
      school, 
      config: {
        licenseKey: license.licenseKey,
        licenseDays: license.licenseDays,
        registeredAt: license.registeredAt,
        validUntil: securityParams.validUntil,
      },
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

// validate the license
export const validateLicense = async (req, res) => {
  const { licenseKey, deviceId } = req.body;
  let licenseStatus 
  
  try {
    licenseStatus = await checkLicenseStatus(licenseKey, deviceId);
  } catch (error) {
    return res.status(500).json({
      message: 'Error checking license status',
      error: error.message,
      errorCode: ERROR_CODES.SERVER_ERROR
    });
  }

  if (!licenseStatus) {
    return res.status(404).json({
      message: 'License not found',
      errorCode: ERROR_CODES.DATA_NOT_FOUND
    });
  }

  if (!licenseStatus.isActive) {
    return res.status(401).json({
      message: licenseStatus.message,
      errorCode: licenseStatus.errorCode
    });
  }

  return res.status(200).json(licenseStatus);
};

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
    const licenseStatus = await checkLicenseStatus(licenseKey, deviceId);
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
      validUntil: new Date(new Date(license.registeredAt || Date.now()).getTime() + (license.licenseDays * 24 * 60 * 60 * 1000)),
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
      errorCode: ERROR_CODES.SERVER_ERROR
    });
  }
};

export const funGetPassphrase = async (req, res) => {
  try {
    const license = req.license;
    if (!license) {
      return res.status(401).json({
        message: 'Unauthorized',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }

    return res.status(200).json({
      message: 'Passphrase retrieved successfully',
      data: {
        passphrase: license.passphrase
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Error retrieving passphrase',
      error: error.message,
      errorCode: ERROR_CODES.SERVER_ERROR
    });
  }
};

export const getLicenses = async (req, res) => {
  const { schoolId } = req.params;
  try {
    const school = await School.findOne({ schoolId }).lean();
    const licenses = await License.find({ schoolId: school._id }).lean();
    if (licenses.length === 0) {
      res.json({ message: 'No licenses found', licenses: [] });
    } else {
      res.json({ message: 'Licenses fetched', licenses });
    }
  } catch (error) {
    res.status(500).json({ errorCode: ERROR_CODES.SERVER_ERROR, message: error.message || 'Error fetching licenses', error });
  }
};

/**
 This controller exists to migrate legacy Android device bindings created by older app versions that used Build.ID (AND_*), which can be identical across many IFP devices and break one-license-per-device enforcement; it safely rebinds an already-registered license from oldDeviceId to a new unique ANDV2_* ID only when ownership checks pass (licenseKey + current registeredTo match), is idempotent for retries, and rotates/returns security parameters so client signatures remain consistent after migration.
 */
export const funMigrateDeviceId = async (req, res) => {
  const { licenseKey, oldDeviceId, newDeviceId } = req.body;

  if (!licenseKey || !oldDeviceId || !newDeviceId) {
    return res.status(400).json({
      success: false,
      message: 'licenseKey, oldDeviceId and newDeviceId are required',
      errorCode: ERROR_CODES.BAD_REQUEST,
    });
  }

  if (oldDeviceId === newDeviceId) {
    return res.status(200).json({
      success: true,
      message: 'Already migrated',
      data: { migrated: false },
    });
  }

  try {
    const licenseStatus = await checkLicenseStatus(licenseKey, null, {
      // Migration must enforce its own old/new binding rules; do not bypass
      // frozen/expired/not-found checks, only defer device ownership checks.
      skipDeviceBindingCheck: true,
    });

    if (!licenseStatus.licenseObj) {
      return res.status(404).json({
        success: false,
        message: licenseStatus.message,
        errorCode: licenseStatus.errorCode,
      });
    }

    const license = licenseStatus.licenseObj;

    if (!licenseStatus.isActive) {
      return res.status(licenseStatus.errorCode === ERROR_CODES.NOT_ACCEPTABLE ? 406 : 401).json({
        success: false,
        message: licenseStatus.message,
        errorCode: licenseStatus.errorCode,
      });
    }

    if (!license.isRegistered) {
      return res.status(409).json({
        success: false,
        message: 'License is not registered yet. Use activation endpoint.',
        errorCode: ERROR_CODES.CONFLICT,
      });
    }

    // Idempotent success if already moved.
    if (license.registeredTo === newDeviceId) {
      const signingKey = generateSigningKey();
      const deviceFingerprint = generateDeviceFingerprint(newDeviceId);
      const offlineToken = generateOfflineToken(licenseKey);

      const securityParams = {
        signingKey,
        deviceFingerprint,
        offlineToken,
        validUntil: new Date(
          new Date(license.registeredAt).getTime() +
          license.licenseDays * 24 * 60 * 60 * 1000
        ),
        lastSyncTimestamp: Date.now(),
        securityVersion: '1.0',
      };

      license.securityParams = encrypt(securityParams, licenseKey);
      await license.save();

      return res.status(200).json({
        success: true,
        message: 'Already migrated',
        data: {
          migrated: false,
          securityParams: {
            apiKey: license.apiKey,
            deviceFingerprint,
            offlineToken,
            signingKey,
          },
        },
      });
    }

    if (license.registeredTo !== oldDeviceId) {
      return res.status(401).json({
        success: false,
        message: 'License is not registered to oldDeviceId',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    // Migrate binding
    license.registeredTo = newDeviceId;
    license.reusedAt = new Date();

    // Rotate security params against new ID
    const signingKey = generateSigningKey();
    const deviceFingerprint = generateDeviceFingerprint(newDeviceId);
    const offlineToken = generateOfflineToken(licenseKey);

    const securityParams = {
      signingKey,
      deviceFingerprint,
      offlineToken,
      validUntil: new Date(
        new Date(license.registeredAt).getTime() +
        license.licenseDays * 24 * 60 * 60 * 1000
      ),
      lastSyncTimestamp: Date.now(),
      securityVersion: '1.0',
    };

    license.securityParams = encrypt(securityParams, licenseKey);
    await license.save();

    return res.status(200).json({
      success: true,
      message: 'Device ID migrated successfully',
      data: {
        migrated: true,
        securityParams: {
          apiKey: license.apiKey,
          deviceFingerprint,
          offlineToken,
          signingKey,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error migrating device ID',
      error: error.message,
      errorCode: ERROR_CODES.SERVER_ERROR,
    });
  }
};
