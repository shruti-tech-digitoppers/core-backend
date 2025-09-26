# DG Backend API Documentation

## Update Storage Configuration

Environment variables:

- `STORAGE_DRIVER` = `s3` | `local`
- `LOCAL_BUNDLES_DIR` = local path for stored ZIPs (when local)
- `S3_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `DOWNLOAD_TOKEN_SECRET` for short-lived download tokens

## New Routes Summary

- Device:
  - `GET /api/updates/check`
  - `POST /api/updates/events`
  - `GET /api/updates/download/:bundleId`
- Admin:
  - `POST /api/admin/bundles`
  - `POST /api/admin/bundles/:id/finalize`
  - `POST /api/admin/rollouts`
  - `PUT /api/admin/rollouts/:id`
  - `GET /api/admin/rollouts`
  - `GET /api/admin/metrics/updates`

## Upload Flows (S3 vs Local)

- When `STORAGE_DRIVER=s3`:
  - `POST /api/admin/bundles` returns `{ upload: { url } }` (pre-signed PUT). Client uploads ZIP to S3 directly.
- When `STORAGE_DRIVER=local`:
  - `POST /api/admin/bundles` returns `{ upload: { driver: "local" }, multipart: { url: "/api/admin/bundles/:id/upload", field: "file" } }`.
  - Client uploads ZIP via multipart to `/api/admin/bundles/:id/upload` with field name `file`.
- After upload (both modes), call `POST /api/admin/bundles/:id/finalize` to compute `sizeBytes` and `sha256` (and later: parse manifests).

## Signing and Required Headers

- All device requests must include headers:
  - `x-api-key`, `x-device-id`, `x-request-timestamp`, `x-request-signature`, `x-security-version`, `x-offline-token`.
- Signature scheme:
  - POST: HMAC over `{ requestData, timestamp, deviceFingerprint }` where `requestData` is the JSON body.
  - GET: Prefer POST for signed operations. If using GET (e.g., `/api/updates/check`), sign the canonicalized query string as `requestData` (sorted keys, no whitespace) OR migrate to POST for consistency.
- `x-request-timestamp` must be within ±5 minutes of server time.

## License Management APIs

### License Activation

#### Endpoint
`POST /api/license/activate`

#### Description
Activates a license key for a specific device and returns security parameters along with school details.

#### Request Body
```json
{
  "licenseKey": "string",  // Required: The license key to activate
  "deviceId": "string"     // Required: Unique identifier for the device
}
```

#### Response

##### Success Response (200 OK)
```json
{
  "message": "License activated",
  "data": {
    "school": {
      // School details object
    },
    "config": {},
    "securityParams": {
      "apiKey": "string",
      "deviceFingerprint": "string",
      "offlineToken": "string",
      "signingKey": "string"
    }
  }
}
```

##### Error Responses

###### 400 Bad Request
```json
{
  "message": "License is already registered to another device",
  "errorCode": "NOT_ACCEPTABLE"
}
```
OR
```json
{
  "message": "License is expired",
  "errorCode": "NOT_ACCEPTABLE"
}
```

###### 500 Internal Server Error
```json
{
  "message": "Error checking license status",
  "error": "error message",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```
OR
```json
{
  "message": "Error activating license",
  "error": "error message",
  "errorCode": "INTERNAL_SERVER_ERROR"
}
```

#### Notes
- The API checks if the license is active before activation
- If the license is already registered to another device, activation will fail
- If the license is expired, activation will fail
- The API generates and returns security parameters including:
  - Device fingerprint
  - Offline token
  - Signing key
  - API key
- The security parameters are encrypted and stored with the license
- The API also returns associated school details if the license is successfully activated 