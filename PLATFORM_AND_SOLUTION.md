# License platforms and solutions

DigiLearn licenses now carry a **platform** and an optional **solution**. The dashboard uses `License.solution` to split school reports into SmartShala (classroom) and ePathshala Lab (student devices). This service stores the fields and backfills unambiguous platforms. Report query APIs live in digi-dashboard.

Keep `src/constants/platforms.constants.js` in sync with `digi-dashboard/src/constants/platforms.constants.js`. Both apps share one database.

## Values

`LICENSE_PLATFORMS`: `tablet`, `android_laptop`, `windows`, `linux`, `ifp`.

`SOLUTIONS`: `smartshala`, `epathshala_lab`.

| Platform | Default solution | Why |
|----------|------------------|-----|
| `ifp` | `smartshala` | Classroom panel |
| `tablet`, `android_laptop` | `epathshala_lab` | Individual student devices |
| `windows`, `linux` | none (`null`) | Can be an OPS in SmartShala or a lab desktop. Assign on the dashboard. |

`defaultSolutionForPlatform` encodes that table.

## Schema

- `License.platform` uses `LICENSE_PLATFORMS`. `License.solution` is `smartshala`, `epathshala_lab`, or `null`. The dashboard writes `solution`; report sync does not.
- `School.platforms[]` is `{ platform, solution, licenseCount, licenseDays }`. It mirrors the dashboard school document so a save from this service does not drop the array.
- `Device.platform` includes `android_laptop` alongside `android`, `windows`, `linux`, `ifp`, and `tablet`.
- `AppUser` index `{ schoolId: 1, userId: 1 }`. Bulk sync upserts on `schoolId` + `projectId` + `userId`. The dashboard joins reports on `schoolId` + `userId` because `userId` is unique only inside a school.
- `Reports` index `{ 'metadata.schoolId': 1, userId: 1, timestamp: -1 }` for the dashboard's per-user list and learning-journey queries.

Create the reports index with a rolling or background build in production before those queries run against the full collection. The backfill script connects with `autoIndex: false` so running it does not build indexes as a side effect.

## Report attribution

`POST /api/reports/bulk` still accepts the client payload in `REPORTS_API.md`. `processReports` overwrites `metadata.licenseKey` (and org, school, project) from the authenticated license. Platform and solution are not fields on the report. The dashboard resolves them by looking up that license key.

`deviceInfo.type` and `deviceInfo.os` stay client-supplied. They are not the license platform.

## App updates

`android_laptop` is a license and device label, not a bundle platform. `normalizeLicensePlatform` and `normalizeClientPlatform` map `tablet`, `ifp`, and `android_laptop` to the Android app platform, so those licenses receive Android bundles. Bundle platforms remain `android`, `windows`, `linux`, and content-only `all`.

## Backfill

`src/migrations/backfill-solutions.js` sets `License.solution` and `School.platforms[].solution` only where the platform has a single default:

- `ifp` → `smartshala`
- `tablet` and `android_laptop` → `epathshala_lab`

Windows and Linux are left null. Reruns skip documents that already have a solution, including a manual choice.

```bash
# counts only
node src/migrations/backfill-solutions.js --dry-run

# write
node src/migrations/backfill-solutions.js
```

The script uses `MONGO_URI_PROD` when `NODE_ENV=production`, otherwise `MONGO_URI_DEV`.

## Tests

- `tests/migrations/backfill-solutions.test.js` — mapping, skip rules, dry run
- `tests/utils/update-platform.utils.test.js` — `android_laptop` normalizes to `android`
