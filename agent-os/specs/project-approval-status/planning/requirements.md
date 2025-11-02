# Spec Requirements: Project Approval Status

## Initial Description

Add a Project Approval Status feature to the Software Estimation Manager that allows project managers to track and display the approval state of projects throughout the application. The feature enables marking projects as either "Approved" or "Pending Approval", with visual indicators displayed prominently in project cards and a control dropdown in the Phases Configuration page.

## Requirements Discussion

### First Round Questions

**Q1:** Where should the approval status primarily be configured?
**Answer:** In the Project Phases Configuration page (phases-controls section), as the first element in the phases-controls div before the supplier-selector dropdowns, using a similar structure to existing supplier dropdown selectors.

**Q2:** How should the approval status be visually represented in project cards?
**Answer:** Using Font Awesome icons:
- Green checkmark (fas fa-check-circle) for "Approved"
- Orange clock (fas fa-clock) for "Pending Approval"
- Colors: Green (#4CAF50) for Approved, Orange (#FF9800) for Pending Approval
- Include tooltips showing "Approved" or "Pending Approval"

**Q3:** Where should the approval status display appear on project cards?
**Answer:** Add as a new span element within the project-meta-row section (alongside version and date information) in these three locations:
1. CurrentProjectCard component
2. RecentProjectsList (via ProjectItem component)
3. SavedProjectsList/File Browser (via ProjectItem component)

**Q4:** Should the approval status affect project operations (save, load, delete)?
**Answer:** No - approval status is informational only and does not restrict any project operations. Projects can be saved, loaded, and closed regardless of approval state.

**Q5:** Should projects have a default approval status when created?
**Answer:** Yes - new projects default to "Pending Approval". Users can change this to "Approved" in the Phases Configuration.

**Q6:** Is there any workflow or multi-step approval process?
**Answer:** No - simple two-state toggle: "Approved" or "Pending Approval". No approval chains, notifications, or workflow steps.

### Existing Code to Reference

**Similar Features Identified:**
- Component: SupplierSelectors - Path: `src/renderer/react/components/SupplierSelectors.tsx`
  - Use as pattern for dropdown control in Phases Configuration
  - Same styling and structure as resource type selector dropdowns

- Component: ProjectItem - Path: `src/renderer/react/components/ProjectItem.tsx`
  - Shows project meta information (version, dates, file size)
  - Pattern for adding approval status display alongside existing metadata

- Component: CurrentProjectCard - Path: `src/renderer/react/components/CurrentProjectCard.tsx`
  - Shows project details with icons and metadata
  - Pattern for icon + tooltip implementation

- Store: app-store.js - Path: `src/renderer/js/store/app-store.js`
  - Zustand store structure for project state
  - Location to add approvalStatus field to project data model

### Follow-up Questions

No follow-up questions needed - all requirements clarified.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Specifications (from user's answers):
- Icon for "Approved": Font Awesome `fas fa-check-circle`
- Icon for "Pending Approval": Font Awesome `fas fa-clock`
- Color for Approved: Green (#4CAF50)
- Color for Pending Approval: Orange (#FF9800)
- Tooltip text: "Approved" or "Pending Approval"
- Display location: Inline with project metadata (project-meta-row)
- Placement in Phases Configuration: First element in phases-controls div

## Requirements Summary

### Functional Requirements

1. **Add Approval Status Field to Projects**
   - Projects have two approval states: "Approved" or "Pending Approval"
   - Default state for new projects: "Pending Approval"
   - State persists in project JSON files

2. **Approval Status Control in Phases Configuration**
   - Add dropdown selector in PhasesManager (phases-controls div) as first element before SupplierSelectors
   - Dropdown labeled "Project Approval Status" with options: "Pending Approval", "Approved"
   - Matches styling and pattern of existing supplier-selector dropdowns
   - Saves change immediately to store and marks project as dirty for auto-save

3. **Approval Status Display in Project Cards**
   - CurrentProjectCard: Add approval status icon in project-meta-row
   - ProjectItem (RecentProjectsList): Add approval status icon in project-meta-row
   - ProjectItem (SavedProjectsList): Add approval status icon in project-meta-row
   - Icon with tooltip on hover showing "Approved" or "Pending Approval"

4. **Visual Design**
   - Green checkmark icon (fas fa-check-circle #4CAF50) for Approved
   - Orange clock icon (fas fa-clock #FF9800) for Pending Approval
   - Icons appear inline with existing project metadata
   - Tooltip text: "Approved" or "Pending Approval"

5. **Data Persistence**
   - approvalStatus field included in project JSON structure
   - Loaded when project opens
   - Saved with project data

### UI Implementation Points

#### 1. PhasesManager Component
- File: `src/renderer/react/components/PhasesManager.tsx`
- Location: Line ~171, within `<div className="phases-controls">`
- Add new ApprovalStatusSelector component as first child before SupplierSelectors
- Receives current approval status from store
- Calls action to update approval status on change

#### 2. CurrentProjectCard Component
- File: `src/renderer/react/components/CurrentProjectCard.tsx`
- Location: Line ~62-75, within `<div className="project-meta-row">`
- Add new span with approval status icon and tooltip
- Displays based on currentProject.approvalStatus

#### 3. ProjectItem Component
- File: `src/renderer/react/components/ProjectItem.tsx`
- Locations:
  - Recent projects: Line ~99-104, within `<div className="project-meta-row">`
  - Saved projects: Line ~135-141, within `<div className="project-meta-row">`
- Add new span with approval status icon and tooltip
- Displays based on project.approvalStatus (for both recent and saved types)

### Reusability Opportunities

1. **ApprovalStatusSelector Component** (new)
   - Reusable dropdown component for selecting approval status
   - Can be used in other contexts requiring approval status selection
   - Modeled after SupplierSelectors pattern

2. **ApprovalStatusIcon Component** (new)
   - Reusable icon + tooltip display component
   - Can be extracted for use in other project displays
   - Handles icon selection, color, and tooltip rendering

3. **ProjectActions.ts** (extend existing)
   - Add updateProjectApprovalStatus() method
   - Follows existing pattern in Actions classes
   - Updates store and marks dirty for auto-save

4. **Store Methods** (extend app-store.js)
   - Add updateProjectApprovalStatus() setter
   - Consistent with existing project update patterns

### Technical Requirements

#### 1. Data Model Changes
- Add `approvalStatus: string` field to Project object
  - Default value: "Pending Approval"
  - Allowed values: "Approved", "Pending Approval"
- Located in project JSON at: `project.approvalStatus`

#### 2. Store Changes (app-store.js)
- Extend currentProject to include approvalStatus field
- Add store method: `setProjectApprovalStatus(status: string): void`
  - Updates currentProject.approvalStatus
  - Calls markDirty() for auto-save

#### 3. Actions Changes
- Create new ProjectApprovalActions class (or add to ProjectActions)
- Method: `updateApprovalStatus(projectId: string, status: string): void`
  - Validates status is "Approved" or "Pending Approval"
  - Updates store via setProjectApprovalStatus()
  - Marks project as dirty

#### 4. Component Changes Required
1. **PhasesManager.tsx**
   - Import ApprovalStatusSelector component
   - Add to phases-controls div as first element
   - Wire up change handler to update store

2. **ApprovalStatusSelector.tsx** (new component)
   - Dropdown selector for approval status
   - Props: currentStatus, onStatusChange
   - Returns to-be-styled select element

3. **CurrentProjectCard.tsx**
   - Add ApprovalStatusIcon to project-meta-row
   - Pass currentProject.approvalStatus

4. **ProjectItem.tsx**
   - Add ApprovalStatusIcon to both recent and saved project-meta-rows
   - Pass project.approvalStatus (for recent) or project.project.approvalStatus (for saved)

5. **ApprovalStatusIcon.tsx** (new component)
   - Props: status ("Approved" or "Pending Approval")
   - Renders icon with tooltip
   - Classes for styling icon color

#### 5. JSON Persistence
- Ensure approvalStatus is included in project JSON export
- Ensure approvalStatus is loaded when project is opened
- Default to "Pending Approval" if field missing (backward compatibility)

### Scope Boundaries

**In Scope:**
- Add approvalStatus field to project data model with "Approved" / "Pending Approval" states
- Create approval status dropdown control in Phases Configuration (phases-controls div)
- Display approval status icons in all three project card displays (CurrentProjectCard, RecentProjectsList, SavedProjectsList)
- Implement visual design with green checkmark for Approved, orange clock for Pending Approval
- Full data persistence via JSON storage
- Auto-save integration (mark dirty on status change)
- Zustand store integration with new state field and setters

**Out of Scope:**
- Approval workflows or multi-step approvals
- Approval notifications or alerts
- Approval history or audit trail
- Restricting operations based on approval status
- Integration with external approval systems
- Role-based approval restrictions
- Email notifications on approval status changes
- Batch approval operations
- Approval comments or notes

### Technical Considerations

1. **Integration with Existing State Management**
   - Follow State/Actions pattern enforced in CLAUDE.md
   - All business logic in Actions classes, zero in components
   - Store updates only through Actions
   - Mark dirty after state changes for auto-save

2. **Component Architecture**
   - Follow presentation-only component pattern
   - Use Zustand hooks (useStore) for state
   - Use custom hooks (useProjectActions, etc.) for actions
   - No business logic in components

3. **Styling Consistency**
   - Match existing icon colors and spacing
   - Use Font Awesome icons already in project
   - Inline styles or CSS modules consistent with app styling
   - Responsive design for different screen sizes

4. **Backward Compatibility**
   - Handle missing approvalStatus field when loading old projects
   - Default to "Pending Approval" for projects without field
   - Ensure existing JSON projects still load correctly

5. **Accessibility**
   - Icon tooltips provide text alternative
   - Sufficient color contrast (green #4CAF50, orange #FF9800 on dark background)
   - Semantic HTML for dropdown selector

### Success Criteria

1. Users can view approval status on all project card displays
2. Users can change approval status in Phases Configuration dropdown
3. Approval status displays correctly with appropriate icon and color
4. Status change is saved automatically (dirty flag set)
5. Tooltips display correct text on icon hover
6. Status persists across sessions (JSON persistence)
7. New projects default to "Pending Approval"
8. Old projects without status field default to "Pending Approval"
9. All components follow State/Actions pattern (zero business logic in UI)
10. Feature integrates seamlessly with existing project management workflows

