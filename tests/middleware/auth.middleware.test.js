import { expect } from 'chai';
import sinon from 'sinon';
import { authMiddleware } from '../../src/middleware/auth.middleware.js';
import { License } from '../../src/models/mongo.model.js';
import { checkLicenseStatus } from '../../src/utils/license.utils.js';
import { decrypt, validateRequestSignature, validateOfflineToken } from '../../src/utils/security.utils.js';
import { ERROR_CODES } from '../../src/constants/error.constants.js';

describe('Auth Middleware', () => {
  let req, res, next, mockLicense, licenseStatusResult;
  
  beforeEach(() => {
    // Setup request mock
    req = {
      headers: {
        'x-api-key': 'test-api-key',
        'x-device-id': 'test-device-id',
        'x-request-timestamp': Date.now().toString(),
        'x-request-signature': 'test-signature',
        'x-security-version': '1.0',
        'x-offline-token': 'test-offline-token'
      },
      body: { test: 'data' }
    };
    
    // Setup response mock
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    // Setup next function mock
    next = sinon.spy();
    
    // Setup mock license
    mockLicense = {
      _id: 'license-id',
      licenseKey: 'test-license-key',
      apiKey: 'test-api-key',
      registeredTo: 'test-device-id',
      securityParams: { /* mock encrypted params */ },
      schoolId: 'school-id',
      partnerId: 'partner-id'
    };
    
    // Mock license status result
    licenseStatusResult = {
      isActive: true,
      message: 'License is active',
      licenseObj: mockLicense
    };
    
    // Stub License.findOne
    sinon.stub(License, 'findOne').resolves(mockLicense);
    
    // Stub checkLicenseStatus
    sinon.stub(checkLicenseStatus, 'checkLicenseStatus').resolves(licenseStatusResult);
    
    // Stub security utils
    sinon.stub(decrypt, 'decrypt').returns({
      signingKey: 'mock-signing-key',
      deviceFingerprint: 'test-device-id',
      offlineToken: 'test-offline-token'
    });
    
    sinon.stub(validateRequestSignature, 'validateRequestSignature').returns(true);
    sinon.stub(validateOfflineToken, 'validateOfflineToken').resolves(true);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  it('should call next() when all validations pass', async () => {
    await authMiddleware(req, res, next);
    
    expect(next.calledOnce).to.be.true;
    expect(req.license).to.deep.equal(mockLicense);
    expect(req.securityParams).to.exist;
  });
  
  it('should return 401 when required headers are missing', async () => {
    // Remove a required header
    delete req.headers['x-api-key'];
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.UNAUTHORIZED);
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when API key is not found', async () => {
    // Make License.findOne return null
    License.findOne.resolves(null);
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.UNAUTHORIZED);
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when device ID does not match', async () => {
    // Change the registered device ID
    mockLicense.registeredTo = 'different-device-id';
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('message', 'Device mismatch');
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when timestamp is too old', async () => {
    // Set timestamp to 10 minutes ago (exceeds 5 minute limit)
    req.headers['x-request-timestamp'] = (Date.now() - 10 * 60 * 1000).toString();
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('message', 'Request expired');
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when signature is invalid', async () => {
    // Make signature validation fail
    validateRequestSignature.validateRequestSignature.returns(false);
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('message', 'Invalid request signature');
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when offline token is invalid', async () => {
    // Make offline token validation fail
    validateOfflineToken.validateOfflineToken.resolves(false);
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('message', 'Invalid offline token');
    expect(next.called).to.be.false;
  });
  
  it('should return 401 when license is not active', async () => {
    // Make license inactive
    licenseStatusResult.isActive = false;
    licenseStatusResult.message = 'License is expired';
    licenseStatusResult.errorCode = ERROR_CODES.NOT_ACCEPTABLE;
    
    await authMiddleware(req, res, next);
    
    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledOnce).to.be.true;
    expect(res.json.firstCall.args[0]).to.have.property('message', 'License is expired');
    expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.NOT_ACCEPTABLE);
    expect(next.called).to.be.false;
  });
}); 