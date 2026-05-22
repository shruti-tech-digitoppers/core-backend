import { expect } from "chai";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import sinon from "sinon";
import { Rollout, UpdateBundle } from "../../src/models/mongo.model.js";
import { buildBundleResponse, parseBundleZip, resolvePendingBundles } from "../../src/services/updates.service.js";

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lms-update-zip-"));
  const filePath = path.join(dir, "bundle.zip");
  fs.writeFileSync(filePath, createZipBuffer(entries));
  return { dir, filePath };
};

const parseZip = async (entries, options) => {
  const { dir, filePath } = writeZip(entries);
  try {
    return await parseBundleZip({ filePath }, options);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const expectRejectedWith = async (promise, message) => {
  try {
    await promise;
  } catch (error) {
    expect(error.message).to.include(message);
    return;
  }
  throw new Error(`Expected promise to reject with "${message}"`);
};

describe("Update bundle ZIP parser", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("parses a valid Windows app bundle with the preferred installer path", async () => {
    const installer = Buffer.from("windows installer");
    const metadata = {
      platform: "windows",
      versionName: "2.2.6",
      versionCode: 226,
      installerSha256: sha256(installer),
      installerSizeBytes: installer.length,
      silentArgs: ["/S"],
      relaunchArgs: [],
      releaseNotes: "Stable Windows release"
    };

    const result = await parseZip([
      ["app/windows/installer.exe", installer],
      ["app/metadata.json", JSON.stringify(metadata)]
    ], { type: "app", platform: "windows" });

    expect(result.version.app).to.include({
      platform: "windows",
      versionName: "2.2.6",
      versionCode: 226,
      artifactKind: "windows_installer",
      artifactPath: "app/windows/installer.exe",
      installerPath: "app/windows/installer.exe",
      installerSha256: sha256(installer),
      installerSizeBytes: installer.length
    });
    expect(result.version.app.silentArgs).to.deep.equal(["/S"]);
  });

  it("parses a Windows app bundle with the fallback installer path", async () => {
    const installer = Buffer.from("fallback installer");

    const result = await parseZip([
      ["app/installer.exe", installer],
      ["app/metadata.json", JSON.stringify({
        platform: "windows",
        versionName: "2.2.7",
        versionCode: 227,
        installerSha256: sha256(installer),
        installerSizeBytes: installer.length
      })]
    ], { type: "app", platform: "windows" });

    expect(result.version.app.installerPath).to.equal("app/installer.exe");
    expect(result.version.app.relaunchArgs).to.deep.equal([]);
  });

  it("rejects Windows bundles with duplicate supported installer paths", async () => {
    const installer = Buffer.from("installer");
    await expectRejectedWith(parseZip([
      ["app/windows/installer.exe", installer],
      ["app/installer.exe", installer],
      ["app/metadata.json", JSON.stringify({
        platform: "windows",
        versionName: "2.2.6",
        versionCode: 226,
        installerSha256: sha256(installer),
        installerSizeBytes: installer.length
      })]
    ], { type: "app", platform: "windows" }),
      "Windows app bundle must contain only one supported installer path"
    );
  });

  it("rejects Windows metadata with mismatched installer integrity", async () => {
    const installer = Buffer.from("installer");
    await expectRejectedWith(parseZip([
      ["app/windows/installer.exe", installer],
      ["app/metadata.json", JSON.stringify({
        platform: "windows",
        versionName: "2.2.6",
        versionCode: 226,
        installerSha256: "bad-hash",
        installerSizeBytes: installer.length
      })]
    ], { type: "app", platform: "windows" }),
      "installerSha256 does not match computed installer hash"
    );
  });

  it("preserves Android APK parsing while adding platform-neutral artifact metadata", async () => {
    const apk = Buffer.from("android apk");
    const result = await parseZip([
      ["app/app.apk", apk],
      ["app/metadata.json", JSON.stringify({
        versionName: "1.0.0",
        versionCode: "100",
        releaseNotes: "Android release"
      })]
    ], { type: "app", platform: "android" });

    expect(result.version.app).to.include({
      platform: "android",
      versionName: "1.0.0",
      versionCode: 100,
      releaseNotes: "Android release",
      artifactKind: "android_apk",
      artifactPath: "app/app.apk",
      sha256: sha256(apk),
      sizeBytes: apk.length
    });
  });

  it("parses content-only all-platform bundles without app metadata", async () => {
    const content = Buffer.from("lesson");
    const result = await parseZip([
      ["content/manifest.json", JSON.stringify({
        version: "content-1",
        baseVersion: "content-0",
        files: [{ path: "lesson.txt", type: "text/plain" }]
      })],
      ["content/files/lesson.txt", content]
    ], { type: "content", platform: "all" });

    expect(result.version).to.not.have.property("app");
    expect(result.version.content).to.deep.equal({
      version: "content-1",
      baseVersion: "content-0"
    });
    expect(result.files).to.deep.include({
      path: "lesson.txt",
      sha256: sha256(content),
      size: content.length,
      type: "text/plain",
      encryption: undefined
    });
  });

  it("does not emit APK fields for content-only bundle responses", async () => {
    const response = await buildBundleResponse({
      _id: "bundle-1",
      type: "content",
      storage: { filePath: "bundle.zip" },
      sizeBytes: 10,
      sha256: "outer",
      version: { content: { version: "content-1", baseVersion: "content-0" } },
      files: [{ path: "lesson.txt" }]
    }, "license-1", "device-1");

    expect(response.metadata).to.not.have.property("apkSHA256");
    expect(response.metadata).to.not.have.property("apkSizeBytes");
    expect(response).to.include({ platform: "android" });
  });

  it("emits Windows installer metadata in bundle responses", async () => {
    const response = await buildBundleResponse({
      _id: "bundle-windows",
      type: "app",
      platform: "windows",
      storage: { filePath: "bundle.zip" },
      sizeBytes: 10,
      sha256: "outer",
      version: {
        app: {
          versionName: "2.2.6",
          versionCode: 226,
          artifactKind: "windows_installer",
          artifactPath: "app/windows/installer.exe",
          sha256: "installer-sha",
          sizeBytes: 123,
          installerPath: "app/windows/installer.exe",
          installerSha256: "installer-sha",
          installerSizeBytes: 123,
          silentArgs: ["/S"],
          relaunchArgs: []
        }
      }
    }, "license-1", "device-1");

    expect(response).to.include({ platform: "windows" });
    expect(response.metadata).to.include({
      artifactKind: "windows_installer",
      installerPath: "app/windows/installer.exe",
      installerSha256: "installer-sha",
      installerSizeBytes: 123
    });
    expect(response.metadata).to.not.have.property("apkSHA256");
  });

  it("filters pending app bundles by client platform and returns the latest applicable app", async () => {
    const rollouts = [
      { bundleId: "android-app", mandatory: true, platform: "android" },
      { bundleId: "windows-old", mandatory: true, platform: "windows" },
      { bundleId: "windows-new", mandatory: false, platform: "windows" },
      { bundleId: "content-all", mandatory: false, platform: "all" }
    ];
    const bundles = [
      { _id: "android-app", type: "app", platform: "android", version: { app: { versionCode: 9 } } },
      { _id: "windows-old", type: "app", platform: "windows", version: { app: { versionCode: 10 } } },
      { _id: "windows-new", type: "app", platform: "windows", version: { app: { versionCode: 12 } } },
      { _id: "content-all", type: "content", platform: "all", version: { content: { version: "content-2" } } }
    ];
    sinon.stub(Rollout, "find").returns({ lean: sinon.stub().resolves(rollouts) });
    sinon.stub(UpdateBundle, "find").returns({ lean: sinon.stub().resolves(bundles) });

    const pending = await resolvePendingBundles(
      "license-windows",
      { app_b: 8, content_v: "content-1" },
      "windows"
    );

    expect(pending.map(bundle => bundle._id)).to.deep.equal(["windows-new", "content-all"]);
    expect(pending[0]._mandatory).to.equal(false);
  });

  it("keeps legacy Android bundle defaults compatible with tablet clients", async () => {
    sinon.stub(Rollout, "find").returns({
      lean: sinon.stub().resolves([{ bundleId: "legacy-app", mandatory: true }])
    });
    sinon.stub(UpdateBundle, "find").returns({
      lean: sinon.stub().resolves([
        { _id: "legacy-app", type: "app", version: { app: { versionCode: 2 } } }
      ])
    });

    const pending = await resolvePendingBundles("license-tablet", { app_b: 1 }, "tablet");

    expect(pending.map(bundle => bundle._id)).to.deep.equal(["legacy-app"]);
    expect(pending[0]._mandatory).to.equal(true);
  });
});
