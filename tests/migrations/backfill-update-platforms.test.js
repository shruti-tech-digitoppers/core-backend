import { expect } from "chai";
import sinon from "sinon";
import { backfillUpdatePlatforms } from "../../src/migrations/backfill-update-platforms.js";

const findChain = (value) => ({
  select: sinon.stub().returnsThis(),
  lean: sinon.stub().resolves(value)
});

const createModels = ({ rollouts = [], bundles = [] } = {}) => {
  const UpdateBundle = {
    collection: { createIndex: sinon.stub().resolves("index") },
    countDocuments: sinon.stub(),
    updateMany: sinon.stub(),
    find: sinon.stub().returns(findChain(bundles))
  };
  const Rollout = {
    collection: { createIndex: sinon.stub().resolves("index") },
    find: sinon.stub().returns(findChain(rollouts)),
    bulkWrite: sinon.stub().resolves({ modifiedCount: 0 })
  };

  return { UpdateBundle, Rollout };
};

describe("Phase 7 update platform backfill", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("backfills Android bundle metadata and rollout platform snapshots", async () => {
    const models = createModels({
      rollouts: [
        { _id: "rollout-windows", bundleId: "bundle-windows", platform: "android" },
        { _id: "rollout-content", bundleId: "bundle-content", platform: "all" },
        { _id: "rollout-android", bundleId: "bundle-android", platform: "android" }
      ],
      bundles: [
        { _id: "bundle-windows", platform: "windows" },
        { _id: "bundle-content", platform: "all" },
        { _id: "bundle-android", platform: "android" }
      ]
    });

    models.UpdateBundle.updateMany
      .onCall(0).resolves({ matchedCount: 2, modifiedCount: 2 })
      .onCall(1).resolves({ matchedCount: 1, modifiedCount: 1 })
      .onCall(2).resolves({ matchedCount: 1, modifiedCount: 1 })
      .onCall(3).resolves({ matchedCount: 1, modifiedCount: 1 });
    models.Rollout.bulkWrite.resolves({ modifiedCount: 1 });

    const stats = await backfillUpdatePlatforms({
      models,
      logger: { log: sinon.stub() }
    });

    expect(models.UpdateBundle.collection.createIndex.calledWith({ platform: 1 })).to.equal(true);
    expect(models.Rollout.collection.createIndex.calledWith(
      { status: 1, platform: 1, targetLicenses: 1 },
      { name: "status_1_platform_1_targetLicenses_1" }
    )).to.equal(true);
    expect(models.UpdateBundle.updateMany.firstCall.args[1]).to.deep.equal({
      $set: { platform: "android" }
    });
    expect(models.UpdateBundle.updateMany.secondCall.args[1]).to.deep.equal({
      $set: { "version.app.platform": "android" }
    });
    expect(models.UpdateBundle.updateMany.thirdCall.args[1]).to.deep.equal({
      $set: { "version.app.artifactKind": "android_apk" }
    });
    expect(models.UpdateBundle.updateMany.getCall(3).args[1]).to.deep.equal({
      $set: { "version.app.artifactPath": "app/app.apk" }
    });
    expect(models.Rollout.bulkWrite.firstCall.args[0]).to.deep.equal([{
      updateOne: {
        filter: { _id: "rollout-windows" },
        update: { $set: { platform: "windows" } }
      }
    }]);
    expect(stats.rollouts).to.include({
      scanned: 3,
      matchedCount: 1,
      modifiedCount: 1
    });
  });

  it("supports dry-run counts without writing or creating indexes", async () => {
    const models = createModels({
      rollouts: [{ _id: "rollout-windows", bundleId: "bundle-windows", platform: "android" }],
      bundles: [{ _id: "bundle-windows", platform: "windows" }]
    });
    models.UpdateBundle.countDocuments
      .onCall(0).resolves(2)
      .onCall(1).resolves(1)
      .onCall(2).resolves(1)
      .onCall(3).resolves(1);

    const stats = await backfillUpdatePlatforms({
      dryRun: true,
      models,
      logger: { log: sinon.stub() }
    });

    expect(models.UpdateBundle.collection.createIndex.notCalled).to.equal(true);
    expect(models.Rollout.collection.createIndex.notCalled).to.equal(true);
    expect(models.UpdateBundle.updateMany.notCalled).to.equal(true);
    expect(models.Rollout.bulkWrite.notCalled).to.equal(true);
    expect(stats.dryRun).to.equal(true);
    expect(stats.bundles.platform).to.deep.equal({ matchedCount: 2, modifiedCount: 0 });
    expect(stats.rollouts).to.include({
      scanned: 1,
      matchedCount: 1,
      modifiedCount: 0
    });
  });
});
