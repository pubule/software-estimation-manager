# Specification: Project Approval Status

## Goal

Enable project managers to track and display the approval state of projects throughout the application by adding an approval status field ("Approved" or "Pending Approval") with visual indicators in project cards and a configuration control in the Phases Configuration page.

## User Stories

- As a Project Manager, I want to mark a project as "Approved" or "Pending Approval" in the Phases Configuration so that team members can quickly see the approval state of projects.
- As a team member, I want to see the approval status of projects in project cards (current project, recent projects, and saved projects) with a visual icon and tooltip so that I understand the approval status at a glance.

## Specific Requirements

**Data Model Addition**
- Add `approvalStatus: string` field to project data structure with two allowed values: "Approved" and "Pending Approval"
- Default value for new projects: "Pending Approval"
- Persist in JSON project files and load/save through existing project data flow
- Implement backward compatibility: default to "Pending Approval" for existing projects missing this field

**Approval Status Control in Phases Configuration**
- Create new ApprovalStatusSelector component with dropdown UI
- Add as first element in `phases-controls` div (before SupplierSelectors component)
- Dropdown labeled "Project Approval Status" with two options: "Pending Approval" and "Approved"
- Match styling and structure of existing SupplierSelectors component
- onChange handler calls ProjectsActions to update store and mark project dirty for auto-save
- Receive current approval status from Zustand store via useStore hook

**Approval Status Display in Project Cards**
- Add approval status icon display in CurrentProjectCard component within project-details section (alongside created, modified, version)
- Add approval status icon display in ProjectItem component for recent projects within project-meta-row
- Add approval status icon display in ProjectItem component for saved projects within project-meta-row
- Icon behavior: Green checkmark (fas fa-check-circle, #4CAF50) for "Approved", Orange clock (fas fa-clock, #FF9800) for "Pending Approval"
- Include title attribute (tooltip) displaying "Approved" or "Pending Approval"

**Visual Design Implementation**
- Create reusable ApprovalStatusIcon component for icon + tooltip display
- Icon colors: Green (#4CAF50) for Approved, Orange (#FF9800) for Pending Approval
- Font Awesome icons: fas fa-check-circle (Approved), fas fa-clock (Pending Approval)
- Icons rendered inline with existing project metadata, same spacing and styling pattern
- Tooltips appear on hover showing approval status text

**Store Integration (Zustand - app-store.js)**
- Add `approvalStatus: string` to project object within currentProject state
- Create store method: `setProjectApprovalStatus(status: string)` that updates currentProject.approvalStatus and calls markDirty()
- Ensure approvalStatus field initializes to "Pending Approval" when setProject() is called with new projects
- Include approvalStatus in state reset logic when projects are switched/loaded

**Actions Implementation (ProjectsActions or ProjectApprovalActions)**
- Create method `updateApprovalStatus(status: string)` or extend existing ProjectActions
- Validate status value is either "Approved" or "Pending Approval"
- Call store method setProjectApprovalStatus() to update state
- Mark project as dirty through store to trigger auto-save
- Include error handling for invalid status values

**Component Changes - CurrentProjectCard**
- Import ApprovalStatusIcon component
- Add span element in project-details section (after version detail)
- Pass currentProject.approvalStatus to ApprovalStatusIcon
- Conditionally render only if currentProject exists

**Component Changes - ProjectItem**
- Import ApprovalStatusIcon component
- For recent projects: add span in project-meta-row after project-date, pass recentProject.approvalStatus
- For saved projects: add span in project-meta-row after project-date, pass savedProject.project.approvalStatus
- Both instances pass status to ApprovalStatusIcon for consistent rendering

**Component Changes - PhasesManager**
- Import ApprovalStatusSelector component
- Add as first child element inside phases-controls div (before SupplierSelectors)
- Receive currentProject approval status from store via useStore hook
- Wire onChange handler to call updateApprovalStatus action through useProjectActions hook

**JSON Persistence and Data Flow**
- Approval status included in project JSON serialization/deserialization
- Loaded when project file is opened (no special handling needed beyond existing project load flow)
- Saved with project data in standard save operations
- Default initialization: new projects created through UI default to "Pending Approval"
- Missing field handling: existing projects without approvalStatus field default to "Pending Approval" during load

**Integration with Existing State/Actions Pattern**
- Follow CLAUDE.md enforced State/Actions/Dispatcher pattern
- All business logic in Actions classes, zero logic in UI components
- Components receive data via Zustand hooks (useStore) and call actions through custom hooks (useProjectActions)
- No direct state mutations - all updates through store methods
- Auto-save integration: markDirty() called after approval status change

## Visual Design

No external visual mockups were provided. Visual specifications derived from requirements discussion:

**Icon and Color Scheme**
- Approved state: Green checkmark icon (Font Awesome `fas fa-check-circle`)
  - Color: Green #4CAF50
  - Tooltip text: "Approved"
- Pending Approval state: Orange clock icon (Font Awesome `fas fa-clock`)
  - Color: Orange #FF9800
  - Tooltip text: "Pending Approval"

**Placement in UI**
- Phases Configuration: ApprovalStatusSelector dropdown as first control in phases-controls div
- Project Cards: Approval status icon rendered inline with existing metadata in project-meta-row sections
- Consistent positioning across CurrentProjectCard, RecentProjectsList (ProjectItem), and SavedProjectsList (ProjectItem)

## Existing Code to Leverage

**SupplierSelectors Component** (`src/renderer/react/components/SupplierSelectors.tsx`)
- Pattern for dropdown selector control UI
- Use as model for ApprovalStatusSelector component structure
- Same styling, label pattern, and onChange handler architecture
- Located in phases-controls div - new component will be adjacent
- Props pattern: state value received, onChanged handler callback

**ProjectItem Component** (`src/renderer/react/components/ProjectItem.tsx`)
- Shows project metadata (version, dates, file size) in project-meta-row
- Pattern for adding approval status icon alongside existing metadata
- Handles both recent projects (RecentProject interface) and saved projects (SavedProject interface)
- Demonstrates icon + text metadata display pattern for both project types
- Import pattern for components and data access patterns

**CurrentProjectCard Component** (`src/renderer/react/components/CurrentProjectCard.tsx`)
- Shows project details with icons and metadata inline
- Pattern for icon + tooltip implementation (example: fas fa-calendar, fas fa-edit icons)
- Uses useStore hook to access currentProject data from Zustand
- project-details section shows how to add new metadata spans alongside existing ones
- Demonstrates conditional rendering based on project existence

**Zustand Store Pattern** (`src/renderer/js/store/app-store.js`)
- Store structure: currentProject object contains project data
- Method pattern: setProject() for major updates, updateProject() for field changes
- Mark dirty pattern: markDirty() called after state updates for auto-save integration
- State reset pattern: clean state initialized in setProject() when switching projects
- Store methods return void, use set() for state updates

**Custom Hooks Pattern** (`src/renderer/react/hooks/useStore.ts`, `usePhasesActions.ts`, etc.)
- useStore(state => ({ ...state selectors })) pattern for accessing store state
- Custom hook pattern: useProjectActions, usePhasesActions provide action methods to components
- Hooks use useCallback for memoization of action methods
- Action hooks access store via (window as any).appStore and (window as any).app patterns

**App Store Method Pattern** (from ProjectsActions.ts and similar)
- Actions classes access store via getStore() method returning window.appStore
- Store getter syntax: (window as any).appStore.getState() for reading state
- Store setter syntax: (window as any).appStore via set() function passed to createStore
- Error handling patterns: try/catch with proper error propagation

## Out of Scope

- Approval workflows or multi-step approval processes
- Approval notifications or alerts to team members
- Approval history or audit trail tracking past approval changes
- Restricting project operations (save, load, delete) based on approval status
- Integration with external approval systems or services
- Role-based approval restrictions or permissions
- Email notifications on approval status changes
- Batch approval operations for multiple projects
- Approval comments, notes, or justifications
- Approval deadlines or SLA tracking

---

## Implementation Guidance

### Architecture Overview

```
React Component (UI Presentation Only)
  ↓
Custom Hook (useProjectActions)
  ↓
Actions Class (ProjectsActions.updateApprovalStatus)
  ↓
Zustand Store (app-store.js: setProjectApprovalStatus)
  ↓
State Update + markDirty() for auto-save
```

### Key Files to Modify

1. **src/renderer/react/components/ApprovalStatusSelector.tsx** (NEW)
   - Dropdown selector component (model after SupplierSelectors)
   - Props: currentStatus, onStatusChange
   - Render select with "Approved" and "Pending Approval" options

2. **src/renderer/react/components/ApprovalStatusIcon.tsx** (NEW)
   - Icon + tooltip display component
   - Props: status ("Approved" | "Pending Approval")
   - Conditionally render checkmark or clock icon with appropriate color

3. **src/renderer/react/components/PhasesManager.tsx** (MODIFY)
   - Import ApprovalStatusSelector
   - Add to phases-controls div as first child element
   - Wire up change handler to actions

4. **src/renderer/react/components/CurrentProjectCard.tsx** (MODIFY)
   - Import ApprovalStatusIcon
   - Add span with approval icon in project-details section
   - Pass currentProject.approvalStatus

5. **src/renderer/react/components/ProjectItem.tsx** (MODIFY)
   - Import ApprovalStatusIcon
   - Add spans in project-meta-row for both recent and saved project types
   - Pass appropriate approvalStatus value

6. **src/renderer/react/actions/ProjectsActions.ts** (EXTEND)
   - Add method: updateApprovalStatus(status: string)
   - Validate status value
   - Call store.setProjectApprovalStatus()

7. **src/renderer/react/hooks/useProjectActions.ts** (EXTEND)
   - Export updateApprovalStatus callback from ProjectsActions
   - Use useCallback for memoization

8. **src/renderer/js/store/app-store.js** (EXTEND)
   - Add approvalStatus: "Pending Approval" to initial project state
   - Add store method: setProjectApprovalStatus(status: string)
   - Ensure approvalStatus initialized when setProject() is called

### Testing Strategy (Cucumber BDD)

**Test File: features/approval-status.feature**

Feature scenarios to implement:
- User opens Phases Configuration and sets project approval status to "Approved"
- User saves project and reopens - approval status persists as "Approved"
- User opens project with approval status "Pending Approval" - sees orange clock icon
- User opens project with approval status "Approved" - sees green checkmark icon
- User changes approval status from "Pending Approval" to "Approved" - icon updates immediately
- New project created defaults to "Pending Approval" status
- Old project file without approvalStatus field defaults to "Pending Approval" on load
- Approval status icons display in CurrentProjectCard, RecentProjectsList, and SavedProjectsList
- Changing approval status marks project dirty and triggers auto-save

**Step Definitions** (cucumber/step-definitions/)
- Steps for opening/closing Phases Configuration modal
- Steps for selecting approval status from dropdown
- Steps for saving/loading projects
- Steps for verifying icon color and tooltip text
- Steps for checking project dirty state

### Acceptance Criteria Checklist

- [ ] ApprovalStatusSelector component displays dropdown with "Approved" and "Pending Approval" options
- [ ] Selecting status in dropdown calls updateApprovalStatus action
- [ ] Update marks project dirty and triggers auto-save
- [ ] ApprovalStatusIcon component renders correct icon for each status
- [ ] Green checkmark (#4CAF50) displays for "Approved" status
- [ ] Orange clock (#FF9800) displays for "Pending Approval" status
- [ ] Tooltips display "Approved" or "Pending Approval" text on hover
- [ ] CurrentProjectCard displays approval icon in project-details section
- [ ] ProjectItem displays approval icon for recent projects
- [ ] ProjectItem displays approval icon for saved projects
- [ ] New projects default to "Pending Approval" status
- [ ] Existing projects without approvalStatus field default to "Pending Approval"
- [ ] Approval status persists in JSON project files
- [ ] Status loaded correctly when project is opened
- [ ] Cucumber tests pass (user scenarios)
- [ ] Pattern enforcer validates State/Actions/Dispatcher pattern compliance
- [ ] No business logic in React components

### Edge Cases and Considerations

1. **Backward Compatibility**: Projects saved before this feature are missing approvalStatus field. During project load, check if field exists; if missing, initialize to "Pending Approval".

2. **State Synchronization**: When project is changed/switched, ensure approvalStatus is properly reset in clean state initialization in store's setProject() method.

3. **Type Safety**: Validate approval status values are only "Approved" or "Pending Approval". Reject invalid values in Actions class.

4. **Component Re-renders**: Ensure ApprovalStatusIcon is a pure functional component that re-renders only when status prop changes.

5. **Null Handling**: Handle case where currentProject is null or approvalStatus is undefined - should not render icon or render with default tooltip.

6. **Auto-save Timing**: markDirty() is called immediately after status change; auto-save mechanism should persist within normal 2-minute interval.

---

## Success Criteria

Implementation is complete when:

1. Approval status field added to project data model with default value "Pending Approval"
2. ApprovalStatusSelector component displays in Phases Configuration as first control
3. User can change approval status and see immediate update in store
4. Approval status persists across save/load cycles via JSON storage
5. Approval icons display correctly in all three project card locations
6. Green checkmark icon appears for "Approved" status with #4CAF50 color
7. Orange clock icon appears for "Pending Approval" status with #FF9800 color
8. Tooltips display correct text on hover
9. Cucumber tests pass for all user scenarios
10. Pattern enforcer confirms State/Actions/Dispatcher pattern compliance
11. No business logic exists in React components
12. Backward compatibility: existing projects without field default correctly
13. Feature integrates seamlessly with existing project management workflows
