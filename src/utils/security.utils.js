import crypto from 'crypto';

// Generate a unique signing key
export const generateSigningKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate device fingerprint
export const generateDeviceFingerprint = (deviceId) => {
  return crypto.createHash('sha256').update(deviceId).digest('hex');
};

// Add this helper function to derive a fixed-length key
const deriveKey = (inputKey) => {
  // Use SHA-256 to create a 32-byte key from any input string
  return crypto.createHash('sha256').update(String(inputKey)).digest();
};

// Encrypt data with a key
export const encrypt = (data, key) => {
  // Get a 32-byte key from the license key
  const derivedKey = deriveKey(key);
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  };
};

// Decrypt data with a key
export const decrypt = (encryptedData, key) => {
  // Get a 32-byte key from the license key
  const derivedKey = deriveKey(key);
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    derivedKey,
    Buffer.from(encryptedData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};

// Generate request signature
export const generateRequestSignature = (requestData, signingKey, deviceFingerprint) => {
  const timestamp = Date.now();
  const signatureData = {
    requestData: requestData,
    timestamp,
    deviceFingerprint
  };
  
  return {
    signature: crypto.createHmac('sha256', signingKey)
      .update(JSON.stringify(signatureData))
      .digest('hex'),
    timestamp
  };
};

// Validate request signature
export const validateRequestSignature = (requestData, signature, signingKey, deviceFingerprint, timestamp) => {
  const signatureData = {
    requestData: requestData,
    timestamp,
    deviceFingerprint
  };
  
  const expectedSignature = crypto.createHmac('sha256', signingKey)
    .update(JSON.stringify(signatureData))
    .digest('hex');
    
  return signature === expectedSignature;
};

// Generate offline token
export const generateOfflineToken = (licenseKey) => {
  return crypto.randomBytes(16).toString('hex');
};

// Validate offline token
export const validateOfflineToken = async (offlineToken, license) => {
  // Implement your offline token validation logic here
  // This could involve checking against a stored token or using a time-based validation
  return true;
}; 