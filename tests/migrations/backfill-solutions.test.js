import { expect } from "chai";
import sinon from "sinon";
import { backfillSolutions } from "../../src/migrations/backfill-solutions.js";
import { defaultSolutionForPlatform } from "../../src/constants/platforms.constants.js";

const findChain = (value) => ({
  select: sinon.stub().returnsThis(),
  lean: sinon.stub().resolves(value)
});

const createModels = (schools = []) => ({
  License: {
    countDocuments: sinon.stub().resolves(3),
    updateMany: sinon.stub().resolves({ matchedCount: 2, modifiedCount: 2 })
  },
  School: {
    find: sinon.stub().returns(findChain(schools)),
    bulkWrite: sinon.stub().resolves({ modifiedCount: 1 })
  }
});

describe("Solution backfill", () => {
  afterEach(() => sinon.restore());

  it("maps only unambiguous platforms to a default solution", () => {
    expect(defaultSolutionForPlatform("ifp")).to.equal("smartshala");
    expect(defaultSolutionForPlatform("tablet")).to.equal("epathshala_lab");
    expect(defaultSolutionForPlatform("android_laptop")).to.equal("epathshala_lab");
    expect(defaultSolutionForPlatform("windows")).to.equal(null);
    expect(defaultSolutionForPlatform("linux")).to.equal(null);
  });

  it("sets license and school platform solutions, leaving windows/linux and manual choices untouched", async () => {
    const models = createModels([
      {
        _id: "school-1",
        platforms: [
          { platform: "ifp" },
          { platform: "windows" },
          { platform: "tablet", solution: "smartshala" }
        ]
      },
      { _id: "school-2", platforms: [{ platform: "linux" }] }
    ]);

    const stats = await backfillSolutions({ models, logger: { log: sinon.stub() } });

    const licenseCalls = models.License.updateMany.getCalls().map((c) => [c.args[0].platform, c.args[1]]);
    expect(licenseCalls).to.deep.equal([
      ["ifp", { $set: { solution: "smartshala" } }],
      ["tablet", { $set: { solution: "epathshala_lab" } }],
      ["android_laptop", { $set: { solution: "epathshala_lab" } }]
    ]);
    expect(models.School.bulkWrite.firstCall.args[0]).to.deep.equal([{
      updateOne: { filter: { _id: "school-1" }, update: { $set: { "platforms.0.solution": "smartshala" } } }
    }]);
    expect(stats.schools).to.include({ scanned: 2, matchedCount: 1, modifiedCount: 1 });
  });

  it("supports dry-run counts without writing", async () => {
    const models = createModels([{ _id: "school-1", platforms: [{ platform: "ifp" }] }]);

    const stats = await backfillSolutions({ dryRun: true, models, logger: { log: sinon.stub() } });

    expect(models.License.updateMany.notCalled).to.equal(true);
    expect(models.School.bulkWrite.notCalled).to.equal(true);
    expect(stats.licenses.ifp).to.deep.equal({ solution: "smartshala", matchedCount: 3, modifiedCount: 0 });
    expect(stats.schools.matchedCount).to.equal(1);
  });
});
