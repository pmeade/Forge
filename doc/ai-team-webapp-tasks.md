# AI Team Management Webapp - Development Tasks

## Project Setup Phase

### TASK-001: Initialize Project Structure
**Agent**: Lead Engineer  
**Context**: Create a new Node.js/React project following the simplified RFC architecture. Use TypeScript for both frontend and backend. Set up the monorepo structure with shared types.

**Requirements**:
- Initialize npm workspace with `/backend`, `/frontend`, and `/shared` folders
- Configure TypeScript for all packages with appropriate tsconfig.json files
- Set up ESLint and Prettier with consistent rules
- Create `.env.example` with all required environment variables
- Set up git repository with appropriate `.gitignore`

**Definition of Done**:
- [ ] `npm install` works from root and installs all dependencies
- [ ] `npm run dev` starts both frontend and backend in development mode
- [ ] TypeScript compilation passes with no errors
- [ ] Can import types from `/shared` in both frontend and backend
- [ ] Environment variables are documented in `.env.example`

---

### TASK-002: Set Up Database Schema
**Agent**: Lead Engineer  
**Context**: Implement the PostgreSQL database schema from the RFC using Prisma ORM. The schema should support projects, agents, operations, context items, and event logging as specified.

**Requirements**:
- Install and configure Prisma with PostgreSQL
- Create schema.prisma with all tables from the RFC
- Set up database migrations
- Create seed script with initial agents (Lead Engineer, QA, Designer, Security)
- Add database connection error handling

**Definition of Done**:
- [ ] `npx prisma migrate dev` creates all tables successfully
- [ ] `npx prisma db seed` populates initial agents
- [ ] Prisma Client generates with full TypeScript types
- [ ] Can connect to database and query all tables
- [ ] Migration files are committed to git

---

## Core Backend Implementation

### TASK-003: Implement Express Server with WebSocket
**Agent**: Lead Engineer  
**Context**: Create the Express.js server with WebSocket support for real-time updates. This is the foundation for all API endpoints and real-time communication.

**Requirements**:
- Set up Express server with TypeScript
- Configure middleware (cors, body-parser, error handling)
- Implement WebSocket server using 'ws' library
- Create WebSocketManager class from RFC
- Add health check endpoint
- Implement basic auth middleware with hardcoded token

**Definition of Done**:
- [ ] Server starts on configured port
- [ ] WebSocket accepts connections at ws://localhost:3000
- [ ] Can send test message through WebSocket
- [ ] Health check returns 200 OK at GET /health
- [ ] Unauthorized requests return 401

---

### TASK-004: Create Operation Manager Service
**Agent**: Lead Engineer  
**Context**: Implement the OperationManager class that handles creating, executing, and tracking AI operations. This includes budget reservation and basic cost tracking.

**Requirements**:
- Implement OperationManager class with all methods from RFC
- Add in-memory budget reservation tracking
- Create operation lifecycle methods (create, approve, execute, complete, fail)
- Implement event logging for debugging
- Add cost estimation logic for each tool type

**Definition of Done**:
- [ ] Can create operation with budget check
- [ ] Budget reservation prevents overspending
- [ ] Operations transition through correct status states
- [ ] Failed operations log errors to event_log table
- [ ] Cost estimates are reasonable for each tool type

---

### TASK-005: Implement Context Manager
**Agent**: Lead Engineer  
**Context**: Build the context management system that gathers, prioritizes, and manages context for operations. This includes token counting and smart prioritization.

**Requirements**:
- Implement ContextManager class from RFC
- Add token counting using tiktoken library
- Create context prioritization algorithm
- Implement context rule evaluation
- Track context usage statistics

**Definition of Done**:
- [ ] Can add context items with automatic token counting
- [ ] Context prioritization stays within token limits
- [ ] Rules correctly filter context based on patterns
- [ ] Usage statistics update after each operation
- [ ] Large contexts are handled without blocking

---

### TASK-006: Create Tool Integration Service
**Agent**: Lead Engineer  
**Context**: Implement the tool execution service that integrates with OpenAI API, Anthropic API, and Claude Code via shell execution. Each tool should stream outputs via WebSocket.

**Requirements**:
- Implement ToolExecutor class with methods for each tool
- Add OpenAI streaming with token counting
- Create Claude Code shell execution wrapper
- Implement web chat handoff document generation
- Stream all outputs through WebSocket in real-time

**Definition of Done**:
- [ ] OpenAI API calls work with streaming response
- [ ] Claude Code executes via shell and captures output
- [ ] Web chat handoff generates formatted JSON document
- [ ] All tool outputs stream to frontend in real-time
- [ ] Costs are calculated accurately for each tool

---

### TASK-007: Build Git Integration Service
**Agent**: Lead Engineer  
**Context**: Create Git integration for automatic snapshots before operations and manual rollback capability. Use simple-git library.

**Requirements**:
- Implement GitManager class from RFC
- Create automatic snapshot before risky operations
- Add manual snapshot API endpoint
- Implement rollback to specific snapshot
- Handle Git errors gracefully (non-critical failures)

**Definition of Done**:
- [ ] Snapshots create commits with descriptive messages
- [ ] Can list all snapshots for a project
- [ ] Rollback successfully reverts to previous state
- [ ] Git failures don't break operations (just log)
- [ ] Commit hashes are stored in database

---

## Frontend Implementation

### TASK-008: Create React App Structure with Zustand
**Agent**: Lead Engineer  
**Context**: Set up the React application with TypeScript, Tailwind CSS, and a single Zustand store for state management as specified in the RFC.

**Requirements**:
- Initialize React 18 with TypeScript
- Configure Tailwind CSS with custom config
- Create unified Zustand store with all state slices
- Implement computed values (pendingApprovals, totalCostToday)
- Set up React Router for navigation

**Definition of Done**:
- [ ] React app runs with no console errors
- [ ] Tailwind styles apply correctly
- [ ] Zustand store provides global state access
- [ ] Computed values update reactively
- [ ] Can navigate between projects

---

### TASK-009: Build Main Layout Components
**Agent**: Lead Engineer  
**Context**: Create the main application layout including header, producer chat area, context panel, and monitoring sections as shown in the interface design.

**Requirements**:
- Create responsive layout matching the RFC design
- Implement Header with project switcher and cost display
- Build collapsible panels for different sections
- Add proper TypeScript interfaces for all props
- Ensure mobile-responsive design

**Definition of Done**:
- [ ] Layout matches the RFC wireframes
- [ ] All sections are visible and properly sized
- [ ] Project switcher shows active project
- [ ] Cost display updates in real-time
- [ ] Layout is responsive on tablet/mobile

---

### TASK-010: Implement Producer Chat Interface
**Agent**: Lead Engineer  
**Context**: Build the main Producer conversation interface where users interact with the Producer AI to coordinate work.

**Requirements**:
- Create chat message display with user/assistant roles
- Implement message input with keyboard shortcuts
- Add work plan display with approval buttons
- Create message history scrolling
- Add loading states during API calls

**Definition of Done**:
- [ ] Can send messages to Producer and see responses
- [ ] Enter key sends message, Shift+Enter adds newline
- [ ] Work plans display with clear approval options
- [ ] Chat history persists during session
- [ ] Loading indicators show during API calls

---

### TASK-011: Create WebSocket Connection Manager
**Agent**: Lead Engineer  
**Context**: Implement WebSocket client connection in React that receives real-time updates and syncs with Zustand store.

**Requirements**:
- Create WebSocket hook for connection management
- Handle reconnection on disconnect
- Parse incoming messages and update store
- Add connection status indicator
- Queue messages if disconnected

**Definition of Done**:
- [ ] WebSocket connects automatically on app start
- [ ] Reconnects with exponential backoff
- [ ] Updates arrive in real-time to UI
- [ ] Connection status shows in header
- [ ] No lost messages during brief disconnects

---

### TASK-012: Build Operation Approval Interface
**Agent**: Lead Engineer  
**Context**: Create the pending approvals panel that shows operations awaiting approval with cost estimates and quick action buttons.

**Requirements**:
- Display pending operations with all relevant info
- Implement individual and batch approval
- Add modify option that opens edit dialog
- Show cost estimates prominently
- Update immediately when operations are approved

**Definition of Done**:
- [ ] All pending operations display correctly
- [ ] Can approve individual operations
- [ ] "Approve All" works for batch approval
- [ ] Cost estimates are clear and accurate
- [ ] UI updates instantly after approval

---

### TASK-013: Implement Agent Monitoring Panel
**Agent**: Lead Engineer  
**Context**: Build the live agent monitoring section that shows real-time output from running operations and agent status.

**Requirements**:
- Create streaming output display for each agent
- Add progress indicators for running operations
- Implement pause/stop/intervene buttons
- Show agent performance metrics
- Add syntax highlighting for code output

**Definition of Done**:
- [ ] Live outputs stream character by character
- [ ] Can pause/resume operations
- [ ] Progress bars show estimated completion
- [ ] Code outputs have syntax highlighting
- [ ] Performance metrics display accurately

---

### TASK-014: Create Context Management UI
**Agent**: Lead Engineer  
**Context**: Build the context library interface for managing project context items, including adding, viewing, and setting rules.

**Requirements**:
- Display context items with metadata (size, usage, last used)
- Implement context item upload/creation
- Add search and filter functionality
- Create rule configuration interface
- Show token counts and limits

**Definition of Done**:
- [ ] Can add new context items via UI
- [ ] Search filters results in real-time
- [ ] Rules can be created with pattern matching
- [ ] Token counts show for all items
- [ ] Usage statistics update after operations

---

### TASK-015: Build Activity Feed Component
**Agent**: Lead Engineer  
**Context**: Create the recent activity feed that shows operation history, Git snapshots, and important events with action buttons.

**Requirements**:
- Display events in reverse chronological order
- Add event-specific action buttons
- Implement infinite scroll for history
- Show operation costs and durations
- Add filter by event type

**Definition of Done**:
- [ ] Recent events appear at the top
- [ ] Can filter by event type
- [ ] Infinite scroll loads older events
- [ ] Action buttons work (view, rollback, etc.)
- [ ] Costs and timing display accurately

---

## API Endpoints Implementation

### TASK-016: Implement Core API Routes
**Agent**: Lead Engineer  
**Context**: Create all REST API endpoints specified in the RFC for projects, operations, context, and Git operations.

**Requirements**:
- Implement all CRUD endpoints for projects
- Create operation lifecycle endpoints
- Add context management endpoints
- Build Git snapshot endpoints
- Add proper error handling and validation

**Definition of Done**:
- [ ] All endpoints return correct status codes
- [ ] Request validation prevents bad data
- [ ] Errors return consistent format
- [ ] Database errors are handled gracefully
- [ ] Can test all endpoints with curl/Postman

---

### TASK-017: Create Producer AI Integration
**Agent**: Lead Engineer  
**Context**: Implement the Producer AI endpoint that processes messages and returns work plans using OpenAI's API.

**Requirements**:
- Create Producer system prompt
- Implement message endpoint with conversation history
- Parse responses into structured work plans
- Add token usage tracking
- Handle API errors gracefully

**Definition of Done**:
- [ ] Producer responds intelligently to requests
- [ ] Work plans have clear structure
- [ ] Conversation history provides context
- [ ] Token usage is tracked for costs
- [ ] API errors return helpful messages

---

## Testing Implementation

### TASK-018: Create Critical Path Tests
**Agent**: QA Specialist  
**Context**: Write Jest tests for the most critical functionality: budget management, context prioritization, and operation lifecycle.

**Requirements**:
- Test budget reservation prevents overspending
- Test context prioritization with token limits
- Test operation state transitions
- Test WebSocket message handling
- Add setup/teardown for database

**Definition of Done**:
- [ ] All critical paths have test coverage
- [ ] Tests run with `npm test`
- [ ] Database is properly isolated for tests
- [ ] Tests complete in under 30 seconds
- [ ] No flaky tests

---

### TASK-019: Add Basic E2E Test
**Agent**: QA Specialist  
**Context**: Create one end-to-end test using Playwright that validates the core workflow: create project, send Producer message, approve operation, see result.

**Requirements**:
- Set up Playwright configuration
- Create test for main happy path
- Use test database
- Clean up after test run
- Add to CI pipeline

**Definition of Done**:
- [ ] E2E test runs with `npm run test:e2e`
- [ ] Test creates real project and operation
- [ ] WebSocket updates are verified
- [ ] Test is deterministic (no flakes)
- [ ] Cleanup removes all test data

---

## Documentation

### TASK-020: Create Setup and Usage Documentation
**Agent**: Lead Engineer  
**Context**: Write clear documentation for setting up the project locally and basic usage instructions.

**Requirements**:
- Create README.md with setup instructions
- Document all environment variables
- Add troubleshooting section
- Include example .env file
- Document basic workflows

**Definition of Done**:
- [ ] New user can set up project in < 10 minutes
- [ ] All env variables are documented
- [ ] Common errors have solutions
- [ ] Includes screenshots of main UI
- [ ] Workflow examples are clear

---

## Deployment

### TASK-021: Create Local Deployment Scripts
**Agent**: Lead Engineer  
**Context**: Create scripts for building and running the application in production mode locally.

**Requirements**:
- Create build scripts for frontend and backend
- Add production start script
- Include database migration in startup
- Create systemd service file (optional)
- Add backup script for database

**Definition of Done**:
- [ ] `npm run build` creates production builds
- [ ] `npm start` runs production server
- [ ] Migrations run automatically on start
- [ ] Can run as background service
- [ ] Database backup script works

---

## Bug Fixes and Polish

### TASK-022: Fix Critical Bugs
**Agent**: Lead Engineer  
**Context**: After initial testing, fix any critical bugs that prevent core functionality from working correctly.

**Requirements**:
- Fix any crashes or data loss bugs
- Resolve WebSocket disconnection issues
- Fix UI rendering problems
- Address performance bottlenecks
- Ensure data persistence works

**Definition of Done**:
- [ ] No crashes during normal use
- [ ] WebSocket stays connected reliably
- [ ] UI updates are smooth
- [ ] Operations complete in reasonable time
- [ ] No data loss on refresh

---

### TASK-023: Add Quality of Life Features
**Agent**: Lead Engineer  
**Context**: Implement small features that significantly improve the user experience based on initial usage.

**Requirements**:
- Add keyboard shortcuts for common actions
- Implement operation retry with modifications
- Add cost warning for expensive operations
- Create operation templates for common tasks
- Add dark mode toggle

**Definition of Done**:
- [ ] Keyboard shortcuts are documented
- [ ] Can retry failed operations easily
- [ ] Warnings appear for operations > $5
- [ ] Templates speed up common tasks
- [ ] Dark mode persists preference

---

## Notes for AI Agents

1. **Start Simple**: Implement the minimum viable feature first, then enhance
2. **Test Manually**: Since this is a single-user app, manual testing during development is fine
3. **Use the RFC**: The RFC document has detailed implementations for most features
4. **Ask for Clarification**: If requirements are unclear, ask before implementing
5. **Keep It Working**: Don't break existing functionality when adding features

## Task Dependencies

```
Project Setup: TASK-001 → TASK-002
Backend Core: TASK-003 → TASK-004 → TASK-005 → TASK-006 → TASK-007
Frontend Core: TASK-008 → TASK-009 → TASK-010 → TASK-011
Frontend Features: Core → TASK-012, TASK-013, TASK-014, TASK-015
API: Backend Core → TASK-016 → TASK-017
Testing: All Implementation → TASK-018, TASK-019
Documentation: All Implementation → TASK-020
Deployment: All Implementation → TASK-021
Polish: Initial Testing → TASK-022, TASK-023
```

## Success Criteria

The project is complete when:
1. Can create a project and have Producer coordinate work
2. Can approve operations and see real-time progress
3. Context management prevents token limit errors
4. Costs are tracked accurately
5. Can recover from any error state
6. The app is more efficient than using multiple AI tools separately