import { expect } from "chai";
import sinon from "sinon";
import { checkForUpdates, proxyDownload } from "../../src/controllers/updates.controller.js";
import { createDownloadToken } from "../../src/services/updates.service.js";
import { Device, License, Rollout, UpdateBundle } from "../../src/models/mongo.model.js";

const makeResponse = () => ({
  status: sinon.stub().returnsThis(),
  json: sinon.spy(),
  end: sinon.spy(),
  redirect: sinon.spy(),
  writeHead: sinon.spy()
});

describe("Public updates controller", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("rejects update checks when the requested platform does not match the license platform", async () => {
    const deviceUpdateStub = sinon.stub(Device, "findOneAndUpdate");
    const res = makeResponse();

    await checkForUpdates({
      license: { _id: "license-1", licenseKey: "license-key", platform: "windows" },
      query: {
        device_id: "device-1",
        license_id: "license-key",
        platform: "android"
      }
    }, res);

    expect(res.status.calledWith(403)).to.equal(true);
    expect(res.json.firstCall.args[0].message).to.equal("License platform mismatch");
    expect(deviceUpdateStub.notCalled).to.equal(true);
  });

  it("stores the normalized device platform during update checks", async () => {
    const deviceUpdateStub = sinon.stub(Device, "findOneAndUpdate").resolves();
    sinon.stub(UpdateBundle, "find").returns({ lean: sinon.stub().resolves([]) });
    sinon.stub(Rollout, "find").returns({ lean: sinon.stub().resolves([]) });
    const res = makeResponse();

    await checkForUpdates({
      license: { _id: "license-2", licenseKey: "license-key", platform: "tablet" },
      query: {
        device_id: "device-2",
        license_id: "license-key",
        platform: "tablet"
      }
    }, res);

    expect(deviceUpdateStub.firstCall.args[1]).to.include({ platform: "android" });
    expect(res.json.firstCall.args[0]).to.deep.equal({ mandatory: false, bundles: [] });
  });

  it("allows token-authenticated proxy downloads without a license_id query fallback", async () => {
    const token = createDownloadToken("bundle-1", "license-1", "device-1");
    sinon.stub(UpdateBundle, "findById").returns({
      lean: sinon.stub().resolves({
        _id: "bundle-1",
        storage: { filePath: "missing-local-bundle.zip" }
      })
    });
    sinon.stub(License, "findById").returns({
      lean: sinon.stub().resolves({ _id: "license-1", licenseKey: "license-key" })
    });
    const res = makeResponse();

    await proxyDownload({
      params: { bundleId: "bundle-1" },
      query: { token },
      headers: {}
    }, res);

    expect(res.status.calledWith(403)).to.equal(false);
    expect(res.status.calledWith(404)).to.equal(true);
  });
});
