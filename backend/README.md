# AI Film Studio Backend

A high-performance backend for AI-powered film production featuring hierarchical content generation, async job processing, and real-time streaming capabilities.

## Features

- 🎬 **Hierarchical Content Generation**: Characters → Scenes → Frames → Videos
- 🤖 **AI-Powered Creation**: Gemini 2.5 Flash for images/text, fal.ai for videos
- 🏭 **Background Job Processing**: BullMQ + Redis for scalable task management
- 📡 **Director Agent**: Real-time streaming AI guidance
- 💾 **Blob Storage**: Local file management with URL serving
- 📚 **API Documentation**: Swagger UI integration
- 🧪 **Test Interface**: Built-in HTML testing tools

## Tech Stack

- **Runtime**: Bun
- **Server**: Fastify + CORS + Swagger
- **Queue**: BullMQ + Redis
- **Database**: Supabase (PostgreSQL)
- **Storage**: Local filesystem
- **AI**: Gemini 2.5 Flash, fal.ai, FFmpeg

## Quick Start

1. **Install Dependencies**:
   ```bash
   bun install
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Start Development Server**:
   ```bash
   bun run dev
   ```

4. **Access the Application**:
   - **Server**: http://localhost:5000
   - **API Docs**: http://localhost:5000/docs
   - **Test Interface**: http://localhost:5000/test/test.html

## Environment Variables

```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Redis
REDIS_URL=redis://localhost:6379

# AI Services
GEMINI_API_KEYS=key1,key2,key3  # Comma-separated for cycling
FAL_KEY=your_fal_ai_key

# Server
PORT=5000
NODE_ENV=development
```

## Project Structure

```
src/
├── ai/              # AI service integrations
│   ├── gemini.ts    # Gemini API with key cycling
│   ├── fal.ts       # fal.ai video generation
│   └── ffmpeg.ts    # Video processing
├── models/          # Zod schemas
├── routes/          # API endpoints
├── utils/           # Database, blob, queue utilities
├── workers/         # Background job processors
├── public/          # HTML test interfaces
└── index.ts         # Main server entry
```

## API Endpoints

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project

### Jobs
- `POST /api/jobs/character-generation` - Generate characters
- `POST /api/jobs/scene-generation` - Generate scenes
- `POST /api/jobs/video-generation` - Generate videos
- `POST /api/jobs/video-stitching` - Stitch videos
- `GET /api/jobs/:id/status` - Check job status
- `GET /api/queues/status` - Queue overview

### Director Agent
- `POST /api/director/stream` - AI guidance streaming
- `GET /api/director/pages` - Available page contexts

### Assets
- `GET /blob/:project/:type/:file` - Serve media files

## Workflow

1. **Create Project** → Set up basic project info
2. **Generate Characters** → AI creates character images & descriptions (requires confirmation)
3. **Generate Scenes** → Auto-creates scenes with plot details
4. **Generate Frames** → Auto-creates video prompts per scene
5. **Generate Videos** → Auto-creates videos from frames
6. **Stitch Final Video** → Combines all videos into final output

## Development

- **Hot Reload**: `bun run dev`
- **Build**: `bun run build`
- **Start**: `bun run start`

## Architecture Highlights

- **API Key Cycling**: Prevents rate limits with multiple Gemini keys
- **Hierarchical Jobs**: Auto-triggers dependent tasks
- **Streaming Director**: Real-time AI guidance with function calls
- **Context Inheritance**: Lower levels know about parent data
- **Confirmation System**: User approval for character generation
- **Error Recovery**: Automatic retry logic with exponential backoff
