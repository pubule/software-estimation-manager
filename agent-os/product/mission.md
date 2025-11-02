# Product Mission - Software Estimation Manager

## Pitch

**Software Estimation Manager** is a desktop application that helps Project Managers and Team Leads manage software development cost estimates, track resource allocations, and monitor production quality metrics across multiple concurrent projects by providing comprehensive visibility into estimation assumptions, resource utilization, and project progress.

## Vision Statement

Enable engineering leaders to make data-driven project decisions by consolidating estimates, resource allocation, production metrics, and historical tracking into a single, accessible desktop application that eliminates estimation ambiguity and prevents resource over-allocation.

## Value Proposition

Unlike spreadsheet-based estimation systems or fragmented project management tools, Software Estimation Manager provides:

- **Unified Estimation Tracking**: One source of truth for all project estimates, versions, and the assumptions behind them
- **Resource Allocation Visibility**: Real-time overview of team member capacity across all projects to prevent over-allocation
- **Production-Aware Estimation**: Track completed work via KPI monitoring (tickets/cards) to calibrate future estimates accurately
- **Comprehensive Project Architecture**: Organize estimates by features, phases, vendors, and external dependencies in a single view
- **Audit Trail**: Complete version history of all estimates with rationale tracking to understand why estimates changed

## Users

### Primary Customers

- **Project Managers**: Responsible for tracking multiple concurrent projects, managing stakeholder expectations, ensuring accurate estimates for planning and budgeting
- **Team Leads**: Managing variable team composition, allocating team members across projects, ensuring fair resource distribution, monitoring team productivity against estimates

### Secondary Customers

- **Engineering Directors**: Oversight of multiple project portfolios, capacity planning at organization level
- **Business Analysts**: Requirements documentation and estimation assumption tracking

## User Personas

### Persona 1: Andrea - Pragmatic Team Lead

**Profile**: 8 years experience leading engineering teams, manages 4-6 developers across 2-3 concurrent projects

**Context**:
- Team size fluctuates due to support rotations and variable project demands
- Constantly juggling priorities between new development and support
- Needs visibility into who is allocated where and by how much
- Frustrated by estimation surprises mid-project
- Must justify resource allocation decisions to managers

**Pain Points**:
- Team members don't know their total allocation percentage across projects
- Estimates are changed frequently without understanding the "why"
- Can't quickly answer "who is available" questions
- Production bugs derail estimates but this learning never feeds back into future estimates
- Spreadsheets don't scale as project count increases

**Goals**:
- Achieve 95% resource allocation monthly (balancing utilization vs burnout)
- Reduce mid-project estimate re-planning by 40%
- Create an auditable estimation process that new team members understand
- Make estimation assumptions explicit so they become organizational knowledge

**Measurement of Success**:
- Team can see their capacity utilization in real-time
- Estimation assumptions documented and searchable
- Production metrics (completed tickets) tracked against estimates
- Can generate "resource allocation report" in under 1 minute

### Persona 2: Marco - Results-Oriented Project Manager

**Profile**: 12 years PM experience, oversees 3-5 concurrent projects with total budgets of 200k-500k EUR

**Context**:
- Responsible for project profitability and timeline accuracy
- Must provide stakeholders with reliable delivery dates and cost estimates
- Works with external vendors and contractors (needs cost tracking)
- Estimates frequently change; needs to understand financial impact
- Uses estimates for budget allocation, staffing decisions, and client commitments

**Pain Points**:
- Estimates are scattered across emails, documents, and spreadsheets
- Can't quickly see project health: "Are we on track cost-wise and timeline-wise?"
- External vendor costs not integrated with internal estimates
- No way to correlate "estimate accuracy" with "what we actually delivered"
- Estimates from 6 months ago are hard to retrieve and compare

**Goals**:
- Have one source of truth for all active project estimates
- Track estimate accuracy over time to improve forecasting
- Understand resource constraints before committing to client deadlines
- Reduce estimate-related disputes with stakeholders
- Make informed staffing decisions based on capacity data

**Measurement of Success**:
- Can see full project financials (internal resources + vendor costs) in < 30 seconds
- Estimation accuracy improves by 20% within 3 months of use
- All estimate changes documented with reason codes
- Can generate "capacity forecast" to answer staffing questions

## The Problem

### Problem 1: Estimation Drift and Loss of Rationale

Project teams make estimates with specific assumptions (team experience, tech stack clarity, dependencies on other projects, etc.), but these assumptions are rarely documented. When estimates change, the original reasoning is lost, leading to:

- Repeated mistakes across similar projects
- Inability to learn from estimate vs actual variance
- Duplicate work as different projects re-estimate similar features
- Organizational knowledge siloed in individuals' heads, lost when they leave

**Impact**: Teams waste 10-15% of planning cycles re-estimating or dealing with estimate surprises.

**Our Solution**: Systematic documentation of estimation assumptions, versioning of all estimate changes, and production KPI tracking to create a feedback loop that improves estimation accuracy over time.

### Problem 2: Resource Over-Allocation and Invisible Contention

Most teams lack real-time visibility into how many projects each team member is allocated to. Resource managers don't know:

- Whether 100 hours is allocated to engineer X across all projects
- Which projects will suffer if someone takes leave
- Whether the team has capacity for the next request
- Historical allocation patterns to understand sustainable capacity

**Impact**: Teams operate at 110-120% utilization (unsustainable), leading to burnout and quality issues. Crisis management replaces planned work.

**Our Solution**: Real-time resource allocation dashboard showing capacity utilization per person, per project, with capacity planning tools to optimize allocation.

### Problem 3: No Single Source of Truth for Project Structure

Estimates are fragmented across:
- Feature lists in documents or Jira
- Phase planning in separate tools
- Vendor/external costs in accounting or contracts
- Actual production work (tickets) in separate issue tracking
- Resource allocation in calendar tools or spreadsheets

**Impact**:
- Project managers spend significant time consolidating data from multiple sources
- Discrepancies between estimate and actual (no clear link between planned features and completed work)
- Impossible to get a holistic project view quickly
- New team members don't know where project information lives

**Our Solution**: Unified project workspace containing features, phases, cost estimates (internal and external), assumptions, and KPI tracking all in one place.

## Differentiators

### Differentiator 1: Estimation-Centric, Not Just Task Tracking

Unlike Jira, Monday.com, or Asana (which focus on task execution), Software Estimation Manager focuses on the estimation and planning phase:
- Tracks estimate assumptions explicitly
- Versions estimates with change rationale
- Links estimates to actual outcomes via KPI monitoring
- Designed for pre-execution planning, not just task management

**Result**: Teams make better estimates because they understand past assumption accuracy. Estimates become organizational IP rather than guesses.

### Differentiator 2: Multi-Project Resource Visibility

Unlike single-project management tools or basic PM spreadsheets, Software Estimation Manager provides:
- Real-time capacity dashboard across all projects
- Resource allocation rules and constraints
- Capacity planning simulations ("what if we add this project?")
- Monthly capacity utilization reporting per resource

**Result**: Team leads prevent over-allocation before it happens, improving team health and project outcomes.

### Differentiator 3: Production-Aware Estimation

Unlike pure estimation tools, Software Estimation Manager bridges the gap between estimate and actual by:
- Importing production KPIs (tickets completed, cards moved, bugs fixed) via CSV
- Correlating planned features with completed work
- Calculating estimate accuracy (planned vs actual)
- Creating feedback loops for future estimates

**Result**: Estimation becomes a learning discipline with measurable improvement over time, not a one-time guess.

### Differentiator 4: Purpose-Built for Italian Engineering Culture

The application is designed with Italian team dynamics in mind:
- Respects human judgment and discussion (estimation assumptions are discussion starters, not constraints)
- Supports flexibility (estimates can change; tool tracks rationale)
- Emphasizes team capacity health (prevents burnout-inducing over-allocation)
- Built for teams of 5-50 people managing 2-10 concurrent projects (sweet spot for Italian mid-market firms)

## Key Success Metrics

### For Team Leads (Capacity Management Success)
1. **Allocation Accuracy**: Achieve 95%+ monthly resource allocation rate per team member (balancing utilization with sustainability)
2. **Allocation Visibility**: Time to see "who has capacity for new work" drops from 30 minutes to < 2 minutes
3. **Over-Allocation Prevention**: Zero instances of unplanned over-allocation (> 110% utilization) per month
4. **Capacity Forecasting Accuracy**: Forecast vs actual capacity matches within 10% over rolling quarter

### For Project Managers (Estimation Success)
1. **Estimate Accuracy**: Estimate variance (planned vs actual) improves from 30-40% to < 20% within 3 months of consistent use
2. **Assumption Documentation**: 100% of estimates have documented assumptions; zero "lost context" situations
3. **Version Tracking**: All estimate changes tracked with rationale; enables post-mortem learning
4. **Time to Project Overview**: Generate complete project financials (features + phases + vendor costs) in < 30 seconds
5. **Cost Visibility**: Actual vs estimated spend tracked; understands cost drivers at feature and vendor level

### For Organization (Business Value)
1. **Estimation Consistency**: Estimation process repeatable and documented; new PMs reach productivity in 2 weeks vs 3 months
2. **Reduced Re-Planning**: Estimate revisions drop from 40% of projects to < 15% due to better initial assumptions
3. **Resource Efficiency**: Sustainable capacity enables 5-10% productivity improvement (less crisis management)
4. **Knowledge Retention**: Estimation assumptions and lessons learned capture prevents loss of context when staff changes

## Core Capabilities

### 1. Project Management
- Create and manage multiple concurrent projects
- Track project phases with dependencies
- Organize features/components by project and phase
- Link external vendors/contractors to projects

### 2. Estimation Management
- Create detailed feature estimates with effort and cost breakdowns
- Document estimation assumptions for every estimate
- Track estimate versions with change history and rationale
- Support different cost models (hourly, daily, fixed price, T&M)

### 3. Resource Allocation
- View real-time resource allocation across projects
- Plan and simulate allocation changes
- Monitor utilization rates per person, per project
- Identify over-allocation and capacity gaps

### 4. Production KPI Monitoring
- Import production metrics (tickets, cards, bugs) via CSV
- Correlate planned features with completed work
- Track estimate accuracy (planned vs actual)
- Calculate velocity and productivity trends

### 5. Capacity Planning
- Monitor team capacity against project demands
- Simulate "what if" allocation scenarios
- Generate capacity forecasts for 4-12 week planning horizons
- Report on team health metrics (utilization, sustainability)

### 6. Financial Tracking
- Aggregate costs by project, phase, feature, and vendor
- Track actual vs estimated spend
- Support multiple cost types (internal resources, vendors, fixed costs)
- Export financial reports for accounting/budgeting

## Platform & Architecture

- **Desktop Application**: Electron + React 18 + TypeScript for native desktop experience
- **Local Storage**: File-based persistence (electron-store) for data privacy and offline capability
- **State Management**: Zustand for predictable, efficient state management
- **Testing**: Cucumber BDD for user-focused acceptance testing
- **Build**: Vite for fast development and builds; Electron Builder for cross-platform distribution

## Target Platforms

- Windows (Primary)
- macOS (Secondary)
- Linux (Tertiary)

All platforms require .NET runtime or equivalent for Excel/CSV parsing.
