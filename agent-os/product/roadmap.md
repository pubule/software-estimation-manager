# Product Roadmap - Software Estimation Manager

## Overview

The roadmap is organized around delivering maximum user value in phases, starting with MVP (minimum viable product) that solves the core estimation and resource tracking problems, then expanding to advanced features for capacity planning and financial analysis.

**Strategy**: Each phase builds incrementally, with earlier phases focusing on core workflows (create estimates, track allocation, monitor production KPIs) and later phases adding sophisticated analysis and reporting.

---

## Phase 0: MVP (Foundation)

These features form the absolute minimum viable product - if this works well, users get immediate value.

1. [ ] **Project Creation and Management** — Users can create projects with basic metadata (name, start/end date, team size), view project list, and edit project details. Core data model and persistence layer validated. `M`

2. [ ] **Feature and Component Management** — Users can add features/components to projects, edit descriptions and effort estimates (in person-hours), delete features, and see feature list organized by project. Covers CRUD operations for feature estimates. `M`

3. [ ] **Basic Resource Allocation** — Users can assign team members to projects with allocation percentage (0-100%), view simple allocation matrix showing person × project allocation, identify basic over-allocation (> 100% on single project). Foundation for capacity management. `L`

4. [ ] **Project Phase Organization** — Users can create phases within projects (e.g., "MVP", "Phase 1", "Phase 2"), organize features by phase, track phase-level effort totals. Enables more structured project breakdown. `M`

5. [ ] **Cost and Vendor Management** — Users can add cost items to projects/features including vendor/contractor costs, track internal resource costs (hourly rates), calculate total project cost, export cost summary. Covers financial visibility. `L`

6. [ ] **Estimation Assumptions and Rationale Tracking** — Users can document assumptions for each estimate (team experience, tech stack clarity, dependencies, external factors), attach assumptions to features/estimates, view assumption history. Core differentiator feature. `M`

7. [ ] **Estimation Versioning and Change History** — Users can see all estimate versions over time with timestamps, view what changed between versions, document reason for each estimate change, roll back to previous estimate if needed. Enables learning from estimate variance. `L`

8. [ ] **CSV Import for Production KPIs** — Users can import production metrics (completed tickets, cards moved, bugs fixed) from CSV, map CSV columns to product fields (feature → ticket count, effort → hours worked), validate imported data, store KPI history. Bridges estimate to actual gap. `L`

**MVP Completion Criteria**:
- All 8 features implemented and tested
- Cucumber acceptance tests passing for each feature
- Users can manage multi-project estimation, allocation, and basic KPI tracking
- Data persists across sessions (file-based storage)
- Application remains responsive with 5+ projects, 50+ features, 10+ team members

---

## Phase 1: Core Value Expansion

These features expand the MVP to deliver on the core value proposition - professional estimation and allocation management.

9. [ ] **Capacity Utilization Dashboard** — Users see real-time capacity metrics: total allocation % per person, projects per person, estimated monthly hours vs available hours, visual indicators of over/under-allocation. Single dashboard view answering "do we have capacity?" `M`

10. [ ] **Resource Availability and Capacity Planning** — Users can set available hours per team member per week/month, mark periods of unavailability (vacation, support rotation), calculate actual available capacity, simulate "what if" allocation scenarios. Enables proactive capacity management. `L`

11. [ ] **Estimate Accuracy Tracking** — System automatically calculates estimate variance (planned vs actual hours from KPI import), shows accuracy by feature/phase/project, identifies estimation patterns (e.g., "we consistently underestimate UI work by 20%"), generates insights on estimate drivers. `L`

12. [ ] **Project Timeline and Dependency Visualization** — Users can view project timeline showing phases, features, dependencies between phases, critical path highlighting, estimated completion dates based on resource allocation and effort. Supports project planning discussions. `M`

13. [ ] **Team Member Utilization Reports** — Reports showing per-person allocation by project and time period, historical utilization trends, capacity headroom/shortfall forecasts, allocation fairness metrics. Supports resource planning conversations. `M`

14. [ ] **Financial Summary and Variance Reporting** — Reports showing estimated vs actual project cost, cost by phase/feature/vendor, cost variance explanations, burn rate tracking. Supports project financial health conversations. `M`

15. [ ] **Estimation Session Planning** — Support for running estimation sessions: create estimation template, define point scale or time estimates, facilitate estimation discussion, record final estimate and assumptions, track session outcomes. Professionalizes estimation process. `L`

16. [ ] **Scenario Planning and What-If Analysis** — Users can create alternate estimation scenarios ("optimistic", "realistic", "pessimistic"), compare scenarios side-by-side, model impact of adding/removing team members or projects, export scenario comparison. Supports planning discussions. `L`

**Phase 1 Completion Criteria**:
- Capacity and resource management workflows fully functional
- Estimate accuracy feedback loop implemented
- Users have visibility into project health (timelines, costs, allocation)
- Professional reports support PM and TL decisions
- Capable of managing 50+ projects, 200+ features, 50+ team members

---

## Phase 2: Advanced Analysis and Intelligence

These features deliver advanced insights and automation to help users make better decisions.

17. [ ] **Estimation Benchmarking and Learning** — System analyzes historical estimates across projects to identify estimation patterns, benchmarks similar features across projects, suggests estimates for new features based on historical data, tracks which assumption combinations correlate with accuracy. Enables organizational learning. `XL`

18. [ ] **Capacity Forecasting** — Multi-month capacity forecast showing projected capacity based on historical utilization, identifies capacity constraints 4-12 weeks out, suggests team composition changes or staffing needs, supports hiring and resourcing decisions. `L`

19. [ ] **Burndown and Progress Tracking** — Shows expected vs actual progress on projects/phases based on estimate vs KPI data, identifies projects at risk of missing timelines/budgets, recommends corrective actions. `M`

20. [ ] **Team Performance Analytics** — Metrics on estimation accuracy per team member, productivity trends, factors correlating with good/bad estimates, recommendations for process improvements. `L`

21. [ ] **Custom Estimation Templates** — Users can create reusable estimation templates for common project types (e.g., "web application", "mobile app", "API"), standardizes estimation process, reduces estimation time. `M`

22. [ ] **Integration with External Tools** — Support integrating with Jira, Azure DevOps, or other issue tracking systems for automatic KPI import, reduces manual CSV import burden. `XL`

23. [ ] **Multi-Team and Portfolio Management** — Support managing estimates across multiple teams, portfolio-level capacity view, cross-team resource sharing, organization-wide capacity forecasting. `XL`

24. [ ] **Audit Trail and Compliance Reporting** — Complete audit log of all estimate changes, assumptions, and approvals, supports compliance requirements, tracks who made changes and when, exportable audit reports. `M`

**Phase 2 Completion Criteria**:
- Advanced analytics guide estimation and allocation decisions
- System learns from historical data to improve future estimates
- Organization has clear visibility into capacity constraints and hiring needs
- Professional reports support board-level discussions

---

## Phase 3: Enterprise and Scale

These features support larger organizations and specialized use cases.

25. [ ] **Role-Based Access Control** — Different user roles (PM, TL, Finance, Executive) with different permissions and dashboards, supports multi-team organizations, audits access changes. `L`

26. [ ] **Budget Tracking and Accounting Integration** — Links estimates to budget allocations, tracks actuals against budget, supports cost center allocation, exports for accounting systems, supports variance analysis (est vs budget vs actual). `L`

27. [ ] **Vendor Management and Contract Tracking** — Manage vendor relationships, track vendor costs and contract terms, link vendors to projects/features, identify vendor dependency risks. `M`

28. [ ] **Advanced Reporting and BI Export** — Export data to Power BI, Tableau, or other BI tools, supports custom report building, scheduled report generation, mobile-friendly report dashboards. `L`

29. [ ] **Estimation Approval Workflow** — Define approval workflows for estimates, track approvals and sign-offs, supports budget governance, maintains compliance history. `M`

30. [ ] **Time Tracking Integration** — Import actual hours spent from time tracking systems, correlates with estimates, supports timekeeping-based KPI updates. `L`

**Phase 3 Completion Criteria**:
- Enterprise organizations can manage multiple teams, budgets, vendors
- Full audit trail and compliance support
- Integration with business systems (accounting, BI, time tracking)
- Ready for organization-wide rollout

---

## Notes

- Order reflects dependencies (capacity planning requires allocation tracking; estimation accuracy requires KPI import)
- Effort estimates assume typical team (3-4 developers, 1 PM, 1 TL)
- MVP can ship standalone; Phases 1-3 build on MVP for progressive value
- Prioritization within phases can be adjusted based on user feedback
- Each feature is end-to-end (backend + frontend) and includes Cucumber acceptance tests
- "What-If" features (scenarios, capacity forecasting) are complex and require careful UI/UX design

## Effort Scale

- XS: 1 day - Minor UI changes, simple validations
- S: 2-3 days - Single-screen features, straightforward logic
- M: 1 week - Multi-screen features, moderate complexity
- L: 2 weeks - Complex workflows, multiple screens, integration work
- XL: 3+ weeks - Major system changes, complex algorithms, significant UI work
