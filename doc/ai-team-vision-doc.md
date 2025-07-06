# AI Team Management Webapp - Vision Document

## Project Context

**Goal:** Build a webapp where I manage AI development teams through a Producer AI agent. After 35 years of professional engineering, I know that good process and good habits deliver good products. AI devs don't have to be perfect if well managed.

**Current Pain Points:**
- Context switching between multiple AI chats kills productivity
- Copy-paste between tools introduces errors and breaks workflow
- No cost control over expensive AI operations  
- No central visibility into development artifacts

## Core Vision

**Primary Concept:** One interface where I communicate primarily with the Producer AI agent, which coordinates other AI agents, while I maintain full visibility and control over the development process.

**Success Criteria:**
- Complete development cycles without leaving the webapp
- Full audit trail of all AI agent work
- Cost control and transparency
- Dramatically improved productivity through eliminated context switching

## System Architecture

### Agent & Role System
- **Agents** = capabilities (Lead Engineer, Designer, QA, etc.)
- **Roles** = specific job contexts (Tech Spec Writer, Code Reviewer, Red Team, etc.)
- Same agent can wear different roles with different prompts and context
- Example: Lead Engineer can be Tech Spec Writer, Code Reviewer, or Red Team member

### Project Management
- Multiple isolated projects with separate contexts
- Each project has independent agent teams and conversation histories
- Project-specific artifact folders and deliverable tracking
- Typically 1-3 projects active (single user system)

### Context Hierarchy (Core Technical Challenge)
- **Global context** (always included in all prompts)
- **Project context** (available to check/uncheck per role/phase)
- **Role-specific context** (e.g., code quality standards for reviewer role)
- **Task-specific context** (current feature requirements)
- Granular control over what each role knows when

### Phase Configuration
- Customizable workflow phases (Vision, Design, Requirements, Implementation, etc.)
- Each phase can have specific context rules and available roles
- Phase configuration per project type

### Tool Integration & Cost Control
Smart routing between three tools:
- **Web chat handoffs** (complex strategic work, full context)
- **Claude Code integration** (implementation, file operations)
- **OpenAI API** (quick tactical tasks like code reviews)

**Cost Management:**
- Manual approval gates before expensive operations
- Real-time cost visibility
- Future: automated mode with spending limits

### Handoff System for Web Chat
- App generates context document with prompt and full project context
- Copy/paste to web chat for complex work
- Structured response format that copies back to app
- Seamless integration without losing workflow state

### Git Integration for Safety
- Git branching for agent operation isolation
- Snapshot commits before file operations
- One-click rollback to known good states
- Complete audit trail of agent actions
- Prevents directory corruption from agent errors

## User Workflow

### Primary Interaction Pattern
1. I communicate with Producer AI agent in webapp
2. Producer coordinates other agents based on task requirements
3. I approve each agent operation before execution
4. Real-time visibility into all agent activities
5. Artifacts tracked and versioned automatically

### Approval Process
- Manual approval for most operations (I'm an active component)
- Producer can auto-approve routine operations with clear criteria
- Quick approve/reject UX with minimal context switching
- Batch approval capabilities for related work
- Clear rollback options for bad approvals

### Context Management Strategy
- Learning through iteration rather than complex upfront rules
- Manual context curation with tooling support
- I stop/redirect when agents go off rails
- Simple choices made during use rather than pre-configured

## Technical Requirements

### Core Features
- **Project isolation** with independent contexts and agent teams
- **Real-time artifact viewer** as agents create deliverables
- **Activity feed** showing all agent operations
- **Cost tracking** with breakdown by tool and operation
- **Git integration** for version control and rollback safety
- **Multi-tool routing** with smart cost optimization

### Database Schema Needs
- Projects, agents, roles, contexts, tasks, artifacts
- Agent conversation history per project
- Context access permissions per role/phase
- Cost tracking and approval audit trails

### Performance Considerations
- Single user system (no scaling complexity)
- 1-3 active projects maximum
- Focus on productivity over scale
- Optimized for developer workflow patterns

## Design Phase Requirements

**Immediate Design Needs:**

1. **Producer Dashboard Interface**
   - Central command interface for managing AI teams
   - Real-time agent status and activity monitoring
   - Quick approval/rejection controls
   - Cost visibility and alerts

2. **Project Management Views**
   - Project creation and configuration
   - Context hierarchy management interface
   - Phase progression tracking
   - Artifact organization and viewing

3. **Context Configuration System**
   - Intuitive interface for managing what agents know
   - Role-based context access controls
   - Visual context dependency mapping
   - Quick context enable/disable toggles

4. **Approval Workflow UX**
   - Streamlined approve/reject interfaces
   - Batch operation handling
   - Clear preview of what agents will do
   - One-click rollback capabilities

5. **Tool Integration Interface**
   - Cost breakdown and monitoring
   - Tool routing decision visibility
   - Handoff document generation for web chat
   - Return data integration workflows

## User Experience Priorities

**Efficiency:** Every interaction should eliminate context switching and reduce manual work while maintaining control.

**Transparency:** Complete visibility into what agents are doing, what they know, and what operations cost.

**Safety:** Git-backed rollback capabilities and approval gates prevent costly mistakes.

**Learning:** System should improve through iteration without complex upfront configuration.

**Natural Flow:** Interface should feel like natural project management, not AI wrangling.

## Success Metrics

**Primary:** I can complete entire development cycles faster than working alone, without leaving the webapp.

**Secondary:** 
- Zero directory corruption incidents (Git safety)
- Predictable and controlled AI operation costs
- Reduced time spent on context switching and tool coordination
- High agent work quality through effective management

---

**Next Steps:** Design the core user interface wireframes and user experience flows that enable this vision while maintaining simplicity and control.