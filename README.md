# WhatsApp Bot with Meta API, OpenAI, and MongoDB

A sophisticated TypeScript-based WhatsApp bot leveraging the BuilderBot framework, Meta (Facebook) WhatsApp Business API, OpenAI for AI-powered responses, and MongoDB for efficient metadata storage.

## 🚀 Features

### Core Functionality
- **Automated WhatsApp conversations** using BuilderBot framework
- **Integration with Meta WhatsApp Business API** for reliable messaging
- **AI-powered responses** using OpenAI GPT-3.5-turbo
- **Voice note transcription** using OpenAI Whisper
- **MongoDB metadata storage** for efficient media management
- **Custom webhook endpoints** for flexible integration

### Media Handling
- **Metadata-only storage** - 90%+ storage savings
- **Automatic media classification** (images, videos, audio, documents)
- **Voice note transcription** with language detection
- **Backup priority system** for important media
- **RESTful API endpoints** for media management

### Conversation Flows
- **Multi-level menu system** with dynamic navigation
- **Context-aware responses** using conversation history
- **Error handling** and fallback mechanisms
- **Custom webhook path** (`/whatsapp/webhook`)

## 📋 Prerequisites

- Node.js (v18+ recommended)
- npm or pnpm
- MongoDB database (local or Atlas)
- WhatsApp Business API credentials from Facebook Developer
- OpenAI API key

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd base-ts-meta-memory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env-example .env
   # Edit .env with your credentials
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Start the bot:**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# WhatsApp Business API Configuration
JWT_TOKEN=your_whatsapp_business_api_token
NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=your_webhook_verify_token
VERSION=v22.0

# Server Configuration
PORT=3008

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# MongoDB Configuration
MONGO_DB_URI=mongodb://localhost:27017
MONGO_DB_NAME=whatsapp_bot_db
```

### WhatsApp Business API Setup

1. **Create a Facebook App** in [Facebook Developer Console](https://developers.facebook.com/)
2. **Add WhatsApp Business API** to your app
3. **Configure Webhook URL:** `https://your-domain.com/whatsapp/webhook`
4. **Set Verify Token** to match your `VERIFY_TOKEN` environment variable
5. **Subscribe to webhook events:** messages, message_deliveries, etc.

## 🏗️ Architecture

### Media Storage Strategy

The bot uses an efficient **metadata-only storage approach**:

```javascript
// MongoDB Collection: media_references
{
  _id: ObjectId,
  mediaId: "abc123",           // WhatsApp media ID
  mimeType: "image/jpeg",
  size: 1024000,
  from: "1234567890",
  messageId: "msg_123",
  originalUrl: "https://...",  // Temporary Meta URL
  type: "image",               // image, video, audio, document
  timestamp: Date,
  
  // Optional fields
  transcription: "Hello world", // For voice notes
  thumbnailUrl: "https://...",  // For images
  metadata: {
    width: 1920,
    height: 1080,
    duration: 30,
    language: "en",
    filename: "media-123.jpg"
  },
  
  // Backup management
  needsBackup: true,           // For important media
  backupStatus: "pending",     // pending, completed, failed
  backupDate: Date
}
```

### Backup Priority System

- 🔥 **Voice Notes** - Always backup (conversation history)
- 🔥 **Documents** - Always backup (business critical)
- ⚪ **Images/Videos** - Don't backup by default (configurable)

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Bot status and endpoint list |
| `POST` | `/v1/messages` | Send messages programmatically |
| `POST` | `/v1/register` | Trigger registration flow |
| `POST` | `/v1/samples` | Trigger samples flow |
| `POST` | `/v1/blacklist` | Manage blacklist |

### Media Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/media` | Get all media metadata |
| `GET` | `/v1/media?user=1234567890` | Get user's media |
| `GET` | `/v1/media?type=voice_note` | Get voice notes |
| `GET` | `/v1/media?backup=true` | Get media needing backup |

### Webhook Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/whatsapp/webhook` | Webhook verification |
| `POST` | `/whatsapp/webhook` | Receive WhatsApp messages |

## 🔄 Conversation Flows

### Main Menu Flow
```
Welcome → Main Menu → [R]eservar → [M]enu → [P]agar → [S]alir
```

### Sub-menu Flow
```
Menu → [1]PDF → [2]Image → [3]ChatGPT → [4]Menu4 → [5]Menu5 → [0]Back
```

### Voice Note Processing
```
Voice Note → Download → Convert → Transcribe → Store Metadata → Respond
```

## 🗄️ Database Collections

### `media_references`
Stores media metadata and references to WhatsApp media.

### `conversations`
Stores conversation history and flow states.

### `users`
Stores user information and session data.

## 🚀 Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── app.ts              # Main application file
├── chatGPT.js          # OpenAI integration
├── myWhisper.js        # Voice note processing
└── ...

mensajes/
├── menu.txt            # Menu options
├── menuPrincipal.txt   # Main menu
└── federicoGreet.txt   # Welcome message

tmp/                   # Temporary files (auto-cleanup)
```

## 🔧 Customization

### Adding New Flows

```typescript
const newFlow = addKeyword('trigger')
    .addAnswer('Response message')
    .addAction(async (ctx, { flowDynamic }) => {
        // Your custom logic here
        await flowDynamic('Dynamic response');
    });
```

### Media Processing

```typescript
// Custom media handler
const customMediaFlow = addKeyword(EVENTS.MEDIA)
    .addAnswer('Processing media...',
        null,
        async (ctx, { flowDynamic }) => {
            // Your custom media processing
            const mediaData = {
                mediaId: ctx.fileData?.id,
                type: 'custom',
                // ... other fields
            };
            
            await storeMediaMetadata(mediaData);
            await flowDynamic('Media processed!');
        }
    );
```

## 📊 Monitoring

### Logs
The bot provides comprehensive logging:
- Media processing status
- API call results
- Error tracking
- Performance metrics

### Health Check
Visit `http://localhost:3008/` to see:
- Server status
- Available endpoints
- Configuration summary

## 🔒 Security

### Environment Variables
- All sensitive data stored in environment variables
- No hardcoded credentials
- Secure token management

### Webhook Security
- Custom webhook path (`/whatsapp/webhook`)
- Token verification
- Request validation

## 🚀 Deployment

### Docker Deployment

```dockerfile
# Build the application
npm run build

# Run with Docker
docker build -t whatsapp-bot .
docker run -p 3008:3008 whatsapp-bot
```

### Environment Variables for Production

```env
# Production settings
NODE_ENV=production
PORT=3008
MONGO_DB_URI=mongodb://production-db:27017
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the [documentation](docs/)
2. Review existing [issues](../../issues)
3. Create a new issue with detailed information

## 🔄 Changelog

### v2.0.0 - Metadata-Only Storage
- ✅ Implemented metadata-only media storage
- ✅ Added custom webhook endpoints
- ✅ Enhanced voice note processing
- ✅ Added backup priority system
- ✅ Improved API endpoints

### v1.0.0 - Initial Release
- ✅ Basic WhatsApp bot functionality
- ✅ OpenAI integration
- ✅ MongoDB storage
- ✅ Voice note transcription