import { expect } from 'chai';
import sinon from 'sinon';
import { storeBatchReports } from '../../src/controllers/reports.controller.js';
import * as reportsService from '../../src/services/reports.service.js';
import { ERROR_CODES } from '../../src/constants/error.constants.js';

describe('Reports Controller', () => {
  describe('storeBatchReports', () => {
    let req, res, validateBatchSizeStub, processReportsStub;
    
    beforeEach(() => {
      // Setup request mock
      req = {
        body: [
          { reportId: 'report1', data: 'test-data-1' },
          { reportId: 'report2', data: 'test-data-2' }
        ],
        license: {
          _id: 'license-id',
          licenseKey: 'test-license-key',
          schoolId: 'school-id',
          partnerId: 'partner-id',
          registeredTo: 'device-id'
        }
      };
      
      // Setup response mock
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.spy()
      };
      
      // Stub reports service functions
      validateBatchSizeStub = sinon.stub(reportsService, 'validateBatchSize');
      processReportsStub = sinon.stub(reportsService, 'processReports');
      
      // Default behavior for stubs
      validateBatchSizeStub.returns({ isValid: true });
      processReportsStub.resolves({
        success: true,
        data: {
          totalCount: 2,
          validCount: 2,
          invalidCount: 0,
          syncStatus: [
            { reportId: 'report1', synced: true, error: null, storedAt: new Date() },
            { reportId: 'report2', synced: true, error: null, storedAt: new Date() }
          ]
        }
      });
    });
    
    afterEach(() => {
      sinon.restore();
    });
    
    it('should return 200 and success data when all reports are valid', async () => {
      await storeBatchReports(req, res);
      
      expect(validateBatchSizeStub.calledOnce).to.be.true;
      expect(processReportsStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseBody = res.json.firstCall.args[0];
      expect(responseBody).to.have.property('message', 'Reports stored successfully');
      expect(responseBody).to.have.property('data');
      expect(responseBody.data).to.have.property('totalCount', 2);
      expect(responseBody.data).to.have.property('validCount', 2);
    });
    
    it('should return 400 when batch size validation fails', async () => {
      // Make batch size validation fail
      validateBatchSizeStub.returns({
        isValid: false,
        error: {
          message: 'Batch size exceeded',
          errorCode: ERROR_CODES.BAD_REQUEST
        }
      });
      
      await storeBatchReports(req, res);
      
      expect(validateBatchSizeStub.calledOnce).to.be.true;
      expect(processReportsStub.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.have.property('message', 'Batch size exceeded');
      expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.BAD_REQUEST);
    });
    
    it('should return 400 when validation errors occur during processing', async () => {
      // Make processing return validation errors
      processReportsStub.resolves({
        success: false,
        error: {
          message: 'Some reports failed validation',
          errors: [{ reportId: 'report1', error: 'Invalid data' }],
          errorCode: ERROR_CODES.VALIDATION_ERROR
        }
      });
      
      await storeBatchReports(req, res);
      
      expect(validateBatchSizeStub.calledOnce).to.be.true;
      expect(processReportsStub.calledOnce).to.be.true;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.have.property('message', 'Some reports failed validation');
      expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.VALIDATION_ERROR);
    });
    
    it('should return 500 when an internal server error occurs', async () => {
      // Make processing return a server error
      processReportsStub.resolves({
        success: false,
        error: {
          message: 'Error processing reports',
          error: 'Database error',
          errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR
        }
      });
      
      await storeBatchReports(req, res);
      
      expect(validateBatchSizeStub.calledOnce).to.be.true;
      expect(processReportsStub.calledOnce).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.have.property('message', 'Error processing reports');
      expect(res.json.firstCall.args[0]).to.have.property('errorCode', ERROR_CODES.INTERNAL_SERVER_ERROR);
    });
    
    it('should process reports with partial success', async () => {
      // Make processing return mixed results
      processReportsStub.resolves({
        success: true,
        data: {
          totalCount: 2,
          validCount: 1,
          invalidCount: 1,
          syncStatus: [
            { reportId: 'report1', synced: true, error: null, storedAt: new Date() },
            { reportId: 'report2', synced: false, error: 'Validation error', storedAt: null }
          ]
        }
      });
      
      await storeBatchReports(req, res);
      
      expect(validateBatchSizeStub.calledOnce).to.be.true;
      expect(processReportsStub.calledOnce).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      const responseBody = res.json.firstCall.args[0];
      expect(responseBody).to.have.property('message', 'Reports stored successfully');
      expect(responseBody.data).to.have.property('totalCount', 2);
      expect(responseBody.data).to.have.property('validCount', 1);
      expect(responseBody.data).to.have.property('invalidCount', 1);
    });
  });
}); 