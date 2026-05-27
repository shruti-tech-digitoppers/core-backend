import { expect } from "chai";
import mongoose from "mongoose";
import deviceSchema from "../../src/models/device.mongo.model.js";
import rolloutSchema from "../../src/models/rollout.mongo.model.js";
import updateBundleSchema from "../../src/models/updateBundle.mongo.model.js";
import updateEventSchema from "../../src/models/updateEvent.mongo.model.js";
import {
  arePlatformsCompatible,
  normalizeBundlePlatform,
  normalizeClientPlatform,
  normalizeLicensePlatform,
  normalizeRolloutPlatform,
  validateBundlePlatformForType
} from "../../src/utils/update-platform.utils.js";

let modelCounter = 0;
const modelFor = (name, schema) => {
  modelCounter += 1;
  return mongoose.model(`${name}${modelCounter}`, schema);
};

describe("Update platform foundation", () => {
  describe("platform normalization helpers", () => {
    it("normalizes Android license labels to the client app platform", () => {
      expect(normalizeLicensePlatform("tablet")).to.equal("android");
      expect(normalizeLicensePlatform("ifp")).to.equal("android");
      expect(normalizeLicensePlatform("windows")).to.equal("windows");
      expect(normalizeLicensePlatform("linux")).to.equal("linux");
    });

    it("normalizes defensive client platform aliases", () => {
      expect(normalizeClientPlatform("android")).to.equal("android");
      expect(normalizeClientPlatform("tablet")).to.equal("android");
      expect(normalizeClientPlatform("ifp")).to.equal("android");
      expect(normalizeClientPlatform(" WINDOWS ")).to.equal("windows");
    });

    it("interprets missing bundle and rollout platforms as Android for legacy reads", () => {
      expect(normalizeBundlePlatform(undefined)).to.equal("android");
      expect(normalizeRolloutPlatform(undefined)).to.equal("android");
    });

    it("checks license and client compatibility after normalization", () => {
      expect(arePlatformsCompatible("tablet", "android")).to.equal(true);
      expect(arePlatformsCompatible("ifp", "android")).to.equal(true);
      expect(arePlatformsCompatible("windows", "windows")).to.equal(true);
      expect(arePlatformsCompatible("windows", "android")).to.equal(false);
    });

    it("rejects content-only all for app and combined bundles", () => {
      expect(validateBundlePlatformForType("content", "all")).to.equal("all");
      expect(() => validateBundlePlatformForType("app", "all")).to.throw(
        'Bundle platform "all" is only valid for content bundles'
      );
      expect(() => validateBundlePlatformForType("combined", "all")).to.throw(
        'Bundle platform "all" is only valid for content bundles'
      );
    });
  });

  describe("schema validation", () => {
    it("defaults new update bundles and rollouts to Android platform", () => {
      const UpdateBundle = modelFor("PhaseOneUpdateBundle", updateBundleSchema);
      const Rollout = modelFor("PhaseOneRollout", rolloutSchema);
      const bundle = new UpdateBundle({ type: "app" });
      const rollout = new Rollout({ bundleId: new mongoose.Types.ObjectId() });

      expect(bundle.platform).to.equal("android");
      expect(rollout.platform).to.equal("android");
      expect(bundle.validateSync()).to.equal(undefined);
      expect(rollout.validateSync()).to.equal(undefined);
    });

    it("accepts Windows app artifact metadata fields", () => {
      const UpdateBundle = modelFor("PhaseOneWindowsBundle", updateBundleSchema);
      const bundle = new UpdateBundle({
        type: "app",
        platform: "windows",
        version: {
          app: {
            platform: "windows",
            versionName: "2.2.6",
            versionCode: 226,
            artifactPath: "app/windows/installer.exe",
            artifactKind: "windows_installer",
            sha256: "abc123",
            sizeBytes: 123456,
            installerPath: "app/windows/installer.exe",
            installerSha256: "abc123",
            installerSizeBytes: 123456,
            silentArgs: ["/S"],
            relaunchArgs: []
          }
        }
      });

      expect(bundle.validateSync()).to.equal(undefined);
    });

    it("represents content platform all in the bundle and rollout schemas", () => {
      const UpdateBundle = modelFor("PhaseOneContentBundle", updateBundleSchema);
      const Rollout = modelFor("PhaseOneContentRollout", rolloutSchema);
      const bundle = new UpdateBundle({ type: "content", platform: "all" });
      const rollout = new Rollout({
        bundleId: new mongoose.Types.ObjectId(),
        platform: "all"
      });

      expect(bundle.validateSync()).to.equal(undefined);
      expect(rollout.validateSync()).to.equal(undefined);
    });

    it("stores a last update summary on devices", () => {
      const Device = modelFor("PhaseOneDevice", deviceSchema);
      const device = new Device({
        deviceId: "device-1",
        licenseId: new mongoose.Types.ObjectId(),
        platform: "windows",
        lastUpdate: {
          bundleId: new mongoose.Types.ObjectId(),
          type: "app",
          platform: "windows",
          status: "install_success",
          event: "install_success",
          updatedAt: new Date(),
          errorCode: "0",
          errorMessage: ""
        }
      });

      expect(device.validateSync()).to.equal(undefined);
    });

    it("accepts unknown non-empty update event names", () => {
      const UpdateEvent = modelFor("PhaseOneUpdateEvent", updateEventSchema);
      const knownEvent = new UpdateEvent({ event: "withdrawn_stop" });
      const futureEvent = new UpdateEvent({ event: "future_client_event" });
      const emptyEvent = new UpdateEvent({ event: "   " });

      expect(knownEvent.validateSync()).to.equal(undefined);
      expect(futureEvent.validateSync()).to.equal(undefined);
      expect(emptyEvent.validateSync()).to.have.nested.property("errors.event");
    });
  });
});
