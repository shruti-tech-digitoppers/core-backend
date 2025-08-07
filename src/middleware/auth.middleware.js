import { License } from '../models/mongo.model.js';
import { checkLicenseStatus } from '../utils/license.utils.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { decrypt, validateRequestSignature, validateOfflineToken } from '../utils/security.utils.js';

export const authMiddleware = async (req, res, next) => {
  const {
    'x-api-key': apiKey,
    'x-device-id': deviceId,
    'x-request-timestamp': timestamp,
    'x-request-signature': signature,
    'x-security-version': securityVersion,
    'x-offline-token': offlineToken
  } = req.headers;

  if (!apiKey || !deviceId || !timestamp || !signature || !offlineToken) {
    return res.status(401).json({ 
      message: 'Missing required security headers', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  const license = await License.findOne({ apiKey });
  if (!license) {
    return res.status(401).json({ 
      message: 'Invalid API key', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  // Validate device ID
  if (license.registeredTo !== deviceId) {
    return res.status(401).json({ 
      message: 'Device mismatch', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  // Validate timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  if (Math.abs(currentTime - requestTime) > 300000) { // 5 minutes
    return res.status(401).json({ 
      message: 'Request expired', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  // Decrypt security parameters
  const securityParams = decrypt(license.securityParams, license.licenseKey);

  // Validate request signature
  const isValidSignature = true; // Placeholder for actual signature validation logic
  // TODO: Uncomment the line below when implementing signature validation
  // validateRequestSignature(
  //   req.body,
  //   signature,
  //   securityParams.signingKey,
  //   deviceId,
  //   timestamp
  // );

  if (!isValidSignature) {
    return res.status(401).json({ 
      message: 'Invalid request signature', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  // Validate offline token
  const isValidOfflineToken = await validateOfflineToken(offlineToken, license);
  if (!isValidOfflineToken) {
    return res.status(401).json({ 
      message: 'Invalid offline token', 
      errorCode: ERROR_CODES.UNAUTHORIZED 
    });
  }

  // Check license status
  const licenseStatus = await checkLicenseStatus(license.licenseKey);
  if (!licenseStatus.isActive) {
    return res.status(401).json({ 
      message: licenseStatus.message, 
      errorCode: licenseStatus.errorCode 
    });
  }

  // Attach license and security info to request
  req.license = license;
  req.securityParams = securityParams;
  next();
};
