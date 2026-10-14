import { expect } from 'chai';
import sinon from 'sinon';
import { funRefreshLicense } from '../../src/controllers/license.controller.js';
import { License, School, Project, Organization } from '../../src/models/mongo.model.js';
import { ERROR_CODES } from '../../src/constants/error.constants.js';

const LICENSE_ID = '507f1f77bcf86cd799439011';

function settingsQuery(doc) {
  return { select: () => ({ lean: () => Promise.resolve(doc) }) };
}

describe('funRefreshLicense', () => {
  let sandbox;
  let res;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.spy(),
    };
  });

  afterEach(() => sandbox.restore());

  function stubParents({ school, project, org }) {
    sandbox.stub(School, 'findById').returns(settingsQuery(school));
    sandbox.stub(Project, 'findById').returns(settingsQuery(project));
    sandbox.stub(Organization, 'findById').returns(settingsQuery(org));
  }

  it('clears registration when the organization is demo', async () => {
    const license = {
      licenseKey: 'lic-demo',
      isRegistered: true,
      schoolId: 'school',
      projectId: 'project',
      orgId: 'org',
      save: sandbox.stub().resolves(),
    };
    sandbox.stub(License, 'findById').resolves(license);
    stubParents({
      school: { settings: {} },
      project: { settings: {} },
      org: { settings: { purpose: 'demo' } },
    });

    await funRefreshLicense({ params: { licenseId: LICENSE_ID } }, res);

    expect(license.isRegistered).to.equal(false);
    expect(license.save.calledOnce).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('clears registration when the school is testing', async () => {
    const license = {
      licenseKey: 'lic-test',
      isRegistered: true,
      schoolId: 'school',
      projectId: 'project',
      orgId: 'org',
      save: sandbox.stub().resolves(),
    };
    sandbox.stub(License, 'findById').resolves(license);
    stubParents({
      school: { settings: { purpose: 'testing' } },
      project: { settings: { purpose: 'production' } },
      org: { settings: {} },
    });

    await funRefreshLicense({ params: { licenseId: LICENSE_ID } }, res);

    expect(license.save.calledOnce).to.equal(true);
    expect(res.status.calledWith(200)).to.equal(true);
  });

  it('refuses live licenses without changing registration', async () => {
    const license = {
      licenseKey: 'lic-live',
      isRegistered: true,
      schoolId: 'school',
      projectId: 'project',
      orgId: 'org',
      save: sandbox.stub().resolves(),
    };
    sandbox.stub(License, 'findById').resolves(license);
    stubParents({
      school: { settings: {} },
      project: null,
      org: { settings: { purpose: 'production' } },
    });

    await funRefreshLicense({ params: { licenseId: LICENSE_ID } }, res);

    expect(license.isRegistered).to.equal(true);
    expect(license.save.called).to.equal(false);
    expect(res.status.calledWith(403)).to.equal(true);
    expect(res.json.firstCall.args[0].errorCode).to.equal(ERROR_CODES.FORBIDDEN);
  });
});
