# WhatsApp Bot with Meta, OpenAI, and MongoDB

This project is a TypeScript-based WhatsApp bot leveraging the BuilderBot framework, Meta (Facebook) WhatsApp API, OpenAI for AI-powered responses, and MongoDB for data storage.

## Features
- Automated WhatsApp conversations using BuilderBot
- Integration with Meta (Facebook) WhatsApp API
- AI responses powered by OpenAI
- MongoDB support for persistent storage
- TypeScript, ESLint, and Rollup for modern development

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- WhatsApp Business API credentials from Facebook Developer
- OpenAI API key
- MongoDB database (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env-example` to `.env` and fill in your credentials:
   ```bash
   cp .env-example .env
   # Edit .env with your values
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Start the bot:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run build` – Build the project with Rollup
- `npm start` – Run the compiled app
- `npm run dev` – Lint and run with nodemon (development)
- `npm run lint` – Lint the codebase

## Environment Variables
See `.env-example` for required variables:
- `JWT_TOKEN`, `NUMBER_ID`, `VERIFY_TOKEN`, `VERSION`, `PORT`, `OPENAI_API_KEY`, `MONGO_DB_URI`, `MONGO_DB_NAME`

## License
ISC

## Credits
- [BuilderBot](https://builderbot.vercel.app/)
- [OpenAI](https://openai.com/)
- [MongoDB](https://www.mongodb.com/)

---
Feel free to contribute or open issues!