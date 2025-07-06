# Forge - AI Team Management Webapp

A single-user AI team management webapp that coordinates multiple AI agents through a central Producer AI, eliminating context switching while maintaining complete visibility and control over operations, costs, and outputs.

## Features

- 🤖 **Producer AI Coordination** - Natural language interface to coordinate AI agent teams
- 💰 **Budget Control** - Real-time cost tracking with approval gates
- 🔄 **Real-time Monitoring** - Live streaming of agent operations via WebSocket
- 📚 **Smart Context Management** - Token-aware context prioritization
- 🔒 **Git Safety** - Automatic snapshots before risky operations
- 🛠️ **Multi-tool Support** - OpenAI API, Claude Code, and web chat integrations

## Project Structure

```
forge/
├── backend/          # Express.js server with TypeScript
├── frontend/         # React 18 with TypeScript and Tailwind
├── shared/           # Shared types and utilities
└── doc/              # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL 14+ (local or remote)
- Git

### Installation

1. **Clone and Install Dependencies**
   ```bash
   git clone <repository-url>
   cd forge
   npm install
   ```

2. **Environment Configuration**
   
   Create `.env` file in the backend directory:
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:password@localhost:5432/forge
   
   # Server
   PORT=3000
   NODE_ENV=development
   
   # AI Services (required)
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   
   # Auth (generate a secure token)
   AUTH_TOKEN=your-secure-token-here
   
   # Paths
   PROJECTS_PATH=/path/to/your/projects
   CLAUDE_CODE_PATH=/usr/local/bin/claude-code
   
   # Limits
   MAX_CONTEXT_TOKENS=100000
   DEFAULT_BUDGET_LIMIT=50.00
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb forge
   
   # Run migrations
   cd backend
   npx prisma migrate dev
   
   # Seed initial agents
   npx prisma db seed
   ```

4. **Frontend Configuration (optional)**
   
   Create `.env` file in the frontend directory:
   ```bash
   cd ../frontend
   echo "VITE_AUTH_TOKEN=your-secure-token-here" > .env
   ```

### Running the Application

**Development Mode:**
```bash
# From project root
npm run dev
```

This starts:
- Backend API server on http://localhost:3000
- Frontend dev server on http://localhost:5173

**Production Mode:**
```bash
# Build all packages
npm run build

# Start production server
npm start
```

## Basic Usage

### 1. Create a Project

1. Click "Create New Project" in the project dropdown
2. Set a name and budget limit
3. The system will initialize a Git repository for the project

### 2. Chat with Producer

Send a message to the Producer AI describing what you want to build:

```
"I need to implement user authentication with JWT tokens, 
including login, registration, and password reset endpoints"
```

### 3. Review Work Plan

The Producer will create a work plan with:
- Assigned agents (Lead Engineer, QA Specialist, etc.)
- Tool selection (Claude Code for implementation, OpenAI for reviews)
- Cost estimates
- Required context

### 4. Approve Operations

Review each operation and either:
- **Approve** - Start execution immediately
- **Modify** - Change task, context, or tool
- **Cancel** - Skip this operation

### 5. Monitor Progress

Watch agents work in real-time:
- Live terminal output for Claude Code
- Streaming responses from OpenAI
- Progress indicators and quality checks

### 6. Manage Context

Add relevant documents, code files, or specifications:
- Automatic token counting
- Smart prioritization within limits
- Usage tracking for optimization

## Core Workflows

### Complex Implementation Task
```
User: "Build a REST API for a todo app with authentication"
Producer: Creates multi-phase plan with Lead Engineer using Claude Code
User: Approves operations
System: Creates Git snapshot, executes with context, streams output
```

### Code Review
```
User: "Review the authentication implementation for security issues"
Producer: Assigns Security Specialist with OpenAI API
User: Approves quick review operation
System: Analyzes code and provides feedback
```

### Strategic Planning
```
User: "Design the architecture for a real-time chat system"
Producer: Suggests web chat handoff for complex discussion
User: Gets handoff document to paste in Claude.ai
System: Awaits response import
```

## Available Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run test` - Run test suites
- `npm run lint` - Check code style
- `npm run typecheck` - Verify TypeScript types

### Backend Scripts
- `npm run prisma:studio` - Open Prisma Studio for database inspection
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed initial data

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `GET /api/projects/:id/stats` - Get project statistics

### Producer
- `POST /api/producer/message` - Send message to Producer
- `GET /api/producer/project/:id/history` - Get conversation history
- `POST /api/producer/generate-plan` - Generate work plan from description

### Operations
- `POST /api/operations` - Create new operation
- `POST /api/operations/:id/approve` - Approve and execute operation
- `POST /api/operations/:id/cancel` - Cancel operation
- `GET /api/operations/pending` - Get pending approvals

### Context
- `GET /api/context/project/:id` - Get project context items
- `POST /api/context` - Add context item
- `PUT /api/context/:id` - Update context content
- `POST /api/context/rules` - Create context inclusion rule

### Git
- `POST /api/git/snapshot` - Create manual snapshot
- `GET /api/git/project/:id/snapshots` - List snapshots
- `POST /api/git/rollback/:snapshotId` - Rollback to snapshot

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Ensure database exists: `psql -l | grep forge`

### AI Service Errors
- Verify API keys are correct
- Check API rate limits and quotas
- Monitor costs in provider dashboards

### WebSocket Disconnections
- Check browser console for errors
- Verify backend is running
- Check for proxy/firewall issues

### Claude Code Integration
- Ensure claude-code is installed and in PATH
- Verify CLAUDE_CODE_PATH in .env
- Test manually: `claude-code --help`

## Cost Management

### Setting Budgets
- Set per-project budget limits
- Operations check budget before execution
- Real-time cost tracking in header

### Cost Estimates by Tool
- **Claude Code**: $2-5 per operation
- **OpenAI API**: $0.50-2 per operation  
- **Web Chat**: No API cost (manual work)

### Monitoring Costs
- Dashboard shows running total
- Activity feed tracks per-operation costs
- Database stores all cost history

## Security Considerations

- Single-user system with hardcoded auth token
- All operations require explicit approval
- Git snapshots prevent code corruption
- No sensitive data in context items
- API keys stored in environment variables

## License

Private project - All rights reserved