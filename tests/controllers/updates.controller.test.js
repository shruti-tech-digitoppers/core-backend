import { expect } from "chai";
import sinon from "sinon";
import { checkForUpdates, ingestEvents, proxyDownload } from "../../src/controllers/updates.controller.js";
import { createDownloadToken } from "../../src/services/updates.service.js";
import { Device, License, Rollout, UpdateBundle, UpdateEvent } from "../../src/models/mongo.model.js";

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

  it("updates device app state and last update from install_success payload", async () => {
    const insertStub = sinon.stub(UpdateEvent, "insertMany").resolves();
    const deviceUpdateStub = sinon.stub(Device, "updateOne").resolves();
    const res = makeResponse();
    const createdAt = "2026-05-22T09:00:00.000Z";

    await ingestEvents({
      license: { _id: "license-1" },
      headers: { "x-device-id": "device-1" },
      body: {
        events: [{
          event: "install_success",
          payload: { versionName: "2.2.6", versionCode: 226 },
          createdAt
        }]
      }
    }, res);

    expect(insertStub.firstCall.args[0][0]).to.include({
      licenseId: "license-1",
      deviceId: "device-1",
      event: "install_success"
    });
    expect(deviceUpdateStub.firstCall.args[1].$set.currentApp).to.deep.equal({
      versionName: "2.2.6",
      versionCode: 226
    });
    expect(deviceUpdateStub.firstCall.args[1].$set.lastUpdate).to.include({
      status: "install_success",
      event: "install_success"
    });
    expect(res.status.calledWith(202)).to.equal(true);
  });

  it("falls back to bundle metadata for install_success without version payload", async () => {
    sinon.stub(UpdateEvent, "insertMany").resolves();
    sinon.stub(UpdateBundle, "find").returns({
      lean: sinon.stub().resolves([{
        _id: "bundle-windows",
        type: "app",
        platform: "windows",
        version: { app: { versionName: "2.2.7", versionCode: 227 } }
      }])
    });
    const deviceUpdateStub = sinon.stub(Device, "updateOne").resolves();
    const res = makeResponse();

    await ingestEvents({
      license: { _id: "license-2" },
      headers: { "x-device-id": "device-2" },
      body: { events: [{ event: "install_success", bundleId: "bundle-windows" }] }
    }, res);

    expect(deviceUpdateStub.firstCall.args[1].$set.currentApp).to.deep.equal({
      versionName: "2.2.7",
      versionCode: 227
    });
    expect(deviceUpdateStub.firstCall.args[1].$set.lastUpdate).to.include({
      bundleId: "bundle-windows",
      type: "app",
      platform: "windows"
    });
    expect(res.status.calledWith(202)).to.equal(true);
  });

  it("stores Windows failure and future event names for support", async () => {
    const insertStub = sinon.stub(UpdateEvent, "insertMany").resolves();
    sinon.stub(UpdateBundle, "find").returns({
      lean: sinon.stub().resolves([{
        _id: "bundle-windows",
        type: "app",
        platform: "windows"
      }])
    });
    const deviceUpdateStub = sinon.stub(Device, "updateOne").resolves();
    const res = makeResponse();

    await ingestEvents({
      license: { _id: "license-3" },
      headers: { "x-device-id": "device-3" },
      body: {
        events: [
          {
            event: "install_failed",
            bundleId: "bundle-windows",
            payload: { errorCode: "1603", errorMessage: "Installer failed" }
          },
          { event: "future_client_event" }
        ]
      }
    }, res);

    expect(insertStub.firstCall.args[0].map(doc => doc.event)).to.deep.equal([
      "install_failed",
      "future_client_event"
    ]);
    expect(deviceUpdateStub.firstCall.args[1].$set.lastUpdate).to.include({
      type: "app",
      platform: "windows",
      status: "install_failed",
      errorCode: "1603",
      errorMessage: "Installer failed"
    });
    expect(deviceUpdateStub.secondCall.args[1].$set.lastUpdate).to.include({
      status: "future_client_event",
      event: "future_client_event"
    });
    expect(res.status.calledWith(202)).to.equal(true);
  });

  it("keeps content_applied device state behavior while updating lastUpdate", async () => {
    sinon.stub(UpdateEvent, "insertMany").resolves();
    sinon.stub(UpdateBundle, "find").returns({
      lean: sinon.stub().resolves([{
        _id: "bundle-content",
        type: "content",
        platform: "all"
      }])
    });
    const deviceUpdateStub = sinon.stub(Device, "updateOne").resolves();
    const res = makeResponse();

    await ingestEvents({
      license: { _id: "license-4" },
      headers: { "x-device-id": "device-4" },
      body: {
        events: [{
          event: "content_applied",
          bundleId: "bundle-content",
          payload: { version: "content-2" }
        }]
      }
    }, res);

    expect(deviceUpdateStub.firstCall.args[1].$set.currentContentVersion).to.equal("content-2");
    expect(deviceUpdateStub.firstCall.args[1].$set.lastUpdate).to.include({
      type: "content",
      platform: "all",
      status: "content_applied"
    });
    expect(res.status.calledWith(202)).to.equal(true);
  });

  it("rejects empty event names while allowing future non-empty names", async () => {
    const insertStub = sinon.stub(UpdateEvent, "insertMany");
    const res = makeResponse();

    await ingestEvents({
      license: { _id: "license-5" },
      headers: { "x-device-id": "device-5" },
      body: { events: [{ event: "   " }] }
    }, res);

    expect(res.status.calledWith(400)).to.equal(true);
    expect(res.json.firstCall.args[0].message).to.equal("Invalid event name");
    expect(insertStub.notCalled).to.equal(true);
  });
});
