import crypto from 'crypto';
import { License } from '../models/mongo.model.js';
import { checkLicenseStatus } from '../utils/license.utils.js';
import { ERROR_CODES } from '../constants/error.constants.js';
import { decrypt, validateRequestSignature, validateOfflineToken } from '../utils/security.utils.js';

export const authMiddleware = async (req, res, next) => {
  // -------------------------------------------------------------
  // 1. Internal Service / Tracker Signature Check (Server-to-Server)
  // -------------------------------------------------------------
  const internalSignature = req.headers['x-signature'] || req.headers['x-service-signature'];
  const internalTimestamp = req.headers['x-timestamp'] || req.headers['x-request-timestamp'];
  const serviceName = req.headers['x-service-name'] || 'tracker-backend';

  if (internalSignature) {
    try {
      const secretKey = process.env.INTERNAL_SERVICE_SECRET || 'tracker_core_shared_secret_2026';

      // Replay attack prevention check (5 minutes window) if timestamp provided
      if (internalTimestamp) {
        const requestTime = parseInt(internalTimestamp, 10);
        if (!isNaN(requestTime) && Math.abs(Date.now() - requestTime) > 300000) {
          return res.status(401).json({
            message: 'Internal service request timestamp expired',
            errorCode: ERROR_CODES.UNAUTHORIZED
          });
        }
      }

      // Check simple secret token or HMAC SHA256 signature
      const bodyString = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '';
      const payload = `${req.method}:${req.originalUrl || req.url}:${internalTimestamp || ''}:${bodyString}`;
      
      const expectedHmac = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      const isDirectSecretMatch = internalSignature === secretKey;
      const isHmacMatch = internalSignature === expectedHmac;

      // In development mode or with valid secret/HMAC
      if (isDirectSecretMatch || isHmacMatch || (process.env.NODE_ENV === 'development' && internalSignature === 'dev-secret')) {
        req.isInternalService = true;
        req.serviceName = serviceName;
        return next();
      }

      return res.status(401).json({
        message: 'Invalid internal service signature',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    } catch (err) {
      return res.status(401).json({
        message: 'Error verifying internal service signature',
        errorCode: ERROR_CODES.UNAUTHORIZED
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Standard Client License & Security Headers Check
  // -------------------------------------------------------------
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
  const licenseStatus = await checkLicenseStatus(license.licenseKey, deviceId);
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
