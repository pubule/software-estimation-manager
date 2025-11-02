# Task Breakdown: Project Approval Status Feature

## Overview

This task list covers the implementation of a project-level approval status field with UI controls and visual indicators across the application. The feature adds "Approved" and "Pending Approval" states to projects, displayed via dropdown in Phases Configuration and icons in project cards.

**Total Tasks:** 28
**Estimated Effort:** 4-5 days
**Architecture Pattern:** Zustand Store + Actions + React Components (CLAUDE.md enforced State/Actions/Dispatcher pattern)

## Task List

### 1. Test Definition & BDD Scenarios

#### Task Group 1: Cucumber Feature File and Step Definitions
**Dependencies:** None
**Effort:** S (Small)

This is the first phase. Create all tests before implementation begins (TDD approach).

- [ ] 1.1 Write Cucumber feature file for approval status scenarios
  - File: `features/approval-status.feature`
  - Scenarios to cover:
    - User sets approval status to "Approved" in Phases Configuration
    - User sets approval status to "Pending Approval" in Phases Configuration
    - Approval status persists after project save and reload
    - New project defaults to "Pending Approval" status
    - Old project without approvalStatus field defaults to "Pending Approval"
    - Approval status icon displays in CurrentProjectCard
    - Approval status icon displays in RecentProjectsList
    - Approval status icon displays in SavedProjectsList
    - Changing status marks project dirty for auto-save
    - Green checkmark displays for "Approved" status
    - Orange clock displays for "Pending Approval" status
    - Tooltip text displays correct approval status text
  - Use Gherkin syntax with clear Given/When/Then steps
  - Focus on user workflows, not implementation details

- [ ] 1.2 Create step definitions for approval status scenarios
  - File: `cucumber/step-definitions/approval-status.steps.js`
  - Implement Given steps for project setup
  - Implement When steps for opening Phases Configuration, selecting status, saving projects
  - Implement Then steps for verifying icon display, colors, tooltips, persistence
  - Reuse existing page objects for project operations
  - Create new page object methods for Phases Configuration interactions

- [ ] 1.3 Create page object methods for approval status interactions
  - File: `cucumber/page-objects/phasesConfigPage.js`
  - Method: `selectApprovalStatus(status)` - select approval status from dropdown
  - Method: `getApprovalStatus()` - read current approval status
  - Method: `getApprovalStatusIcon()` - locate approval status icon element
  - File: `cucumber/page-objects/projectCardsPage.js`
  - Methods for reading approval status icons from CurrentProjectCard, RecentProjectsList, SavedProjectsList

- [ ] 1.4 Verify all scenarios are well-defined and executable
  - Review feature file for clarity and completeness
  - Ensure step definitions can map to feature file steps
  - Verify page object methods cover all UI interactions needed
  - Confirm scenarios focus on user behavior, not implementation

**Acceptance Criteria:**
- Feature file created with 12+ scenarios covering all approval status behaviors
- Step definitions map to all feature file steps
- Page objects provide methods for all UI interactions
- All scenarios are executable (no undefined steps)
- Scenarios test user behavior, not implementation details

---

### 2. Data Model & Store Configuration

#### Task Group 2: Zustand Store Updates
**Dependencies:** Task Group 1
**Effort:** S (Small)

- [ ] 2.1 Add approvalStatus field to project interface/type
  - File: `src/renderer/js/store/app-store.js`
  - Add `approvalStatus: string` field to currentProject state structure
  - Default value: `"Pending Approval"`
  - Type definition (JSDoc): `@type {string}` with allowed values documented
  - Location: Within currentProject object, alongside other project metadata

- [ ] 2.2 Add store setter method for approval status
  - File: `src/renderer/js/store/app-store.js`
  - Add method: `setProjectApprovalStatus(status: string)`
  - Implementation:
    - Validate status is either "Approved" or "Pending Approval"
    - Update `currentProject.approvalStatus` with validated status
    - Call `markDirty()` to trigger auto-save
    - Return void
  - Error handling: Log error for invalid status values, do not update

- [ ] 2.3 Initialize approvalStatus in setProject() method
  - File: `src/renderer/js/store/app-store.js`
  - Update existing `setProject()` method
  - When new project is loaded:
    - If approvalStatus exists: use provided value
    - If approvalStatus missing: initialize to `"Pending Approval"` (backward compatibility)
  - Ensure clean state initialization when switching projects

- [ ] 2.4 Verify store structure and test approvalStatus field behavior
  - Run minimal verification that:
    - `setProjectApprovalStatus("Approved")` updates state correctly
    - `setProjectApprovalStatus("Pending Approval")` updates state correctly
    - Invalid values are rejected with error logging
    - `markDirty()` is called after update
    - Project changes trigger proper state reset

**Acceptance Criteria:**
- `approvalStatus` field added to currentProject state with default value
- `setProjectApprovalStatus(status)` method works correctly
- Invalid status values are rejected
- `markDirty()` is called after status updates
- Backward compatibility: missing field defaults to "Pending Approval"
- Store tests pass for these methods

---

### 3. Actions & Business Logic

#### Task Group 3: ProjectsActions Extension
**Dependencies:** Task Group 2
**Effort:** S (Small)

- [ ] 3.1 Add updateApprovalStatus method to ProjectsActions class
  - File: `src/renderer/react/actions/ProjectsActions.ts`
  - Method signature: `updateApprovalStatus(status: string): void`
  - Implementation:
    - Validate status is "Approved" or "Pending Approval"
    - Get store instance: `const store = this.getStore();`
    - Call store method: `store.getState().setProjectApprovalStatus(status)`
    - Include try/catch error handling
    - Log success: `Updated project approval status to: ${status}`
  - Do NOT include any UI logic, state mutations, or side effects beyond calling store

- [ ] 3.2 Export updateApprovalStatus through custom hook
  - File: `src/renderer/react/hooks/useProjectActions.ts`
  - Add export for updateApprovalStatus callback
  - Implementation pattern:
    - Create ProjectsActions instance
    - Wrap method in useCallback for memoization
    - Include all dependencies in dependency array
    - Return bound method that components can call
  - Follow existing pattern from useProjectActions for other methods

- [ ] 3.3 Verify ProjectsActions tests pass
  - Run tests for ProjectsActions class
  - Verify updateApprovalStatus:
    - Calls store method correctly
    - Validates status values
    - Handles errors appropriately
    - Does not contain any UI or component logic

**Acceptance Criteria:**
- `updateApprovalStatus()` method added to ProjectsActions
- Method validates status values
- Method calls store setter correctly
- Method exported via custom hook
- Method properly handles errors
- No business logic in UI components

---

### 4. UI Components - Reusable Components

#### Task Group 4: ApprovalStatusIcon Component
**Dependencies:** Task Group 2
**Effort:** XS (Extra Small)

- [ ] 4.1 Create ApprovalStatusIcon component
  - File: `src/renderer/react/components/ApprovalStatusIcon.tsx` (NEW)
  - Props interface:
    - `status: "Approved" | "Pending Approval"`
    - `size?: string` (optional, default: '1em')
  - Implementation:
    - Render conditional icon based on status:
      - Approved: `<i className="fas fa-check-circle"></i>` with style `color: #4CAF50`
      - Pending Approval: `<i className="fas fa-clock"></i>` with style `color: #FF9800`
    - Add title attribute for tooltip showing status text
    - Render as inline span with appropriate spacing
    - Apply className: `approval-status-icon`
  - Type: Pure functional component (no state, no effects)
  - Export default

- [ ] 4.2 Create ApprovalStatusSelector component
  - File: `src/renderer/react/components/ApprovalStatusSelector.tsx` (NEW)
  - Props interface:
    - `currentStatus: string`
    - `onStatusChange: (status: string) => void`
  - Implementation (model after SupplierSelectors pattern):
    - Render wrapper div: `className="approval-status-selector"`
    - Render label: "Project Approval Status"
    - Render select element with two options:
      - Option 1: value="Pending Approval", label="Pending Approval"
      - Option 2: value="Approved", label="Approved"
    - onChange handler calls `onStatusChange(e.target.value)`
    - Current status bound to select value
  - Styling: Match SupplierSelectors component structure
  - Type: Pure functional component
  - Export default

- [ ] 4.3 Verify ApprovalStatusIcon component renders correctly
  - Verify icon displays for "Approved" status with green color
  - Verify icon displays for "Pending Approval" status with orange color
  - Verify tooltip text displays on hover
  - Verify component is pure and has no side effects

**Acceptance Criteria:**
- ApprovalStatusIcon component created with correct icons and colors
- ApprovalStatusSelector component created with dropdown UI
- Both components are pure functional components
- Icons render with correct colors (#4CAF50 for Approved, #FF9800 for Pending Approval)
- Tooltips display correct text
- Components match styling patterns of existing components

---

### 5. UI Components - Phases Configuration

#### Task Group 5: PhasesManager Component Update
**Dependencies:** Task Group 3, Task Group 4
**Effort:** S (Small)

- [ ] 5.1 Import ApprovalStatusSelector into PhasesManager
  - File: `src/renderer/react/components/PhasesManager.tsx`
  - Add import: `import ApprovalStatusSelector from './ApprovalStatusSelector';`
  - Import custom hook: `import { useProjectActions } from '../hooks/useProjectActions';`

- [ ] 5.2 Add approval status state selector to useStore hook
  - File: `src/renderer/react/components/PhasesManager.tsx`
  - Extend existing useStore call to include: `currentApprovalStatus: state.currentProject?.project?.approvalStatus || "Pending Approval"`
  - Add to destructuring in component

- [ ] 5.3 Get updateApprovalStatus action from custom hook
  - File: `src/renderer/react/components/PhasesManager.tsx`
  - Add to usePhasesActions hook: `const { updateApprovalStatus } = useProjectActions();`
  - Verify hook returns the method

- [ ] 5.4 Add ApprovalStatusSelector component to phases-controls div
  - File: `src/renderer/react/components/PhasesManager.tsx`
  - Location: First child element inside `<div className="phases-controls">`
  - Must be BEFORE SupplierSelectors component
  - Component JSX:
    ```jsx
    <ApprovalStatusSelector
      currentStatus={currentApprovalStatus}
      onStatusChange={updateApprovalStatus}
    />
    ```
  - Verify it renders before other controls

- [ ] 5.5 Verify Phases Configuration displays approval status dropdown
  - Open Phases Configuration modal
  - Verify ApprovalStatusSelector renders as first element
  - Verify dropdown shows current approval status
  - Verify dropdown options are "Pending Approval" and "Approved"
  - Verify onChange handler is wired correctly

**Acceptance Criteria:**
- ApprovalStatusSelector imported and added to PhasesManager
- Dropdown appears as first element in phases-controls div
- Current status is displayed and can be changed
- onChange handler calls updateApprovalStatus action
- Status change marks project dirty (auto-save triggered)

---

### 6. UI Components - CurrentProjectCard

#### Task Group 6: CurrentProjectCard Component Update
**Dependencies:** Task Group 4
**Effort:** XS (Extra Small)

- [ ] 6.1 Import ApprovalStatusIcon into CurrentProjectCard
  - File: `src/renderer/react/components/CurrentProjectCard.tsx`
  - Add import: `import ApprovalStatusIcon from './ApprovalStatusIcon';`

- [ ] 6.2 Add approval status to useStore state selector
  - File: `src/renderer/react/components/CurrentProjectCard.tsx`
  - Update useStore destructuring to include:
    - `approvalStatus: state.currentProject?.project?.approvalStatus || "Pending Approval"`

- [ ] 6.3 Add ApprovalStatusIcon span to project-details section
  - File: `src/renderer/react/components/CurrentProjectCard.tsx`
  - Location: Inside `<div className="project-details">`, after version detail span
  - JSX:
    ```jsx
    {hasLoadedProject && (
      <span className="project-detail">
        <ApprovalStatusIcon status={approvalStatus} />
      </span>
    )}
    ```
  - Position: After the version icon span

- [ ] 6.4 Verify approval status icon displays in CurrentProjectCard
  - Load a project with "Approved" status
  - Verify green checkmark displays in project-details
  - Load/change project to "Pending Approval"
  - Verify orange clock displays in project-details
  - Verify icon is positioned inline with other metadata

**Acceptance Criteria:**
- ApprovalStatusIcon imported and integrated
- Icon displays in project-details section
- Icon shows correct color and icon for each status
- Icon only displays when project is loaded
- Icon positioned inline with other project metadata

---

### 7. UI Components - ProjectItem (Recent Projects)

#### Task Group 7: ProjectItem Component - Recent Projects Update
**Dependencies:** Task Group 4
**Effort:** XS (Extra Small)

- [ ] 7.1 Import ApprovalStatusIcon into ProjectItem component
  - File: `src/renderer/react/components/ProjectItem.tsx`
  - Add import: `import ApprovalStatusIcon from './ApprovalStatusIcon';`

- [ ] 7.2 Add approvalStatus to recent project type definition
  - File: `src/renderer/react/components/ProjectItem.tsx`
  - Update RecentProject interface to include: `approvalStatus?: string;`
  - Default handling in component: use `project.approvalStatus || "Pending Approval"`

- [ ] 7.3 Add ApprovalStatusIcon span to recent project-meta-row
  - File: `src/renderer/react/components/ProjectItem.tsx`
  - Location: Within recent projects JSX, inside `<div className="project-meta-row">`, after project-date span
  - JSX:
    ```jsx
    <span className="project-detail">
      <ApprovalStatusIcon status={project.approvalStatus || "Pending Approval"} />
    </span>
    ```
  - For recent projects: `project.approvalStatus`

- [ ] 7.4 Verify approval status icon displays in recent projects list
  - Navigate to recent projects list
  - Verify each project displays approval status icon
  - Verify correct icon and color for each project's status
  - Verify icon positioned inline with date and other metadata

**Acceptance Criteria:**
- ApprovalStatusIcon displays in recent projects list
- Icon shows correct status for each project
- Icon positioned inline with project metadata
- RecentProject interface updated with approvalStatus field

---

### 8. UI Components - ProjectItem (Saved Projects)

#### Task Group 8: ProjectItem Component - Saved Projects Update
**Dependencies:** Task Group 4
**Effort:** XS (Extra Small)

- [ ] 8.1 Add approvalStatus to saved project type definition
  - File: `src/renderer/react/components/ProjectItem.tsx`
  - Update SavedProject interface to include: `project: { ..., approvalStatus?: string; }`
  - Default handling: `savedProject.project.approvalStatus || "Pending Approval"`

- [ ] 8.2 Add ApprovalStatusIcon span to saved project-meta-row
  - File: `src/renderer/react/components/ProjectItem.tsx`
  - Location: Within saved projects JSX, inside `<div className="project-meta-row">`, after project-date span
  - JSX:
    ```jsx
    <span className="project-detail">
      <ApprovalStatusIcon status={savedProject.project.approvalStatus || "Pending Approval"} />
    </span>
    ```
  - For saved projects: `savedProject.project.approvalStatus`

- [ ] 8.3 Verify approval status icon displays in saved projects list
  - Navigate to saved projects / file browser
  - Verify each project displays approval status icon
  - Verify correct icon and color for each project's status
  - Verify icon positioned inline with date and other metadata

**Acceptance Criteria:**
- ApprovalStatusIcon displays in saved projects list
- Icon shows correct status for each project
- Icon positioned inline with project metadata
- SavedProject interface updated with approvalStatus field

---

### 9. Persistence & JSON Serialization

#### Task Group 9: Project JSON Save/Load Integration
**Dependencies:** Task Group 2, Task Group 3
**Effort:** S (Small)

- [ ] 9.1 Update project JSON serialization to include approvalStatus
  - File: Locate project save logic (likely in `src/renderer/js/` data manager)
  - Ensure `approvalStatus` field is included in project JSON export
  - Verify field is written to JSON file alongside other project metadata
  - Default value if not set: `"Pending Approval"`

- [ ] 9.2 Update project JSON deserialization to load approvalStatus
  - File: Locate project load logic (likely in data manager)
  - When loading project from JSON:
    - If `approvalStatus` field exists: load value
    - If field missing: default to `"Pending Approval"` (backward compatibility)
  - Ensure field is available in project object after load

- [ ] 9.3 Test save/load cycle with approval status
  - Create new project with approval status "Approved"
  - Save project to JSON file
  - Reload project from file
  - Verify approvalStatus "Approved" persists
  - Test with "Pending Approval" status
  - Test old project file without approvalStatus field (should default to "Pending Approval")

- [ ] 9.4 Verify backward compatibility with existing projects
  - Load project from before this feature (no approvalStatus field)
  - Verify it defaults to "Pending Approval" gracefully
  - Verify no errors or warnings in console
  - Save and reload to confirm persistence

**Acceptance Criteria:**
- approvalStatus field included in project JSON serialization
- approvalStatus loaded correctly from JSON files
- Missing field defaults to "Pending Approval" (backward compatible)
- Save/load cycle preserves approval status correctly
- No errors when loading old projects

---

### 10. Pattern Enforcement & Testing

#### Task Group 10: Pattern Validation & Feature Test Execution
**Dependencies:** Task Groups 1-9
**Effort:** M (Medium)

This task group brings everything together and validates the implementation.

- [ ] 10.1 Run pattern-enforcer to verify State/Actions/Dispatcher pattern
  - Execute: `node agents/pattern-enforcer.js`
  - Verify that:
    - All business logic is in ProjectsActions (not in components)
    - All state updates go through store methods (not direct mutations)
    - Components use Zustand hooks for state (useStore, useProjectActions)
    - No direct window.appStore mutations in components
  - Fix any pattern violations found
  - Confirm enforcer reports 100% compliance

- [ ] 10.2 Run Cucumber feature tests for approval status
  - Execute: `npx cucumber-js features/approval-status.feature`
  - All 12+ scenarios should pass
  - Verify:
    - User can set approval status in Phases Configuration
    - Status persists after save/reload
    - Icons display correctly in all three project card locations
    - New projects default to "Pending Approval"
    - Old projects without field default correctly
    - Tooltips show correct text
    - Status change marks project dirty

- [ ] 10.3 Run related feature tests to ensure no regressions
  - Execute: `npx cucumber-js features/` (or specific related features)
  - Run tests for:
    - Project management workflows
    - Phases Configuration
    - Project card displays
    - Save/load operations
  - Verify no existing functionality is broken
  - All tests should pass

- [ ] 10.4 Verify end-to-end user workflow
  - Manual testing workflow:
    1. Create new project (defaults to "Pending Approval")
    2. Verify approval status icon shows orange clock
    3. Open Phases Configuration, change to "Approved"
    4. Verify approval status icon changes to green checkmark
    5. Save project
    6. Reload project
    7. Verify approval status persists as "Approved"
    8. Check approval status displays in:
       - CurrentProjectCard
       - RecentProjectsList
       - SavedProjectsList
    9. Verify all icons show correct color and symbol
    10. Verify tooltips display correct text

- [ ] 10.5 Document implementation and create pull request
  - Update CHANGELOG.md with feature summary
  - Create entry describing:
    - New approval status field added to projects
    - ApprovalStatusSelector component in Phases Configuration
    - ApprovalStatusIcon component for visual display
    - Store and Actions integration
    - Backward compatibility notes
  - Prepare PR summary for code review

**Acceptance Criteria:**
- Pattern-enforcer confirms 100% State/Actions/Dispatcher compliance
- All Cucumber feature tests pass (12+ scenarios)
- No regressions in related feature tests
- End-to-end manual testing passes all 10 workflow steps
- CHANGELOG updated with feature summary
- All code follows CLAUDE.md architectural constraints

---

## Execution Order (Recommended)

The tasks should be executed in this order to maintain dependencies and follow TDD principles:

1. **Test Definition Phase** (Task Group 1)
   - Create feature file and scenarios first
   - Define step definitions and page objects
   - Ensures all behaviors are specified before implementation

2. **Data Model Phase** (Task Group 2)
   - Add approvalStatus field to store
   - Implement store setter method
   - Foundation for all subsequent components

3. **Actions Phase** (Task Group 3)
   - Implement updateApprovalStatus action
   - Expose through custom hook
   - Business logic layer ready for components

4. **Reusable Components Phase** (Task Group 4)
   - Create ApprovalStatusIcon component
   - Create ApprovalStatusSelector component
   - Reusable UI elements ready for integration

5. **Component Integration Phase** (Task Groups 5-8)
   - Update PhasesManager (Phases Configuration)
   - Update CurrentProjectCard
   - Update ProjectItem for recent projects
   - Update ProjectItem for saved projects
   - UI integration complete

6. **Persistence Phase** (Task Group 9)
   - Implement JSON serialization
   - Implement JSON deserialization with backward compatibility
   - Data persistence verified

7. **Testing & Validation Phase** (Task Group 10)
   - Run Cucumber tests
   - Verify pattern compliance
   - Run end-to-end testing
   - Document and prepare PR

---

## Key Implementation Patterns

### State/Actions/Dispatcher Pattern (CLAUDE.md Enforced)

**Approval Status Update Flow:**
```
React Component (ApprovalStatusSelector UI)
  ↓
Custom Hook (useProjectActions.updateApprovalStatus)
  ↓
ProjectsActions Class (updateApprovalStatus method)
  ↓
Zustand Store (setProjectApprovalStatus)
  ↓
State Update + markDirty() for auto-save
  ↓
Re-render Components via useStore hook
```

**Component receives data:**
```
useStore(state => ({
  approvalStatus: state.currentProject?.project?.approvalStatus || "Pending Approval"
}))
```

**Component calls actions:**
```
const { updateApprovalStatus } = useProjectActions();
updateApprovalStatus("Approved"); // Call action
```

### Color Codes Reference
- Approved: Green `#4CAF50`
- Pending Approval: Orange `#FF9800`

### Font Awesome Icons
- Approved: `fas fa-check-circle`
- Pending Approval: `fas fa-clock`

---

## File References

### Files to Create
- `features/approval-status.feature`
- `cucumber/step-definitions/approval-status.steps.js`
- `src/renderer/react/components/ApprovalStatusIcon.tsx`
- `src/renderer/react/components/ApprovalStatusSelector.tsx`

### Files to Modify
- `src/renderer/react/components/PhasesManager.tsx`
- `src/renderer/react/components/CurrentProjectCard.tsx`
- `src/renderer/react/components/ProjectItem.tsx`
- `src/renderer/react/actions/ProjectsActions.ts`
- `src/renderer/react/hooks/useProjectActions.ts`
- `src/renderer/js/store/app-store.js`
- `cucumber/page-objects/phasesConfigPage.js`
- `cucumber/page-objects/projectCardsPage.js`
- Project JSON serialization/deserialization logic
- `CHANGELOG.md` (when feature is complete)

---

## Auto-Workflow Integration

During implementation, use the auto-workflow system as described in CLAUDE.md:

**For test creation:**
```bash
node agents/auto-workflow.js test-update "project approval status"
```

**For feature implementation:**
```bash
node agents/auto-workflow.js feature "project approval status"
```

**For bugfixes (if needed):**
```bash
node agents/auto-workflow.js bugfix "approval status [issue description]"
```

The auto-workflow will:
- Automatically create Cucumber test scenarios
- Ensure State/Actions/Dispatcher pattern compliance
- Generate step definitions
- Trigger pattern-enforcer validation
- Manage CHANGELOG updates

---

## Success Metrics

The feature is complete and ready for production when:

1. All Cucumber scenarios pass (12+ tests covering user workflows)
2. Pattern-enforcer reports 100% State/Actions/Dispatcher compliance
3. No regressions in existing tests
4. All three project card locations display approval status icon correctly
5. Dropdown selector in Phases Configuration works without errors
6. Status changes persist across save/load cycles
7. Backward compatibility: old projects default to "Pending Approval"
8. Icon colors match specification (#4CAF50 green, #FF9800 orange)
9. Tooltips display correct status text on hover
10. Auto-save triggered when status is changed
11. Manual end-to-end workflow passes all steps
12. CHANGELOG documented with feature summary
