# Backend Update Plan

Context:
- App repo: C:\work\digi-learn-app
- Backend repo: C:\work\lms-backend
- Dashboard repo exists but this task is backend-only.
- The parent already reviewed the app repo and found the Windows update contract:
  - Device calls GET /api/updates/check with query params: device_id, license_id, platform, app_v, app_b, content_v.
  - For Windows, platform is `windows` from lib/services/update_platform.dart.
  - App expects update bundle type `app` or `combined`.
  - Bundle ZIP contains `app/windows/installer.exe` preferred, fallback `app/installer.exe`, plus `app/metadata.json`.
  - Required metadata for Windows: { platform: "windows", versionName, versionCode, installerSha256, installerSizeBytes, silentArgs?, relaunchArgs?, releaseNotes? }.
  - App verifies outer ZIP size/hash from backend response and installer hash/size from bundle metadata or backend metadata.
  - App stages installer, persists pending_app_update, launches installer detached, exits, then confirms version/build after relaunch.
  - Events include download_started, download_completed, install_started, install_success, install_failed, update_done, withdrawn_stop, insufficient_storage, etc.
- Important app files for reference:
  - C:\work\digi-learn-app\lib\services\update_api_service.dart
  - C:\work\digi-learn-app\lib\services\app_updater.dart
  - C:\work\digi-learn-app\lib\services\app_installer.dart
  - C:\work\digi-learn-app\docs\WINDOWS_UPDATE_INSTALLATION.md

Backend current state found by parent:
- `C:\work\lms-backend\src\models\updateBundle.mongo.model.js`:
  - `type` enum app/content/combined.
  - `version.app` contains versionName, versionCode, releaseNotes, sha256, sizeBytes with comment saying primary app artifact app/app.apk.
  - No app platform, no installer fields.
- `C:\work\lms-backend\src\models\rollout.mongo.model.js`:
  - rollout targets licenses, mandatory, status, schedule. No platform field.
- `C:\work\lms-backend\src\controllers\updates.controller.js`:
  - checkForUpdates reads platform but passes only versions to resolvePendingBundles; platform is only stored on Device.
  - ingestEvents only updates Device.currentApp on install_success when payload has versionName/versionCode. App currently posts install_success without payload.
- `C:\work\lms-backend\src\services\updates.service.js`:
  - resolvePendingBundles ignores requested platform.
  - parseBundleZip only detects `app/app.apk` and `app/metadata.json`.
  - buildBundleResponse emits apkSHA256/apkSizeBytes for app metadata, even for content has suspicious apk fields under content branch.
  - No Windows installer parsing/validation.
- `C:\work\lms-backend\src\controllers\dashboard\updates.controller.js`:
  - initiateUpload only takes type/key.
  - finalizeBundle and uploadLocalBundle parse and persist metadata from parseBundleZip.
  - createRollout does not validate bundle platform vs target license platform.
  - listRollouts populates bundle fields and target license platform.
- `C:\work\lms-backend\src\models\device.mongo.model.js`:
  - platform enum includes android, windows, linux, ifp, tablet.
- `C:\work\lms-backend\src\models\license.mongo.model.js`:
  - license platform enum includes tablet, windows, linux, ifp.

## 1. Executive Summary

Backend support for Windows updates should extend the existing update-bundle system instead of creating a separate Windows path. The main work is to make bundles platform-aware, parse and validate Windows installer ZIPs, return Windows installer metadata in `/api/updates/check`, and prevent rollouts from targeting licenses whose platform cannot consume the bundle.

The finalized model is:

- Store bundle-level `platform`: `android`, `windows`, `linux`, plus content-only `all`.
- Keep `type`: `app`, `content`, `combined`.
- Preserve Android APK behavior for existing app bundles.
- Add Windows-specific app artifact fields under `version.app`.
- Normalize license `tablet` and `ifp` to app/device platform `android`.
- Filter rollouts by normalized request/license/bundle platform, while allowing content-only `all` bundles for every supported platform.
- Select the latest applicable app/combined app update per platform so clients do not install older active rollouts first.
- Update device state from bundle metadata when `install_success` lacks payload.
- Track `Device.lastUpdate` from existing event ingestion for dashboard/support visibility.
- Fix the local/proxy download URL so the generated fallback URL satisfies the download endpoint.

No dashboard UI implementation is required here, but dashboard/backend admin API changes will require the dashboard to send `platform` during bundle creation and display validation errors.

## 2. Current Backend Gaps

### `src\models\updateBundle.mongo.model.js`

Current schema supports generic app metadata only:

```js
version: {
  app: {
    versionName,
    versionCode,
    releaseNotes,
    sha256,
    sizeBytes
  }
}
```

Gaps:

- No bundle `platform`.
- `version.app.sha256` / `sizeBytes` are implicitly APK-specific.
- No Windows installer fields:
  - `installerSha256`
  - `installerSizeBytes`
  - `installerPath`
  - `silentArgs`
  - `relaunchArgs`
- Comment says primary app artifact is `app/app.apk`, which no longer holds for Windows.

### `src\models\rollout.mongo.model.js`

Gaps:

- Rollout targets licenses but has no platform field or platform snapshot.
- Nothing prevents a Windows bundle from being rolled out to Android-based `tablet`/`ifp` licenses or vice versa.

### `src\controllers\updates.controller.js`

Gaps:

- `checkForUpdates` reads `platform` but only stores it on `Device`.
- `resolvePendingBundles` receives only versions, so platform is ignored.
- `ingestEvents` only updates `Device.currentApp` if `install_success` includes version payload.
- The app currently posts `install_success` without payload, so Windows app state may never advance.

### `src\services\updates.service.js`

Gaps:

- `resolvePendingBundles` ignores platform.
- `parseBundleZip` only detects:
  - `app/app.apk`
  - `app/metadata.json`
  - content manifest/files
- No support for:
  - `app/windows/installer.exe`
  - fallback `app/installer.exe`
  - Windows metadata validation
- `buildBundleResponse` emits `apkSHA256` / `apkSizeBytes` for app metadata regardless of platform.
- Content branch writes suspicious `apkSHA256` / `apkSizeBytes` from `version.content`, although the content schema does not define these.

### `src\controllers\dashboard\updates.controller.js`

Gaps:

- `initiateUpload` accepts only `type` and `key`.
- `finalizeBundle` and `uploadLocalBundle` persist whatever `parseBundleZip` returns but do not validate platform.
- `createRollout` does not validate bundle platform against target license platforms.
- `listRollouts` populates target license platform, which is useful, but bundle platform is not selected because it does not exist yet.

### `src\models\device.mongo.model.js`

Current platform enum includes `android`, `windows`, `linux`, `ifp`, `tablet`.

Gap:

- Devices can report `android`, while licenses use `tablet` and `ifp` for Android-based devices.

### `src\models\license.mongo.model.js`

Current license platform enum includes `tablet`, `windows`, `linux`, `ifp`.

Gap:

- Backend needs an explicit normalization rule:
  - license `tablet` maps to app/device platform `android`
  - license `ifp` maps to app/device platform `android`
  - license `windows` maps to app/device platform `windows`
  - license `linux` maps to app/device platform `linux`

### `src\models\updateEvent.mongo.model.js`

Current enum includes common update events but lacks Windows-related events already emitted by the app:

- `withdrawn_stop`
- `insufficient_storage`

The final implementation should make event names permissive enough to store future client telemetry instead of rejecting unknown event names.

## 3. Proposed Data Model Changes

### `UpdateBundle`

Add bundle-level platform:

```js
platform: {
  type: String,
  enum: ["android", "windows", "linux", "all"],
  required: true,
  index: true
}
```

Rationale:

- The bundle artifact format is platform-specific.
- `all` is allowed only for content-only bundles that are safe to deliver to every supported platform.
- Rollout validation and device filtering need a single authoritative target platform.
- `type` alone cannot distinguish Android app ZIP from Windows app ZIP.
- `tablet` and `ifp` are not bundle platforms; both normalize to `android`.

For backward compatibility, existing bundles without `platform` should be treated as Android during migration or fallback reads.

Update `version.app` to support platform-specific artifact metadata:

```js
version: {
  app: {
    platform: { type: String, enum: ["android", "windows", "linux"] },
    versionName: { type: String },
    versionCode: { type: Number },
    releaseNotes: { type: String },

    // Generic primary app artifact integrity.
    artifactPath: { type: String },
    artifactKind: {
      type: String,
      enum: ["android_apk", "windows_installer"]
    },
    sha256: { type: String },
    sizeBytes: { type: Number },

    // Backward-compatible Android aliases if needed.
    apkSHA256: { type: String },
    apkSizeBytes: { type: Number },

    // Windows-specific metadata expected by the app.
    installerPath: { type: String },
    installerSha256: { type: String },
    installerSizeBytes: { type: Number },
    silentArgs: [{ type: String }],
    relaunchArgs: [{ type: String }]
  },
  content: {
    version: { type: String },
    baseVersion: { type: String }
  }
}
```

Recommended storage approach:

- Use `sha256` / `sizeBytes` as the canonical artifact integrity fields for any app artifact.
- Populate `apkSHA256` / `apkSizeBytes` only in API response for Android compatibility, not necessarily as stored fields.
- Populate `installerSha256` / `installerSizeBytes` for Windows because the app explicitly looks for these names.
- Store `artifactKind` and `artifactPath` to make future Linux support straightforward.

Example stored Windows bundle:

```json
{
  "type": "app",
  "platform": "windows",
  "version": {
    "app": {
      "platform": "windows",
      "versionName": "2.2.6",
      "versionCode": 226,
      "releaseNotes": "Optional release notes",
      "artifactKind": "windows_installer",
      "artifactPath": "app/windows/installer.exe",
      "sha256": "<installer sha256>",
      "sizeBytes": 12345678,
      "installerPath": "app/windows/installer.exe",
      "installerSha256": "<installer sha256>",
      "installerSizeBytes": 12345678,
      "silentArgs": ["/S"],
      "relaunchArgs": []
    }
  },
  "sizeBytes": 45678901,
  "sha256": "<outer zip sha256>"
}
```

### `Rollout`

Add rollout platform snapshot:

```js
platform: {
  type: String,
  enum: ["android", "windows", "linux", "all"],
  required: true,
  index: true
}
```

Set this from the bundle platform during rollout creation.

Rationale:

- Avoids repeated bundle lookups for coarse filtering.
- Preserves historical intent even if a bundle document is later edited.
- Makes rollout lists and metrics easier.
- Allows content-only `all` rollouts to remain explicit while app and combined bundles stay platform-specific.

Still treat `UpdateBundle.platform` as the source of truth and validate the two match.

### `UpdateEvent`

Make `event` a permissive indexed string instead of a strict enum:

```js
event: {
  type: String,
  required: true,
  trim: true,
  maxlength: 100,
  index: true
}
```

Rationale:

- The app can evolve faster than the backend.
- Rejecting unknown telemetry erases useful diagnostics from newer clients.
- Basic validation should still reject missing, non-string, or unreasonably long event names.

Known current events should still be covered in tests, including `withdrawn_stop` and `insufficient_storage`.

### `Device`

Add `lastUpdate` now, maintained by backend event ingestion without requiring app changes:

```js
lastUpdate: {
  bundleId: { type: mongoose.Schema.Types.ObjectId, ref: "UpdateBundle" },
  type: { type: String, enum: ["app", "content", "combined"] },
  platform: { type: String, enum: ["android", "windows", "linux", "all"] },
  status: { type: String },
  event: { type: String },
  updatedAt: { type: Date },
  errorCode: { type: String },
  errorMessage: { type: String }
}
```

Rationale:

- `UpdateEvent` remains the full audit trail.
- `Device.lastUpdate` gives dashboard/support a fast summary of the latest update state.
- The backend can derive this from existing event name, `bundleId`, payload, and timestamp.

## 4. API Contract Changes And Compatibility

### Device Check API

Current route remains:

```http
GET /api/updates/check?device_id=<id>&license_id=<licenseKey>&platform=<platform>&app_v=<version>&app_b=<build>&content_v=<content>
```

Required behavior:

- `platform=windows` returns only Windows-compatible bundles.
- `platform=android` returns only Android-compatible bundles.
- `platform=linux` returns only Linux-compatible bundles once Linux app bundles are supported.
- Content-only bundles with `platform: "all"` may be returned to any compatible client platform.
- License platform must be compatible with request platform:
  - license `tablet` accepts request `android`
  - license `ifp` accepts request `android`
  - license `windows` accepts request `windows`
  - license `linux` accepts request `linux`
  - future mappings should be explicit

Recommended validation:

- Reject missing `device_id`, `license_id`, `platform`.
- Reject unsupported platform with `400`.
- Reject platform/license mismatch with `403`.
  - This should surface provisioning/configuration errors clearly, for example a Windows device using an Android-based `tablet` or `ifp` license.

Expected Windows response shape:

```json
{
  "mandatory": true,
  "bundles": [
    {
      "id": "665f...",
      "type": "app",
      "platform": "windows",
      "metadata": {
        "platform": "windows",
        "versionName": "2.2.6",
        "versionCode": 226,
        "releaseNotes": "Optional release notes",
        "installerPath": "app/windows/installer.exe",
        "installerSha256": "<installer sha256>",
        "installerSizeBytes": 12345678,
        "silentArgs": ["/S"],
        "relaunchArgs": []
      },
      "sizeBytes": 45678901,
      "sha256": "<outer zip sha256>",
      "downloadUrl": "https://..."
    }
  ]
}
```

Keep `id`, `type`, `metadata`, `sizeBytes`, `sha256`, and `downloadUrl` unchanged because the app already parses these.

Expected Android response shape should remain compatible:

```json
{
  "mandatory": false,
  "bundles": [
    {
      "id": "665f...",
      "type": "app",
      "platform": "android",
      "metadata": {
        "platform": "android",
        "versionName": "2.2.6",
        "versionCode": 226,
        "releaseNotes": "Optional release notes",
        "apkSHA256": "<apk sha256>",
        "apkSizeBytes": 12345678
      },
      "sizeBytes": 45678901,
      "sha256": "<outer zip sha256>",
      "downloadUrl": "https://..."
    }
  ]
}
```

Compatibility notes:

- Adding top-level `platform` is safe; old clients ignore unknown fields.
- Existing Android clients should continue receiving `apkSHA256` and `apkSizeBytes`.
- Windows clients need `installerSha256` and `installerSizeBytes` in backend metadata and `app/metadata.json`; backend finalization should reject Windows ZIPs missing those metadata fields.

### Download URL Compatibility

Fix the existing local/proxy fallback URL while implementing this work.

Current `buildBundleResponse` can generate:

```http
/api/updates/download/:bundleId?token=...
```

But `proxyDownload` also checks `req.query.license_id`, so local/proxy downloads can fail with `403`.

Required behavior:

- Include `license_id` in the generated fallback URL, or remove the redundant query check and rely on the signed token.
- Prefer keeping the `license_id` query if the current endpoint contract expects it.
- Keep S3 presigned URL behavior unchanged.

### Admin Bundle Creation

Current:

```http
POST /api/admin/bundles
```

Current body:

```json
{
  "type": "app",
  "key": "bundles/example.zip"
}
```

Proposed body:

```json
{
  "type": "app",
  "platform": "windows",
  "key": "bundles/digilearn-windows-2.2.6.zip"
}
```

Validation:

- `type` must be `app`, `content`, or `combined`.
- `platform` values are `android`, `windows`, `linux`, or content-only `all`.
- If `platform` is omitted, default to `android` for backward compatibility with the current dashboard/API.
- `app` and `combined` bundles must resolve to `android`, `windows`, or `linux`; they must not use `all`.
- `content` bundles may use `android`, `windows`, `linux`, or `all`.
- `tablet` and `ifp` must not be accepted as bundle platforms; both are license labels that normalize to `android`.

Response:

```json
{
  "id": "665f...",
  "platform": "windows",
  "upload": {
    "url": "...",
    "method": "PUT"
  }
}
```

### Admin Bundle Finalization

Current:

```http
POST /api/admin/bundles/:id/finalize
```

Proposed behavior:

- Parse the uploaded ZIP.
- Validate parsed app metadata platform against `UpdateBundle.platform`.
- Persist parsed app/content metadata.
- Return platform and parsed artifact details.

Response example:

```json
{
  "id": "665f...",
  "type": "app",
  "platform": "windows",
  "sizeBytes": 45678901,
  "sha256": "<outer zip sha256>",
  "version": {
    "app": {
      "platform": "windows",
      "versionName": "2.2.6",
      "versionCode": 226,
      "artifactKind": "windows_installer",
      "artifactPath": "app/windows/installer.exe",
      "installerSha256": "<installer sha256>",
      "installerSizeBytes": 12345678,
      "silentArgs": ["/S"],
      "releaseNotes": "Optional release notes"
    }
  },
  "filesCount": 0
}
```

Failure examples:

- `400 Windows app bundle requires app/metadata.json`
- `400 Windows app bundle requires app/windows/installer.exe or app/installer.exe`
- `400 Metadata platform windows does not match bundle platform android`
- `400 Windows metadata requires installerSha256`
- `400 Windows metadata requires installerSizeBytes`
- `400 installerSha256 does not match computed installer hash`
- `400 installerSizeBytes does not match computed installer size`

### Admin Rollout Creation

Current:

```http
POST /api/admin/rollouts
```

Current body:

```json
{
  "bundleId": "665f...",
  "targetLicenses": ["..."],
  "mandatory": true,
  "schedule": {
    "startAt": "...",
    "expiresAt": "..."
  }
}
```

Proposed body can remain the same. Backend derives `platform` from the bundle.

Response:

```json
{
  "id": "777f...",
  "platform": "windows"
}
```

If the dashboard wants early UX validation, it can send `platform`, but backend must not trust it over the bundle.

## 5. Windows ZIP Parsing And Validation Plan

Update `parseBundleZip` in `src\services\updates.service.js` to support platform-aware parsing.

Recommended signature:

```js
parseBundleZip(storageOrPath, options)
```

Where options include:

```js
{
  type: "app" | "content" | "combined",
  platform: "android" | "windows" | "linux" | "all"
}
```

If keeping the current signature initially, `finalizeBundle` can load bundle type/platform and pass them in.

`platform: "all"` is valid only when `type === "content"`.

### Shared Parsing Responsibilities

For every ZIP:

- Compute outer ZIP `sha256`.
- Capture outer ZIP `sizeBytes`.
- Parse `app/metadata.json` if present.
- Parse `content/manifest.json` if present.
- Hash known app artifact entries.
- Hash content files under `content/files/`.

### Android App ZIP

Preserve current behavior:

- Detect `app/app.apk`.
- Hash APK.
- Parse `app/metadata.json`.
- Persist:
  - `version.app.platform = "android"`
  - `version.app.artifactKind = "android_apk"`
  - `version.app.artifactPath = "app/app.apk"`
  - `version.app.sha256 = computed apk hash`
  - `version.app.sizeBytes = computed apk size`
  - `version.app.versionName`
  - `version.app.versionCode`
  - `version.app.releaseNotes`

Response builder should still emit:

```json
{
  "apkSHA256": "<computed apk hash>",
  "apkSizeBytes": 123
}
```

### Windows App ZIP

Accepted installer paths:

1. `app/windows/installer.exe`
2. `app/installer.exe`

Reject the ZIP if both paths are present. Duplicate installer locations make the release artifact ambiguous, and release tooling should produce exactly one installer.

Parse `app/metadata.json`.

Required metadata:

```json
{
  "platform": "windows",
  "versionName": "2.2.6",
  "versionCode": 226,
  "installerSha256": "<sha256>",
  "installerSizeBytes": 12345678
}
```

Optional metadata:

```json
{
  "silentArgs": ["/S"],
  "relaunchArgs": [],
  "releaseNotes": "..."
}
```

Validation rules:

- For `type=app` or `type=combined` and `platform=windows`:
  - require installer file.
  - require `app/metadata.json`.
  - require `metadata.platform === "windows"`.
  - require valid non-empty `versionName`.
  - require numeric positive `versionCode`.
  - require `installerSha256` in metadata.
  - require `installerSizeBytes` in metadata.
  - compute installer hash and size.
  - require `installerSha256` to equal computed hash.
  - require `installerSizeBytes` to equal computed size.
  - persist computed hash/size after validation.
- Validate `silentArgs` and `relaunchArgs` are arrays of strings if present.
- Do not accept path traversal entries or absolute paths if adding stricter ZIP safety.

Persist:

```json
{
  "platform": "windows",
  "versionName": "2.2.6",
  "versionCode": 226,
  "releaseNotes": "...",
  "artifactKind": "windows_installer",
  "artifactPath": "app/windows/installer.exe",
  "sha256": "<computed installer hash>",
  "sizeBytes": 12345678,
  "installerPath": "app/windows/installer.exe",
  "installerSha256": "<computed installer hash>",
  "installerSizeBytes": 12345678,
  "silentArgs": ["/S"],
  "relaunchArgs": []
}
```

### Combined Bundles

For `combined`:

- Apply app validation if app artifact exists or app metadata exists.
- Apply content manifest/file parsing as today.
- Require bundle platform to match app platform when an app artifact exists.
- Reject `platform: "all"` for combined bundles because the app artifact is platform-specific.

### Content Bundles

For `content`:

- Allow `platform` to be `android`, `windows`, `linux`, or `all`.
- `all` means the content package is safe for every supported client platform.
- Platform-specific content remains available when future content formats diverge.
- Content parsing should continue to use `content/manifest.json` and `content/files/` as today.

## 6. Platform Targeting And Filtering Strategy

Introduce a helper in `src\services\updates.service.js` or a new shared utility:

```js
normalizeClientPlatform(platform)
normalizeLicensePlatform(platform)
arePlatformsCompatible(licensePlatform, clientPlatform)
```

Rules:

| Source | Value | Normalized app/device platform |
|---|---:|---|
| License | `tablet` | `android` |
| License | `ifp` | `android` |
| License | `windows` | `windows` |
| License | `linux` | `linux` |
| Device request | `android` | `android` |
| Device request | `windows` | `windows` |
| Device request | `linux` | `linux` |
| Bundle content target | `all` | matches any normalized client platform |

Explicitly avoid treating `tablet` or `ifp` as client platforms for current app checks unless older clients send them. If they do, normalize both to `android` defensively.

### `checkForUpdates`

Change call from:

```js
resolvePendingBundles(license._id, { app_v, app_b, content_v })
```

To conceptually:

```js
resolvePendingBundles(license._id, {
  platform,
  app_v,
  app_b,
  content_v
})
```

Before resolving:

- Normalize request platform.
- Normalize license platform.
- Verify compatibility.
- Store normalized device platform on `Device`.

### `resolvePendingBundles`

Filtering order:

1. Find active rollouts for license and schedule.
2. Filter rollouts by `rollout.platform` if available:
   - exact match with normalized client platform.
   - `all` only for content-only rollouts.
3. Load bundles.
4. Filter bundles by `bundle.platform`:
   - exact match with normalized client platform for app/combined bundles.
   - exact match or `all` for content bundles.
5. Filter by version:
   - app/combined: compare `app_b` with `version.app.versionCode`.
   - content/combined: compare `content_v` with `version.content.version`.
6. If multiple applicable app/combined app updates target the same license/platform, select the highest `version.app.versionCode`.
7. Return applicable bundles with mandatory flag.

For legacy bundles with no `platform`, treat as `android` until migration is complete.

## 7. Rollout Creation Validation Strategy

Update `createRollout` in `src\controllers\dashboard\updates.controller.js`.

Validation flow:

1. Validate payload shape.
2. Load bundle by `bundleId`.
3. Reject if bundle not found.
4. Reject if bundle is not finalized:
   - no `finalizedAt`
   - no `sha256`
   - no `sizeBytes`
   - missing app metadata for app/combined
5. Determine `bundlePlatform`.
6. Load target licenses.
7. Reject if any requested license id does not exist.
8. Normalize license platforms.
9. Reject if any license platform is incompatible with bundle platform.
   - For `platform: "all"`, only allow content-only bundles and allow all supported license platforms.
   - For `platform: "android"`, allow licenses whose platform normalizes to Android, including `tablet` and `ifp`.

Example mismatch response:

```json
{
  "message": "Rollout target platform mismatch",
  "bundlePlatform": "windows",
  "invalidTargets": [
    {
      "licenseId": "...",
      "licenseKey": "lic123",
      "licensePlatform": "tablet",
      "expectedClientPlatform": "android"
    }
  ]
}
```

10. Create rollout with platform snapshot:

```js
{
  bundleId,
  platform: bundlePlatform,
  targetLicenses,
  mandatory,
  status: "rolling_out",
  schedule
}
```

Additional schedule validation:

- `expiresAt` must be after `startAt` if both are present.
- Optional: reject rollout if target list is empty after deduplication.

## 8. Event Ingestion And Device State Update Plan

### Accept Future App-Emitted Events

Update `UpdateEvent` so event names are permissive:

```js
event: {
  type: String,
  required: true,
  trim: true,
  maxlength: 100,
  index: true
}
```

Known current event names to test include:

- `download_started`
- `download_completed`
- `install_started`
- `install_success`
- `install_failed`
- `update_done`
- `withdrawn_stop`
- `insufficient_storage`
- existing content events such as `content_applied`

Do not reject future non-empty string event names only because they are not yet known to the backend.

### Update `Device.currentApp` When `install_success` Lacks Payload

Current behavior only uses payload. Add fallback:

For each `install_success` event:

1. If payload has `versionName` or `versionCode`, use payload.
2. Else if `bundleId` is present:
   - load `UpdateBundle`.
   - if bundle has `version.app.versionName` / `versionCode`, update device from bundle metadata.
3. Else do not update app version; keep event for diagnostics.

Pseudo-flow:

```js
if (event === "install_success") {
  const appVersion = payloadVersion ?? bundle.version.app;
  if (appVersion) {
    Device.updateOne(... currentApp ...)
  }
}
```

For combined bundles, this should still update `currentApp`.

### Track Pending/Last Update State

Add `Device.lastUpdate` now:

Add fields to `Device`:

```js
lastUpdate: {
  bundleId,
  type,
  platform,
  status,
  event,
  updatedAt,
  errorCode,
  errorMessage
}
```

This is required for the backend update work so dashboard/support can diagnose Windows installer failures without scanning the full event stream.

Backend behavior:

- Continue storing all `UpdateEvent` rows.
- Update `Device.currentApp` on `install_success`.
- Update `Device.currentContentVersion` on `content_applied`.
- Update `Device.lastUpdate` for every accepted event using:
  - `bundleId` from the event if present.
  - bundle `type` and `platform` when `bundleId` resolves.
  - event name as both `event` and baseline `status`.
  - `payload.errorCode` and `payload.errorMessage` when present.
  - event timestamp or server receive time.

### Event Security

When processing events:

- Use authenticated license from middleware.
- Use `x-device-id`.
- Verify event `bundleId`, if present, belongs to a rollout targeting the authenticated license or at least references an existing bundle.
- Do not let event payload override license/device identity.

## 9. Migration And Backward Compatibility Plan

### Existing Bundles

Existing app bundles do not have `platform`.

Migration:

- Set `platform: "android"` for existing bundles where:
  - `type` is `app` or `combined`
  - `version.app.sha256` exists
  - artifact was historically `app/app.apk`
- Set `version.app.platform: "android"`.
- Set `version.app.artifactKind: "android_apk"`.
- Set `version.app.artifactPath: "app/app.apk"`.
- Leave `sha256` / `sizeBytes` unchanged.

For content bundles:

- If content is known to be cross-platform, set `platform: "all"`.
- If content is platform-specific, set `platform` to `android`, `windows`, or `linux`.
- For existing content bundles with missing platform and no explicit cross-platform marker, default to `android` for backward compatibility.
- There are no existing Windows/Linux/IFP update bundles, so the default migration path is Android-safe.

### Existing Rollouts

Migration:

- Populate `rollout.platform` from the linked bundle platform.
- If bundle platform missing, default to `android`.
- Do not alter rollout status.

### Read-Time Compatibility

Until migration is complete:

- Treat missing `bundle.platform` as `android`.
- Treat missing `rollout.platform` as linked bundle platform.
- Treat `tablet` and `ifp` license platforms as normalized client platform `android`.
- Keep emitting Android `apkSHA256` and `apkSizeBytes`.

### API Compatibility

Safe additions:

- top-level `platform` in bundle response.
- extra metadata fields.

Avoid breaking changes:

- Do not rename `metadata.apkSHA256` or `metadata.apkSizeBytes` for Android.
- Do not remove current `/api/admin/bundles` behavior immediately; if `platform` is omitted, allow default `android` temporarily with a warning/log.
- Fix generated local/proxy download URLs so they include the query parameters required by `proxyDownload`.

Recommended deprecation:

- Compatibility step 1: allow missing `platform` and default to `android`.
- Compatibility step 2: require `platform` for all new bundles after dashboard update ships.

## 10. Testing Plan

### Unit Tests: Platform Normalization

Test cases:

- license `tablet` + request `android` => compatible.
- license `ifp` + request `android` => compatible.
- license `windows` + request `windows` => compatible.
- license `tablet` + request `windows` => incompatible.
- license `ifp` + request `windows` => incompatible.
- license `windows` + request `android` => incompatible.
- request `tablet` normalizes to `android` defensively.
- request `ifp` normalizes to `android` defensively.
- content bundle `platform: "all"` is compatible with `android`, `windows`, and `linux`.

### Unit Tests: Windows ZIP Parsing

Create fixture ZIPs.

Valid cases:

- Windows app ZIP with `app/windows/installer.exe` and valid metadata.
- Windows app ZIP with fallback `app/installer.exe`.
- Windows combined ZIP with installer plus content manifest/files.
- Metadata optional fields:
  - no `silentArgs` should still parse, backend may return empty or omit.
  - `relaunchArgs` array persists.

Invalid cases:

- Missing `app/metadata.json`.
- Missing installer.
- `metadata.platform` is `android` for Windows bundle.
- `installerSha256` mismatch.
- `installerSizeBytes` mismatch.
- non-numeric `versionCode`.
- `silentArgs` is a string instead of array.
- both preferred and fallback installer present:
  - finalization rejects the duplicate installer paths.
- missing `installerSha256`.
- missing `installerSizeBytes`.

### Unit Tests: Android Regression

- Android APK ZIP still parses `app/app.apk`.
- Android metadata still persists `versionName`, `versionCode`, `releaseNotes`.
- Response still includes `apkSHA256` and `apkSizeBytes`.
- Existing bundles without `platform` behave as Android.
- Android selection uses the highest applicable `versionCode` when multiple active app rollouts exist.

### Unit Tests: `buildBundleResponse`

Windows app bundle response includes:

- top-level `platform: "windows"`
- `metadata.platform`
- `metadata.installerSha256`
- `metadata.installerSizeBytes`
- `metadata.versionName`
- `metadata.versionCode`
- outer `sha256`
- outer `sizeBytes`

Android app bundle response includes existing APK fields.

Content response does not emit misleading APK fields.

Content `platform: "all"` response can be returned to Android, Windows, or Linux clients when the content version is applicable.

Local/proxy fallback `downloadUrl` includes the required `license_id` query parameter or otherwise satisfies `proxyDownload`.

### Integration Tests: `/api/updates/check`

Cases:

- Windows device/license receives Windows app bundle.
- Windows device does not receive Android/tablet bundle.
- Android device/tablet license receives Android bundle.
- Android device/IFP license receives Android bundle.
- Android device does not receive Windows bundle.
- Content-only `platform: "all"` rollout can be returned to Windows and Android clients.
- Current `app_b` equal to target `versionCode` returns no app bundle.
- Lower `app_b` returns app bundle.
- Multiple active Android app rollouts return only the highest applicable `versionCode`.
- Multiple active Windows app rollouts return only the highest applicable `versionCode`.
- Combined bundle returns when either app or content is outdated.
- Expired rollout returns no bundles.
- Paused/withdrawn rollout returns no bundles.
- Mandatory rollout sets top-level `mandatory: true`.

### Integration Tests: Admin Bundle APIs

Cases:

- `POST /api/admin/bundles` accepts `type=app`, `platform=windows`.
- `POST /api/admin/bundles` defaults missing `platform` to `android`.
- `POST /api/admin/bundles` accepts `type=content`, `platform=all`.
- `POST /api/admin/bundles` rejects `type=app`, `platform=all`.
- `POST /api/admin/bundles` rejects `type=combined`, `platform=all`.
- `finalize` rejects platform mismatch.
- local upload path parses and persists Windows metadata.
- S3/presigned finalize path parses and persists Windows metadata.
- finalized response includes platform and parsed metadata.

### Integration Tests: Rollout Creation

Cases:

- Windows bundle + Windows licenses succeeds.
- Windows bundle + tablet licenses fails.
- Android bundle + tablet licenses succeeds.
- Android bundle + IFP licenses succeeds.
- Android bundle + Windows licenses fails.
- Content-only `all` bundle + mixed Android/Windows/Linux licenses succeeds.
- Mixed target licenses fail with detailed invalid targets.
- Missing or unfinalized bundle fails.

### Integration Tests: Event Ingestion

Cases:

- `install_success` with payload updates `Device.currentApp`.
- `install_success` without payload but with `bundleId` updates from bundle metadata.
- `install_success` for combined bundle updates app version.
- `content_applied` still updates `currentContentVersion`.
- `withdrawn_stop` and `insufficient_storage` are accepted.
- Unknown non-empty string event names are accepted and stored.
- Every accepted event updates `Device.lastUpdate`.

## 11. Implementation Sequence

Implement this work in phases. Each phase should be small enough to review independently, with tests/lints run before moving to the next phase. Do not mix later behavioral changes into earlier schema/parser phases unless a test requires a minimal stub.

### Phase 0: Baseline And Test Harness

Boundary:

- Read-only verification plus test scaffolding only.
- Do not change production behavior in this phase.

Changes:

- Confirm current test command and any existing update-related test gaps.
- Add or prepare focused fixtures/helpers needed for update bundle tests.
- Capture current Android behavior for parser/check response where practical.

Acceptance criteria:

- Existing test suite runs or known unrelated failures are documented.
- Test fixture approach for ZIP bundles is clear.
- No production behavior changes are included.

Stop/review point:

- Continue only when the baseline is understood enough to detect regressions in later phases.

### Phase 1: Schema And Platform Foundation

Status: Closed.

Boundary:

- Schema fields and pure helper functions only.
- No ZIP parser behavior changes.
- No device check filtering changes.
- No rollout validation changes beyond model shape.

Changes:

- Add `platform` to `UpdateBundle`.
- Add `platform` to `Rollout`.
- Extend `version.app` fields.
- Add `Device.lastUpdate`.
- Add platform normalization helpers.
- Make `UpdateEvent.event` a permissive indexed string with basic validation.

Acceptance criteria:

- App starts with existing data.
- Existing Android bundle documents remain readable.
- Missing bundle/rollout `platform` can be interpreted as `android` at read time.
- `tablet` and `ifp` licenses normalize to `android`.
- Content-only `all` is represented in schema but rejected by helper validation for app/combined bundles.
- Unit tests pass for platform normalization and schema validation.

Stop/review point:

- Review schema compatibility before parser/admin/device behavior starts depending on these fields.

Closure notes:

- Implemented schema fields and platform helper foundation.
- Focused Phase 1 tests passed: `pnpm exec mocha --require @babel/register tests/setup.js "tests/utils/update-platform.utils.test.js"` (`10 passing`).
- Full `pnpm test` currently has unrelated legacy test harness failures in reports/auth tests; ignored for Phase 1 closure.

### Phase 2: ZIP Parser And Metadata Validation

Status: Closed.

Boundary:

- Only parsing/finalization metadata logic and parser unit tests.
- Do not change admin request contracts except for passing parser options where needed by tests.
- Do not change rollout or device check selection behavior.

Changes:

- Update `parseBundleZip` to accept expected `type` and `platform`.
- Add Windows installer detection.
- Add Windows metadata validation.
- Reject Windows ZIPs missing `installerSha256` or `installerSizeBytes`.
- Reject Windows ZIPs containing both supported installer paths.
- Preserve Android APK parsing.
- Preserve content parsing and allow content-only `platform: "all"`.
- Clean up content response metadata so content does not emit APK fields.

Acceptance criteria:

- Valid Windows ZIP parses successfully.
- Invalid Windows ZIPs fail with actionable errors.
- Duplicate Windows installer paths fail parsing/finalization.
- Existing Android ZIP fixtures still parse exactly as before from the client’s perspective.
- Content-only `all` ZIP metadata parses without requiring app metadata.

Stop/review point:

- Continue only after parser tests cover Windows valid/invalid cases and Android regression cases.

Closure notes:

- Implemented platform-aware ZIP parsing and Windows installer metadata validation.
- Focused Phase 2 tests passed: `pnpm exec mocha --require @babel/register tests/setup.js "tests/utils/update-platform.utils.test.js" "tests/services/updates.service.test.js"` (`17 passing`).
- End-to-end Windows update flow remains blocked on Phase 3+ admin API, rollout validation, and device check behavior.

### Phase 3: Admin Bundle APIs

Status: Closed.

Boundary:

- Bundle creation/upload/finalization APIs only.
- Do not implement rollout validation or device check filtering in this phase.

Changes:

- Update `initiateUpload` to accept/store `platform`.
- Default missing `platform` to `android` for dashboard compatibility.
- Reject `platform: "all"` for `app` and `combined`.
- Accept `platform: "all"` only for `content`.
- Update `finalizeBundle` and `uploadLocalBundle` to pass bundle type/platform into parser.
- Return platform and parsed app/content metadata.

Acceptance criteria:

- New Windows bundle can be created, uploaded, finalized, and inspected through API.
- New content `all` bundle can be created and finalized.
- Missing platform defaults to `android`.
- Invalid type/platform combinations return clear `400` responses.
- Dashboard can adapt by sending `platform`, but backend remains correct without trusting dashboard-only validation.

Stop/review point:

- Review admin API response shape before dashboard or rollout work depends on it.

Closure notes:

- Implemented admin bundle platform normalization, storage, response shape, and invalid type/platform validation.
- Finalization and local upload now parse bundles using the stored type/platform and return parsed app/content metadata with `platform`.
- Focused Phase 3 tests passed: `pnpm exec mocha --require @babel/register tests/setup.js "tests/utils/update-platform.utils.test.js" "tests/services/updates.service.test.js" "tests/controllers/dashboard/updates.controller.test.js"` (`23 passing`).

### Phase 4: Rollout Validation

Boundary:

- Admin rollout creation/listing only.
- Do not change device check resolution yet.

Changes:

- Update `createRollout` to load bundle and licenses.
- Validate finalized bundle.
- Validate platform compatibility.
- Store rollout platform snapshot.
- Include bundle `platform` in `listRollouts` populate selection.

Acceptance criteria:

- Platform mismatch rollouts are blocked.
- Valid Windows rollout can be created for Windows licenses.
- Valid Android rollout can be created for `tablet` and `ifp` licenses.
- Valid content-only `all` rollout can target mixed supported license platforms.
- Unfinalized or missing bundle rollout creation fails clearly.
- Existing rollout listing still works.

Stop/review point:

- Continue only when invalid rollout combinations cannot be created through backend APIs.

### Phase 5: Device Check Resolution And Download Compatibility

Boundary:

- `/api/updates/check`, `resolvePendingBundles`, `buildBundleResponse`, and download URL compatibility only.
- Do not change event ingestion behavior in this phase.

Changes:

- Validate request platform against license platform.
- Return `403` on license/platform mismatch.
- Store normalized device platform.
- Pass platform into `resolvePendingBundles`.
- Filter rollouts/bundles by platform.
- Allow content-only `all` bundles to match any normalized supported client platform.
- Select the highest applicable app `versionCode` when multiple active app/combined app rollouts exist, for Android and Windows.
- Add top-level `platform` to bundle response.
- Emit Windows installer metadata for Windows bundles.
- Fix local/proxy fallback download URL compatibility with `proxyDownload`.

Acceptance criteria:

- Windows app receives only Windows app/combined bundles.
- Android/tablet/IFP app receives only Android app/combined bundles.
- Content-only `all` bundles can be returned across supported platforms.
- Multiple active app rollouts return only the latest applicable app version.
- Response satisfies DigiLearn Windows contract.
- Local/proxy fallback download URL does not fail because of a missing `license_id`.

Stop/review point:

- Verify device check responses against Android and Windows app expectations before event state updates are added.

### Phase 6: Event Ingestion And Device State

Boundary:

- `/api/updates/events`, `UpdateEvent`, and `Device` state updates only.
- Do not change bundle selection or rollout validation in this phase.

Changes:

- Accept future non-empty string event names.
- Update `Device.currentApp` from payload or bundle metadata.
- Update `Device.currentContentVersion` on content events as today.
- Update `Device.lastUpdate` for every accepted event.

Acceptance criteria:

- `install_success` with payload updates device app version.
- `install_success` without payload but with `bundleId` updates device app version from bundle metadata.
- Windows failure events are stored for support.
- Unknown future event names are stored.
- `Device.lastUpdate` reflects the latest accepted update event.
- Existing content event behavior is unchanged.

Stop/review point:

- Continue only when event ingestion preserves telemetry and device state remains consistent for app and content updates.

### Phase 7: Migration And Indexes

Boundary:

- Data migration/backfill and index creation only.
- Do not introduce new application behavior beyond read-time compatibility already implemented.

Changes:

- Backfill existing bundles as Android.
- Backfill existing rollouts from bundle platform.
- Add indexes if needed:
  - `UpdateBundle.platform`
  - `Rollout.platform`
  - maybe compound `Rollout.status + platform + targetLicenses`

Acceptance criteria:

- Existing production Android/tablet updates continue working.
- Existing IFP licenses continue to receive Android-compatible updates.
- New Windows rollouts do not appear for Android devices.
- No existing rollout loses status or targets.
- Migration can be rerun safely or has a clearly documented one-time execution path.

Stop/review point:

- Review migration results against real/staging data before considering the backend rollout complete.

### Phase 8: End-To-End Verification

Boundary:

- Verification, bug fixes directly tied to failed tests, and documentation updates only.
- Do not add new scope.

Changes:

- Run full backend test suite.
- Run focused admin bundle, rollout, device check, download, and event ingestion tests.
- Manually verify one Android update flow and one Windows update flow if fixtures/environments are available.
- Confirm `Backend_Update_Plan.md` matches the implemented behavior.

Acceptance criteria:

- Full test suite passes or unrelated failures are documented.
- Android regression behavior is preserved.
- Windows bundle creation/finalization/check response works end to end.
- Content-only `all` behavior is covered.
- Final implementation matches this plan.

## 12. Risks And Remaining Constraints

- **Content platform model:** Final decision is flexible support for platform-specific content plus content-only `platform: "all"`. Risk remains that future content formats may diverge, so release tooling must choose `all` only for packages that are truly cross-platform.
- **Windows installer signing:** Backend can verify hash/size but probably should not verify Authenticode signatures unless running on Windows with signing tools available. Release tooling should own signing verification.
- **Unknown event names:** Final decision is to accept future non-empty event strings with basic validation. Risk shifts from dropped telemetry to needing dashboard/reporting filters for unfamiliar event names.
- **Version comparison:** Current app comparison uses numeric `versionCode`. Windows release tooling guarantees monotonically increasing build codes, so this remains the app update ordering source.
- **Multiple active rollouts:** Final decision is to select the highest applicable app `versionCode` per platform for both Android and Windows. Risk remains for content conflicts if multiple different content versions are active for the same license.
- **Rollback semantics:** Backend only observes events. Installer rollback remains app/installer-owned.
- **Dashboard dependency:** Dashboard should send bundle `platform`, show parsed Windows metadata, support content `all`, and surface rollout validation errors, but the backend should enforce correctness regardless of dashboard behavior.