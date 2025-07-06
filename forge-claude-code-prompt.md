# Forge - AI Team Management Webapp Implementation

## Project Overview

I need you to implement a single-user AI team management webapp called "Forge" that coordinates multiple AI agents through a central Producer AI. The system eliminates context switching between AI tools while maintaining complete visibility and control over operations, costs, and outputs.

## Current Directory Structure
```
forge/
├── doc/
│   ├── ai-team-vision-doc.md
│   ├── complete_interface_design.md
│   ├── ai_team_management_design_doc.md
│   ├── ai-team-webapp-rfc.md
│   ├── ai-team-webapp-tasks.md
│   └── ai-team-webapp-claude-prompt.md
```

**Important:** Please read ALL documents in the doc/ directory before starting implementation. They contain the complete technical specification, user interface design, and task breakdown.

## Implementation Priority: Core Loop First

Start with **TASK-001 through TASK-007** from the tasks document to establish the foundation:

1. **TASK-001:** Initialize project structure (monorepo with TypeScript)
2. **TASK-002:** Set up PostgreSQL database schema with Prisma
3. **TASK-003:** Implement Express server with WebSocket support
4. **TASK-004:** Create OperationManager service for AI operations
5. **TASK-005:** Implement ContextManager for project context
6. **TASK-006:** Create ToolExecutor for AI service integration
7. **TASK-007:** Build GitManager for version control safety

## Key Technical Requirements

### Technology Stack
- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma ORM
- **Frontend:** React 18, TypeScript, TailwindCSS, Zustand for state
- **Real-time:** WebSocket using 'ws' library
- **Git Integration:** simple-git library
- **AI Services:** OpenAI SDK, shell execution for Claude Code

### Critical Implementation Details

**Database Schema:** Use the complete schema from the RFC document - projects, agents, operations, context_items, context_rules, conversations, event_log, git_snapshots.

**Operation Manager:** Must implement budget reservation to prevent overspending. See RFC for complete implementation.

**Context Management:** Token counting with tiktoken, smart prioritization within limits. Critical for preventing context overflow.

**Git Safety:** Every agent operation creates snapshot commits. One-click rollback capability is essential.

**WebSocket Updates:** Stream all agent outputs in real-time to frontend. No polling.

### Environment Configuration
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/forge

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Local paths
PROJECTS_PATH=/mnt/c/users/pmead/personal/forge
CLAUDE_CODE_PATH=/usr/local/bin/claude-code

# Limits
MAX_CONTEXT_TOKENS=100000
DEFAULT_BUDGET_LIMIT=50.00
```

## Implementation Approach

**Phase 1: Foundation (TASK-001 to TASK-007)**
- Get basic Producer chat working with OpenAI
- Implement operation creation and approval workflow
- Add real-time WebSocket streaming
- Basic context management and Git integration

**Phase 2: Frontend (TASK-008 to TASK-015)**
- React app with Zustand store
- Producer conversation interface
- Live agent monitoring
- Context management UI

**Phase 3: Integration (TASK-016 to TASK-017)**
- Complete API endpoints
- Producer AI with work plan generation
- Tool routing logic

## Success Criteria for Phase 1

The core loop is working when:
1. Can send message to Producer and get work plan response
2. Can create and approve operations with budget checking
3. WebSocket streams operation updates to frontend
4. Git snapshots protect against agent file corruption
5. Context system prevents token limit errors

## Code Quality Requirements

- **TypeScript strict mode** for all packages
- **Comprehensive error handling** with graceful degradation
- **Event logging** for debugging (use event_log table)
- **Budget safety** - never allow operations to exceed limits
- **Git safety** - always snapshot before risky operations

## Key Design Patterns from RFC

**OperationManager:**
```typescript
class OperationManager {
  private budgetReserved = new Map<string, number>();
  
  async createOperation(params) {
    // Budget check with reservation
    // Create pending operation
    // Log event for debugging
  }
}
```

**Context Prioritization:**
```typescript
prioritizeContext(items: ContextItem[], maxTokens: number): ContextItem[] {
  // Sort by importance: explicit > recent > small
  // Include items within 80% of token limit
}
```

**WebSocket Streaming:**
```typescript
// Send real-time updates
ws.operationUpdate(operationId, { status: 'running' });
ws.agentOutput(agentId, outputChunk);
ws.costUpdate(projectId, totalCost);
```

## File Structure to Create
```
forge/
├── package.json (workspace root)
├── .env.example
├── .gitignore
├── README.md
├── backend/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── prisma/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── doc/ (already exists)
```

## Testing Requirements

Focus only on critical paths:
- Budget reservation prevents overspending
- Context prioritization respects token limits
- Operation state transitions work correctly
- WebSocket messages reach frontend

## Getting Started

1. **Read all documentation** in doc/ directory first
2. **Initialize the monorepo structure** (TASK-001)
3. **Set up the database** with Prisma (TASK-002)
4. **Create Express server** with WebSocket (TASK-003)
5. **Test the core loop** before proceeding

Remember: This is a productivity tool for a single user (me). Focus on making the core workflow fast and reliable rather than building for scale.

Start with TASK-001 and work through the foundation tasks sequentially. Each task has clear Definition of Done criteria in the tasks document.