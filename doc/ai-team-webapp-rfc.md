# RFC: AI Team Management Webapp Technical Architecture (Simplified)

## Executive Summary

This RFC proposes a streamlined technical architecture for a single-user AI team management webapp that coordinates multiple AI agents through a central Producer AI. The system prioritizes developer productivity by eliminating context switching while maintaining simplicity appropriate for a personal tool.

## Design Philosophy

**Core Principle**: Build for one power user (you), not for scale. Optimize for:
- Fast iteration and debugging
- Minimal context switching
- Direct control over AI operations
- Simple recovery from failures
- Clear visibility into costs

**Non-goals**:
- Multi-user support
- Horizontal scaling
- Complex security models
- Enterprise features

## Simplified Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                    WebSocket for real-time                      │
├─────────────────────────────────────────────────────────────────┤
│                   API Server (Express.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                           │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend**: React 18 with TypeScript, TailwindCSS, single Zustand store
- **Backend**: Node.js with Express, TypeScript, ws for WebSocket
- **Database**: PostgreSQL with Prisma ORM (or SQLite for pure local)
- **AI Integration**: OpenAI SDK, Anthropic SDK, shell execution for Claude Code
- **Version Control**: simple-git for Git operations
- **Testing**: Jest for critical paths only

## Database Schema (Simplified)

```sql
-- Just the essentials
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    current_phase VARCHAR(100),
    budget_limit DECIMAL(10,2),
    budget_spent DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    capability VARCHAR(100) NOT NULL,
    base_prompt TEXT,
    success_rate INTEGER DEFAULT 100,
    total_operations INTEGER DEFAULT 0
);

CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    task TEXT NOT NULL,
    tool VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    cost_estimate DECIMAL(10,4),
    actual_cost DECIMAL(10,4),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE context_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    tokens INTEGER,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE context_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    pattern VARCHAR(255), -- e.g., "when task contains 'test'"
    action VARCHAR(50), -- auto_include, suggest, exclude
    context_item_id UUID REFERENCES context_items(id)
);

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    operation_id UUID REFERENCES operations(id),
    role VARCHAR(50),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100),
    operation_id UUID,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE git_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    commit_hash VARCHAR(40),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Core Implementation

### Unified State Management

```typescript
// Single store, no synchronization issues
interface AppState {
  // Project state
  activeProject: Project | null;
  projects: Project[];
  
  // Agent state
  agents: Map<string, Agent>;
  operations: Map<string, Operation>;
  
  // Context state
  contextItems: Map<string, ContextItem>;
  activeContextIds: Set<string>;
  
  // Conversation state
  producerMessages: Message[];
  agentOutputs: Map<string, string[]>;
  
  // Computed values
  pendingApprovals: () => Operation[];
  activeOperations: () => Operation[];
  totalCostToday: () => number;
}

const useStore = create<AppState>((set, get) => ({
  activeProject: null,
  projects: [],
  agents: new Map(),
  operations: new Map(),
  contextItems: new Map(),
  activeContextIds: new Set(),
  producerMessages: [],
  agentOutputs: new Map(),
  
  pendingApprovals: () => {
    return Array.from(get().operations.values())
      .filter(op => op.status === 'pending_approval');
  },
  
  activeOperations: () => {
    return Array.from(get().operations.values())
      .filter(op => op.status === 'running');
  },
  
  totalCostToday: () => {
    const today = new Date().toDateString();
    return Array.from(get().operations.values())
      .filter(op => new Date(op.created_at).toDateString() === today)
      .reduce((sum, op) => sum + (op.actual_cost || 0), 0);
  }
}));
```

### Simple Backend Services

```typescript
// Direct, no over-abstraction
class OperationManager {
  private budgetReserved = new Map<string, number>();
  
  async createOperation(params: {
    projectId: string;
    agentId: string;
    task: string;
    tool: string;
    contextIds: string[];
  }) {
    // Simple budget check
    const estimate = await this.estimateCost(params);
    const project = await db.project.findUnique({ where: { id: params.projectId } });
    
    const reserved = this.budgetReserved.get(params.projectId) || 0;
    if (project.budget_spent + reserved + estimate > project.budget_limit) {
      throw new Error(`Would exceed budget by $${
        (project.budget_spent + reserved + estimate - project.budget_limit).toFixed(2)
      }`);
    }
    
    // Reserve budget
    this.budgetReserved.set(params.projectId, reserved + estimate);
    
    // Create operation
    const operation = await db.operation.create({
      data: {
        project_id: params.projectId,
        agent_id: params.agentId,
        task: params.task,
        tool: params.tool,
        cost_estimate: estimate,
        status: 'pending_approval'
      }
    });
    
    // Log event for debugging
    await this.logEvent('operation.created', { operation, contextIds: params.contextIds });
    
    return operation;
  }
  
  async executeOperation(operationId: string) {
    const operation = await db.operation.findUnique({ 
      where: { id: operationId },
      include: { agent: true }
    });
    
    try {
      // Update status
      await db.operation.update({
        where: { id: operationId },
        data: { status: 'running', started_at: new Date() }
      });
      
      // Get context
      const context = await this.gatherContext(operation);
      
      // Execute based on tool
      let result;
      switch (operation.tool) {
        case 'claude_code':
          result = await this.executeClaudeCode(operation, context);
          break;
        case 'openai_api':
          result = await this.executeOpenAI(operation, context);
          break;
        case 'web_chat':
          result = await this.generateWebChatHandoff(operation, context);
          break;
      }
      
      // Update with results
      await db.operation.update({
        where: { id: operationId },
        data: {
          status: 'complete',
          actual_cost: result.cost,
          completed_at: new Date()
        }
      });
      
      // Update project budget
      await db.project.update({
        where: { id: operation.project_id },
        data: { budget_spent: { increment: result.cost } }
      });
      
      // Clear reservation
      const reserved = this.budgetReserved.get(operation.project_id) || 0;
      this.budgetReserved.set(operation.project_id, Math.max(0, reserved - operation.cost_estimate));
      
      return result;
      
    } catch (error) {
      await db.operation.update({
        where: { id: operationId },
        data: {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date()
        }
      });
      
      await this.logEvent('operation.failed', { 
        operationId, 
        error: error.message,
        stack: error.stack 
      });
      
      throw error;
    }
  }
  
  private async logEvent(type: string, data: any) {
    await db.eventLog.create({
      data: {
        event_type: type,
        operation_id: data.operationId || data.operation?.id,
        data: data
      }
    });
  }
}
```

### Context Management

```typescript
class ContextManager {
  async gatherContext(operation: Operation): Promise<string> {
    // Get all context items for project
    const items = await db.contextItem.findMany({
      where: { project_id: operation.project_id }
    });
    
    // Apply simple rules
    const rules = await db.contextRule.findMany({
      where: { project_id: operation.project_id }
    });
    
    // Filter based on rules
    let included = items.filter(item => {
      // Check if any rule matches
      for (const rule of rules) {
        if (rule.pattern && operation.task.toLowerCase().includes(rule.pattern.toLowerCase())) {
          if (rule.action === 'auto_include' && rule.context_item_id === item.id) {
            return true;
          }
          if (rule.action === 'exclude' && rule.context_item_id === item.id) {
            return false;
          }
        }
      }
      // Default: include if explicitly selected
      return operation.context_ids?.includes(item.id);
    });
    
    // Prioritize if too large
    const maxTokens = this.getMaxTokensForTool(operation.tool);
    included = this.prioritizeContext(included, maxTokens);
    
    // Update usage stats
    for (const item of included) {
      await db.contextItem.update({
        where: { id: item.id },
        data: {
          usage_count: { increment: 1 },
          last_used: new Date()
        }
      });
    }
    
    // Build context string
    return included.map(item => `### ${item.name}\n\n${item.content}`).join('\n\n');
  }
  
  prioritizeContext(items: ContextItem[], maxTokens: number): ContextItem[] {
    // Sort by importance: explicit > recent > small
    const sorted = items.sort((a, b) => {
      if (a.last_used && b.last_used) {
        return b.last_used.getTime() - a.last_used.getTime();
      }
      return (a.tokens || 0) - (b.tokens || 0);
    });
    
    const included = [];
    let totalTokens = 0;
    
    for (const item of sorted) {
      const tokens = item.tokens || 0;
      if (totalTokens + tokens <= maxTokens * 0.8) { // Leave 20% headroom
        included.push(item);
        totalTokens += tokens;
      }
    }
    
    return included;
  }
  
  private getMaxTokensForTool(tool: string): number {
    switch (tool) {
      case 'claude_code': return 100000;
      case 'openai_api': return 120000;
      case 'web_chat': return 150000;
      default: return 50000;
    }
  }
}
```

### Tool Integration

```typescript
// Simple, direct integrations
class ToolExecutor {
  async executeClaudeCode(operation: Operation, context: string): Promise<Result> {
    // Just shell out to claude-code
    const prompt = `${operation.agent.base_prompt}\n\nContext:\n${context}\n\nTask: ${operation.task}`;
    
    const tempFile = `/tmp/claude-${operation.id}.txt`;
    await fs.writeFile(tempFile, prompt);
    
    const result = await exec(`claude-code --file ${tempFile} --project ${operation.project_id}`);
    
    // Parse output for cost
    const cost = this.parseClaudeCost(result.stdout);
    
    return {
      output: result.stdout,
      cost: cost || 0.50 // Fallback estimate
    };
  }
  
  async executeOpenAI(operation: Operation, context: string): Promise<Result> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: operation.agent.base_prompt },
        { role: 'user', content: `Context:\n${context}\n\nTask: ${operation.task}` }
      ],
      temperature: 0.7,
      stream: true
    });
    
    // Stream to websocket
    let fullResponse = '';
    let tokens = 0;
    
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullResponse += content;
      
      // Send to client via websocket
      this.sendWebSocketUpdate(operation.id, {
        type: 'stream',
        content: content
      });
    }
    
    const cost = tokens * 0.00003; // Rough estimate
    
    return {
      output: fullResponse,
      cost
    };
  }
  
  async generateWebChatHandoff(operation: Operation, context: string): Promise<Result> {
    const handoff = {
      task: operation.task,
      context: context,
      agent: operation.agent.name,
      prompt: operation.agent.base_prompt,
      return_format: 'Paste your complete response back into the app'
    };
    
    // Save handoff for later import
    await db.webChatHandoff.create({
      data: {
        operation_id: operation.id,
        handoff_data: handoff,
        created_at: new Date()
      }
    });
    
    return {
      output: JSON.stringify(handoff, null, 2),
      cost: 0 // Manual work
    };
  }
}
```

### Real-time Updates

```typescript
// Simple WebSocket manager
class WebSocketManager {
  private wss: WebSocketServer;
  private client: WebSocket | null = null;
  
  initialize(server: http.Server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (ws) => {
      this.client = ws;
      console.log('Client connected');
      
      ws.on('close', () => {
        this.client = null;
        console.log('Client disconnected');
      });
    });
  }
  
  send(event: string, data: any) {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      this.client.send(JSON.stringify({ event, data }));
    }
  }
  
  // Convenience methods
  operationUpdate(operationId: string, update: any) {
    this.send('operation.update', { operationId, ...update });
  }
  
  agentOutput(agentId: string, output: string) {
    this.send('agent.output', { agentId, output });
  }
  
  costUpdate(projectId: string, totalCost: number) {
    this.send('cost.update', { projectId, totalCost });
  }
}

// Global instance
export const ws = new WebSocketManager();
```

### Git Safety

```typescript
class GitManager {
  async createSnapshot(projectId: string, description: string) {
    const project = await db.project.findUnique({ where: { id: projectId } });
    const git = simpleGit(project.git_path);
    
    try {
      // Add all changes
      await git.add('.');
      
      // Create commit
      const commit = await git.commit(`[AI Snapshot] ${description}`);
      
      // Save reference
      await db.gitSnapshot.create({
        data: {
          project_id: projectId,
          commit_hash: commit.commit,
          description
        }
      });
      
      return commit.commit;
    } catch (error) {
      console.error('Git snapshot failed:', error);
      // Non-critical, just log and continue
    }
  }
  
  async rollback(snapshotId: string) {
    const snapshot = await db.gitSnapshot.findUnique({ 
      where: { id: snapshotId },
      include: { project: true }
    });
    
    const git = simpleGit(snapshot.project.git_path);
    await git.reset(['--hard', snapshot.commit_hash]);
  }
}
```

## Frontend Implementation

### Main App Component

```typescript
function App() {
  const { activeProject, pendingApprovals } = useStore();
  const [producerInput, setProducerInput] = useState('');
  
  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.onmessage = (event) => {
      const { event: eventType, data } = JSON.parse(event.data);
      
      switch (eventType) {
        case 'operation.update':
          useStore.setState(state => ({
            operations: new Map(state.operations).set(data.operationId, {
              ...state.operations.get(data.operationId),
              ...data
            })
          }));
          break;
          
        case 'agent.output':
          useStore.setState(state => ({
            agentOutputs: new Map(state.agentOutputs).set(data.agentId, [
              ...(state.agentOutputs.get(data.agentId) || []),
              data.output
            ])
          }));
          break;
      }
    };
    
    return () => ws.close();
  }, []);
  
  const sendProducerMessage = async () => {
    const response = await fetch('/api/producer/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: activeProject.id,
        message: producerInput
      })
    });
    
    const result = await response.json();
    useStore.setState(state => ({
      producerMessages: [...state.producerMessages, 
        { role: 'user', content: producerInput },
        { role: 'assistant', content: result.response }
      ]
    }));
    
    setProducerInput('');
  };
  
  return (
    <div className="h-screen flex flex-col">
      <Header />
      
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <ProducerChat messages={useStore(s => s.producerMessages)} />
          <input 
            value={producerInput}
            onChange={e => setProducerInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendProducerMessage()}
            className="p-4 border-t"
            placeholder="Tell the Producer what you need..."
          />
        </div>
        
        <div className="w-96 border-l">
          <ContextPanel />
          <PendingApprovals approvals={pendingApprovals()} />
        </div>
      </div>
      
      <div className="h-64 border-t flex">
        <AgentMonitor />
        <ActivityFeed />
      </div>
    </div>
  );
}
```

### Quick Approval Component

```typescript
function PendingApprovals({ approvals }) {
  const approveOperation = async (operationId: string) => {
    await fetch(`/api/operations/${operationId}/approve`, { method: 'POST' });
  };
  
  const approveAll = async () => {
    await Promise.all(approvals.map(op => approveOperation(op.id)));
  };
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">Pending Approvals ({approvals.length})</h3>
        {approvals.length > 0 && (
          <button 
            onClick={approveAll}
            className="text-blue-600 hover:text-blue-800"
          >
            Approve All
          </button>
        )}
      </div>
      
      {approvals.map(op => (
        <div key={op.id} className="mb-4 p-3 border rounded">
          <div className="font-medium">{op.agent.name}</div>
          <div className="text-sm text-gray-600">{op.task}</div>
          <div className="text-sm">
            Tool: {op.tool} | Est: ${op.cost_estimate}
          </div>
          <div className="mt-2 flex gap-2">
            <button 
              onClick={() => approveOperation(op.id)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              Approve
            </button>
            <button className="px-3 py-1 border rounded text-sm">
              Modify
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## API Routes (Simplified)

```typescript
// Just the essentials
const app = express();

// Producer AI
app.post('/api/producer/message', async (req, res) => {
  const { projectId, message } = req.body;
  
  // For now, use OpenAI for Producer (cheap and fast)
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: PRODUCER_PROMPT },
      { role: 'user', content: message }
    ]
  });
  
  res.json({ response: response.choices[0].message.content });
});

// Operations
app.post('/api/operations', async (req, res) => {
  const operation = await operationManager.createOperation(req.body);
  ws.operationUpdate(operation.id, { status: 'created' });
  res.json(operation);
});

app.post('/api/operations/:id/approve', async (req, res) => {
  const result = await operationManager.executeOperation(req.params.id);
  res.json({ success: true });
});

// Context
app.get('/api/projects/:id/context', async (req, res) => {
  const items = await db.contextItem.findMany({
    where: { project_id: req.params.id },
    orderBy: { last_used: 'desc' }
  });
  res.json(items);
});

app.post('/api/context', async (req, res) => {
  const item = await db.contextItem.create({ data: req.body });
  res.json(item);
});

// Git operations
app.post('/api/git/snapshot', async (req, res) => {
  const { projectId, description } = req.body;
  const hash = await gitManager.createSnapshot(projectId, description);
  res.json({ hash });
});
```

## Configuration

```env
# .env - Simple configuration
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/ai_team_manager

# Or for pure local:
# DATABASE_URL=file:./ai_team.db

# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Local paths
PROJECTS_PATH=/Users/you/projects
CLAUDE_CODE_PATH=/usr/local/bin/claude-code

# Simple limits
MAX_CONTEXT_TOKENS=100000
DEFAULT_BUDGET_LIMIT=50.00
```

## Testing Strategy

Focus only on critical paths:

```typescript
// Test the money paths
describe('Budget Management', () => {
  it('prevents operations exceeding budget', async () => {
    const project = await createProject({ budget_limit: 10.00, budget_spent: 9.00 });
    
    await expect(
      operationManager.createOperation({
        projectId: project.id,
        task: 'expensive task',
        cost_estimate: 2.00
      })
    ).rejects.toThrow('Would exceed budget by $1.00');
  });
});

// Test context prioritization  
describe('Context Management', () => {
  it('prioritizes context within token limits', async () => {
    const items = [
      { name: 'huge.md', tokens: 50000 },
      { name: 'recent.md', tokens: 10000, last_used: new Date() },
      { name: 'small.md', tokens: 1000 }
    ];
    
    const prioritized = contextManager.prioritizeContext(items, 15000);
    
    expect(prioritized).toEqual([
      items[1], // recent.md (10k)
      items[2]  // small.md (1k)
      // huge.md excluded - would exceed limit
    ]);
  });
});
```

## Deployment

For local use:
```bash
# Development
npm run dev

# Production (still local)
npm run build
npm start
```

For remote access:
```bash
# Use ngrok or tailscale for secure tunnel
ngrok http 3000
```

## What We're NOT Building

1. **No complex queuing** - Direct async/await execution
2. **No Redis** - Everything in PostgreSQL/memory
3. **No sophisticated auth** - Single hardcoded token
4. **No monitoring/alerting** - Check logs when something breaks
5. **No automatic retries** - Manual retry with modifications
6. **No data migrations** - Just recreate database if schema changes
7. **No complex error recovery** - Show error, let user decide

## Success Metrics

The only metrics that matter:
1. Can complete entire dev cycles without leaving the app
2. Know exactly how much AI operations cost
3. Can recover from any failure state easily
4. Context doesn't get lost between tool switches
5. Can see what agents are doing in real-time

## Next Steps

### Week 1: Core Loop
1. Basic Producer chat with OpenAI
2. Operation creation and approval
3. Simple context management
4. Real-time WebSocket updates

### Week 2: Tool Integration  
1. Claude Code execution
2. Web chat handoff generation
3. Cost tracking
4. Git snapshots

### Week 3: Polish
1. Context prioritization
2. Operation history view
3. Better error messages
4. Quick retry options

The key is to start simple and add complexity only where it actually improves your workflow.