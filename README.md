# DG Backend API Documentation

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