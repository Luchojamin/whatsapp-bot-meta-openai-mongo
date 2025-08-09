# API Documentation

## Overview

This WhatsApp bot provides a comprehensive REST API for managing conversations, media, and bot operations. All endpoints return JSON responses and use standard HTTP status codes.

## Base URL

```
http://localhost:3008
```

## Authentication

Currently, the API doesn't require authentication for internal endpoints. For production use, consider implementing API key authentication.

## Endpoints

### 1. Health Check

**GET** `/`

Returns the bot status and available endpoints.

**Response:**
```html
<html>
    <head><title>WhatsApp Bot</title></head>
    <body>
        <h1>WhatsApp Bot is Running!</h1>
        <p>Server is active on port 3008</p>
        <h2>Available endpoints:</h2>
        <ul>
            <li><strong>POST</strong> /v1/messages - Send a message</li>
            <li><strong>POST</strong> /v1/register - Trigger registration flow</li>
            <li><strong>POST</strong> /v1/samples - Trigger samples flow</li>
            <li><strong>POST</strong> /v1/blacklist - Manage blacklist</li>
            <li><strong>GET</strong> /v1/media - Get media metadata</li>
            <li><strong>GET</strong> /v1/media?user=1234567890 - Get user's media</li>
            <li><strong>GET</strong> /v1/media?type=voice_note - Get voice notes</li>
            <li><strong>GET</strong> /v1/media?backup=true - Get media needing backup</li>
        </ul>
    </body>
</html>
```

### 2. Send Messages

**POST** `/v1/messages`

Send a message to a WhatsApp user programmatically.

**Request Body:**
```json
{
  "number": "1234567890",
  "message": "Hello from API!",
  "urlMedia": "https://example.com/image.jpg"  // Optional
}
```

**Response:**
```
sended
```

**Example:**
```bash
curl -X POST http://localhost:3008/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Hello from API!"
  }'
```

### 3. Trigger Registration Flow

**POST** `/v1/register`

Trigger the registration flow for a user.

**Request Body:**
```json
{
  "number": "1234567890",
  "name": "John Doe"
}
```

**Response:**
```
trigger
```

### 4. Trigger Samples Flow

**POST** `/v1/samples`

Trigger the samples flow for a user.

**Request Body:**
```json
{
  "number": "1234567890",
  "name": "John Doe"
}
```

**Response:**
```
trigger
```

### 5. Blacklist Management

**POST** `/v1/blacklist`

Add or remove users from the blacklist.

**Request Body:**
```json
{
  "number": "1234567890",
  "intent": "add"  // or "remove"
}
```

**Response:**
```json
{
  "status": "ok",
  "number": "1234567890",
  "intent": "add"
}
```

### 6. Media Management

#### Get All Media Metadata

**GET** `/v1/media`

Returns all media metadata (limited to 50 records).

**Response:**
```json
{
  "status": "ok",
  "count": 5,
  "media": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "mediaId": "abc123",
      "mimeType": "image/jpeg",
      "size": 1024000,
      "from": "1234567890",
      "messageId": "msg_123",
      "originalUrl": "https://graph.facebook.com/...",
      "type": "image",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "transcription": null,
      "thumbnailUrl": null,
      "metadata": {
        "width": 1920,
        "height": 1080,
        "duration": null,
        "language": null,
        "filename": "media-123.jpg"
      },
      "needsBackup": false,
      "backupStatus": "pending",
      "backupDate": null
    }
  ]
}
```

#### Get User's Media

**GET** `/v1/media?user=1234567890`

Returns all media from a specific user.

**Response:**
```json
{
  "status": "ok",
  "count": 3,
  "media": [
    // Array of media objects for the specified user
  ]
}
```

#### Get Media by Type

**GET** `/v1/media?type=voice_note`

Returns all media of a specific type.

**Available Types:**
- `image` - Images
- `video` - Videos
- `audio` - Voice notes
- `document` - Documents

**Response:**
```json
{
  "status": "ok",
  "count": 2,
  "media": [
    // Array of media objects of the specified type
  ]
}
```

#### Get Media Needing Backup

**GET** `/v1/media?backup=true`

Returns all media that needs to be backed up.

**Response:**
```json
{
  "status": "ok",
  "count": 1,
  "media": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "mediaId": "abc123",
      "type": "audio",
      "needsBackup": true,
      "backupStatus": "pending",
      "transcription": "Hello, this is a voice message",
      // ... other fields
    }
  ]
}
```

### 7. Webhook Endpoints

#### Webhook Verification

**GET** `/whatsapp/webhook`

Used by Meta to verify the webhook endpoint.

**Query Parameters:**
- `hub.mode` - Always "subscribe"
- `hub.verify_token` - Your verification token
- `hub.challenge` - Challenge string from Meta

**Response:**
```
challenge_string
```

#### Receive Messages

**POST** `/whatsapp/webhook`

Receives incoming WhatsApp messages from Meta.

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "123456789",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "1234567890",
              "phone_number_id": "123456789"
            },
            "contacts": [
              {
                "profile": {
                  "name": "John Doe"
                },
                "wa_id": "1234567890"
              }
            ],
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.ABC123",
                "timestamp": "1234567890",
                "text": {
                  "body": "Hello"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Response:**
```
OK
```

## Error Responses

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Invalid request parameters"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to get media metadata"
}
```

## Media Object Schema

### Media Reference Object

```json
{
  "_id": "ObjectId",
  "mediaId": "string",           // WhatsApp media ID
  "mimeType": "string",          // MIME type (e.g., "image/jpeg")
  "size": "number",              // File size in bytes
  "from": "string",              // Sender phone number
  "messageId": "string",         // WhatsApp message ID
  "originalUrl": "string",       // Temporary Meta URL
  "type": "string",              // image, video, audio, document
  "timestamp": "Date",           // When media was received
  "transcription": "string|null", // For voice notes
  "thumbnailUrl": "string|null",  // For images
  "metadata": {
    "width": "number|null",      // Image/video width
    "height": "number|null",     // Image/video height
    "duration": "number|null",   // Video/audio duration
    "language": "string|null",   // Detected language
    "filename": "string|null"    // Original filename
  },
  "needsBackup": "boolean",      // Whether media should be backed up
  "backupStatus": "string",      // pending, completed, failed
  "backupDate": "Date|null"      // When backup was completed
}
```

## Rate Limiting

Currently, there are no rate limits implemented. For production use, consider implementing rate limiting to prevent abuse.

## CORS

The API doesn't currently implement CORS headers. For web applications, you may need to add CORS support.

## Examples

### Send a Message with Media

```bash
curl -X POST http://localhost:3008/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "message": "Check out this image!",
    "urlMedia": "https://example.com/image.jpg"
  }'
```

### Get Voice Notes from a User

```bash
curl "http://localhost:3008/v1/media?user=1234567890&type=audio"
```

### Get Media Needing Backup

```bash
curl "http://localhost:3008/v1/media?backup=true"
```

### Add User to Blacklist

```bash
curl -X POST http://localhost:3008/v1/blacklist \
  -H "Content-Type: application/json" \
  -d '{
    "number": "1234567890",
    "intent": "add"
  }'
```

## Testing

You can test the API endpoints using tools like:
- cURL
- Postman
- Insomnia
- Any HTTP client

## Monitoring

Monitor the API by checking:
- Server logs for errors
- Response times
- Media processing status
- Backup job status

## Security Considerations

1. **Environment Variables**: Keep all sensitive data in environment variables
2. **Input Validation**: Validate all input parameters
3. **Error Handling**: Don't expose internal errors to clients
4. **Rate Limiting**: Implement rate limiting for production
5. **Authentication**: Add API key authentication for production use 