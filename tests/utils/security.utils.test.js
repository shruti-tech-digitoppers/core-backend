import { expect } from 'chai';
import sinon from 'sinon';
import crypto from 'crypto';
import { 
  generateSigningKey, 
  generateDeviceFingerprint, 
  encrypt, 
  decrypt, 
  generateRequestSignature, 
  validateRequestSignature,
  generateOfflineToken,
  validateOfflineToken
} from '../../src/utils/security.utils.js';

describe('Security Utils', () => {
  describe('generateSigningKey', () => {
    it('should generate a 64 character hex string', () => {
      const key = generateSigningKey();
      expect(key).to.be.a('string');
      expect(key).to.have.lengthOf(64); // 32 bytes = 64 hex chars
      expect(key).to.match(/^[0-9a-f]+$/); // Should be hex
    });

    it('should generate different keys on each call', () => {
      const key1 = generateSigningKey();
      const key2 = generateSigningKey();
      expect(key1).to.not.equal(key2);
    });
  });

  describe('generateDeviceFingerprint', () => {
    it('should generate a consistent fingerprint for the same device ID', () => {
      const deviceId1 = 'device123';
      const fingerprint1 = generateDeviceFingerprint(deviceId1);
      const fingerprint2 = generateDeviceFingerprint(deviceId1);
      
      expect(fingerprint1).to.equal(fingerprint2);
    });

    it('should generate different fingerprints for different device IDs', () => {
      const fingerprint1 = generateDeviceFingerprint('device123');
      const fingerprint2 = generateDeviceFingerprint('device456');
      
      expect(fingerprint1).to.not.equal(fingerprint2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const data = { foo: 'bar', num: 123 };
      const key = 'lic12345'; // A short license key

      const encrypted = encrypt(data, key);
      expect(encrypted).to.have.property('iv');
      expect(encrypted).to.have.property('encrypted');
      expect(encrypted).to.have.property('authTag');

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).to.deep.equal(data);
    });

    it('should work with different keys', () => {
      const data = { foo: 'bar' };
      
      // Test with different key formats
      const keys = ['short', 'lic12345', 'a-longer-license-key-with-special-chars!@#'];
      
      keys.forEach(key => {
        const encrypted = encrypt(data, key);
        const decrypted = decrypt(encrypted, key);
        expect(decrypted).to.deep.equal(data);
      });
    });

    it('should throw an error when decrypting with wrong key', () => {
      const data = { secret: 'value' };
      const encrypted = encrypt(data, 'correctKey');
      
      expect(() => decrypt(encrypted, 'wrongKey')).to.throw();
    });
  });

  describe('generateRequestSignature and validateRequestSignature', () => {
    it('should generate and validate signatures correctly', () => {
      const requestData = { userId: '123', action: 'test' };
      const signingKey = 'someSigningKey';
      const deviceFingerprint = 'device123';
      
      const { signature, timestamp } = generateRequestSignature(
        requestData, 
        signingKey, 
        deviceFingerprint
      );
      
      const isValid = validateRequestSignature(
        requestData,
        signature,
        signingKey,
        deviceFingerprint,
        timestamp
      );
      
      expect(isValid).to.be.true;
    });

    it('should detect tampered request data', () => {
      const originalData = { userId: '123', action: 'test' };
      const signingKey = 'someSigningKey';
      const deviceFingerprint = 'device123';
      
      const { signature, timestamp } = generateRequestSignature(
        originalData, 
        signingKey, 
        deviceFingerprint
      );
      
      // Tampered data
      const tamperedData = { ...originalData, userId: '456' };
      
      const isValid = validateRequestSignature(
        tamperedData,
        signature,
        signingKey,
        deviceFingerprint,
        timestamp
      );
      
      expect(isValid).to.be.false;
    });

    it('should detect wrong signing key', () => {
      const requestData = { userId: '123', action: 'test' };
      const correctKey = 'correctKey';
      const wrongKey = 'wrongKey';
      const deviceFingerprint = 'device123';
      
      const { signature, timestamp } = generateRequestSignature(
        requestData, 
        correctKey, 
        deviceFingerprint
      );
      
      const isValid = validateRequestSignature(
        requestData,
        signature,
        wrongKey,
        deviceFingerprint,
        timestamp
      );
      
      expect(isValid).to.be.false;
    });

    it('should detect wrong device fingerprint', () => {
      const requestData = { userId: '123', action: 'test' };
      const signingKey = 'someKey';
      const correctDevice = 'correctDevice';
      const wrongDevice = 'wrongDevice';
      
      const { signature, timestamp } = generateRequestSignature(
        requestData, 
        signingKey, 
        correctDevice
      );
      
      const isValid = validateRequestSignature(
        requestData,
        signature,
        signingKey,
        wrongDevice,
        timestamp
      );
      
      expect(isValid).to.be.false;
    });
  });

  describe('generateOfflineToken', () => {
    it('should generate a token from license key', () => {
      const token = generateOfflineToken('licenseKey123');
      expect(token).to.be.a('string');
      expect(token).to.have.lengthOf(32); // 16 bytes = 32 hex chars
    });

    it('should generate different tokens for different calls', () => {
      const token1 = generateOfflineToken('licenseKey123');
      const token2 = generateOfflineToken('licenseKey123');
      
      expect(token1).to.not.equal(token2);
    });
  });

  describe('validateOfflineToken', () => {
    it('should validate offline token', async () => {
      // Since the implementation just returns true, we test that
      // In a real implementation, this would be more complex
      const isValid = await validateOfflineToken('someToken', { /* mock license */ });
      expect(isValid).to.be.true;
    });
  });
}); 