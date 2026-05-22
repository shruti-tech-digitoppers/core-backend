import { expect } from "chai";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import sinon from "sinon";
import { finalizeBundle, initiateUpload, uploadLocalBundle } from "../../../src/controllers/dashboard/updates.controller.js";
import { UpdateBundle } from "../../../src/models/mongo.model.js";

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

const createZipBuffer = (entries) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [entryPath, value] of entries) {
    const name = Buffer.from(entryPath);
    const data = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const writeZip = (entries) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lms-admin-bundle-"));
  const filePath = path.join(dir, "bundle.zip");
  fs.writeFileSync(filePath, createZipBuffer(entries));
  return { dir, filePath };
};

const makeResponse = () => ({
  status: sinon.stub().returnsThis(),
  json: sinon.spy()
});

describe("Dashboard update bundle controller", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("defaults missing bundle platform to Android during upload initiation", async () => {
    const createStub = sinon.stub(UpdateBundle, "create").resolves({ _id: "bundle-1" });
    const res = makeResponse();

    await initiateUpload({ body: { type: "app", key: "phase3-default.zip" } }, res);

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.firstCall.args[0]).to.include({ id: "bundle-1", platform: "android" });
    expect(createStub.firstCall.args[0]).to.include({ type: "app", platform: "android" });
  });

  it("rejects all-platform app bundles during upload initiation", async () => {
    const createStub = sinon.stub(UpdateBundle, "create");
    const res = makeResponse();

    await initiateUpload({ body: { type: "app", platform: "all" } }, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.firstCall.args[0].message).to.equal('Bundle platform "all" is only valid for content bundles');
    expect(createStub.notCalled).to.be.true;
  });

  it("accepts all-platform content bundles during upload initiation", async () => {
    const createStub = sinon.stub(UpdateBundle, "create").resolves({ _id: "bundle-2" });
    const res = makeResponse();

    await initiateUpload({ body: { type: "content", platform: "all", key: "phase3-content.zip" } }, res);

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.firstCall.args[0]).to.include({ id: "bundle-2", platform: "all" });
    expect(createStub.firstCall.args[0]).to.include({ type: "content", platform: "all" });
  });

  it("finalizes Windows bundles with parsed installer metadata and platform in the response", async () => {
    const installer = Buffer.from("windows installer");
    const { dir, filePath } = writeZip([
      ["app/windows/installer.exe", installer],
      ["app/metadata.json", JSON.stringify({
        platform: "windows",
        versionName: "2.2.6",
        versionCode: 226,
        installerSha256: sha256(installer),
        installerSizeBytes: installer.length
      })]
    ]);
    const updateStub = sinon.stub(UpdateBundle, "updateOne").resolves();
    sinon.stub(UpdateBundle, "findById").resolves({
      _id: "bundle-3",
      type: "app",
      platform: "windows",
      storage: { filePath }
    });
    const res = makeResponse();

    try {
      await finalizeBundle({ params: { id: "bundle-3" } }, res);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    expect(res.json.firstCall.args[0]).to.include({ id: "bundle-3", platform: "windows" });
    expect(res.json.firstCall.args[0].version.app).to.include({
      platform: "windows",
      artifactKind: "windows_installer",
      installerPath: "app/windows/installer.exe"
    });
    expect(updateStub.firstCall.args[1].$set.platform).to.equal("windows");
    expect(updateStub.firstCall.args[1].$set.version.app.installerSha256).to.equal(sha256(installer));
  });

  it("finalizes all-platform content bundles with parsed content metadata", async () => {
    const content = Buffer.from("lesson");
    const { dir, filePath } = writeZip([
      ["content/manifest.json", JSON.stringify({
        version: "content-1",
        baseVersion: "content-0",
        files: [{ path: "lesson.txt", type: "text/plain" }]
      })],
      ["content/files/lesson.txt", content]
    ]);
    const updateStub = sinon.stub(UpdateBundle, "updateOne").resolves();
    sinon.stub(UpdateBundle, "findById").resolves({
      _id: "bundle-4",
      type: "content",
      platform: "all",
      storage: { filePath }
    });
    const res = makeResponse();

    try {
      await finalizeBundle({ params: { id: "bundle-4" } }, res);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    expect(res.json.firstCall.args[0]).to.include({ id: "bundle-4", platform: "all" });
    expect(res.json.firstCall.args[0].version.content).to.deep.equal({
      version: "content-1",
      baseVersion: "content-0"
    });
    expect(updateStub.firstCall.args[1].$set.platform).to.equal("all");
  });

  it("uploads local Windows bundles using the stored platform", async () => {
    const installer = Buffer.from("local windows installer");
    const source = writeZip([
      ["app/windows/installer.exe", installer],
      ["app/metadata.json", JSON.stringify({
        platform: "windows",
        versionName: "2.2.8",
        versionCode: 228,
        installerSha256: sha256(installer),
        installerSizeBytes: installer.length
      })]
    ]);
    const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "lms-local-target-"));
    const targetPath = path.join(targetDir, "bundle.zip");
    const updateStub = sinon.stub(UpdateBundle, "updateOne").resolves();
    sinon.stub(UpdateBundle, "findById").resolves({
      _id: "bundle-5",
      type: "app",
      platform: "windows",
      storage: { filePath: targetPath }
    });
    const res = makeResponse();

    try {
      await uploadLocalBundle({
        params: { id: "bundle-5" },
        file: { path: source.filePath }
      }, res);
    } finally {
      fs.rmSync(source.dir, { recursive: true, force: true });
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    expect(res.status.calledWith(201)).to.be.true;
    expect(res.json.firstCall.args[0]).to.include({ id: "bundle-5", platform: "windows" });
    expect(updateStub.firstCall.args[1].$set.platform).to.equal("windows");
    expect(updateStub.firstCall.args[1].$set.version.app.versionCode).to.equal(228);
  });
});
