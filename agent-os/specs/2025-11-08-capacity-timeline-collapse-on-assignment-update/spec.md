# Specification: Capacity Timeline Collapse on Assignment Update

## Goal
Fix UI refresh issue in Capacity Timeline by collapsing all chevrons and clearing localStorage expansion state when assignments are created or updated via modal, ensuring the timeline properly re-renders with updated allocation data.

## User Stories
- As a capacity manager, I want all timeline chevrons to collapse automatically after creating/updating assignments so that the UI refreshes correctly with the new allocation data
- As a user, I want the timeline to reset to its initial collapsed state after modal saves so that I can see the updated allocations without manual refresh

## Specific Requirements

**Collapse All Chevrons on Modal Save**
- ALL member-level chevrons must collapse when "Update Assignment" or "Create Assignment" button is clicked
- ALL project-level chevrons must collapse (nested phase breakdown rows)
- Collapse triggers immediately on button click, not waiting for save completion
- Existing `refresh()` method call already handles data reload and component re-render
- No collapse should occur if modal is cancelled or closed without saving

**localStorage State Reset**
- Clear ALL localStorage entries matching pattern `timeline-expanded-*` (member expansion states)
- Clear ALL localStorage entries matching pattern `timeline-projects-expanded-*` (project expansion states)
- Reset must be complete so timeline behaves as if opened for the first time
- Reset occurs before `refresh()` call in `handleSave` method
- Use iteration over localStorage keys to find and remove matching entries

**Implementation in CapacityTimeline Component**
- Modify `handleSave()` method in `src/renderer/react/components/CapacityTimeline.tsx` at lines 108-113
- Add localStorage cleanup logic immediately after method entry, before calling `refresh()`
- Create helper function `collapseAllTimelineChevrons()` to iterate localStorage keys and remove matches
- Log cleanup action to console for debugging: "All timeline chevron states cleared from localStorage"
- No changes needed to AssignmentModal component (already calls `onSave` correctly)

**Edge Case: Inline Editing Must Not Trigger Collapse**
- Inline phase MD edits via `handlePhaseMDChange` in ExpandableTimelineRow must not trigger collapse
- Inline edits do NOT call `handleSave` on CapacityTimeline parent (they use local `loadMemberAllocations`)
- Existing code architecture already prevents inline edits from triggering collapse
- No additional guard logic needed

**Edge Case: Failed Saves Must Not Trigger Collapse**
- If AssignmentModal validation fails, `onSave` callback is never invoked
- If save operation returns `success: false`, `onSave` callback is never invoked (lines 786-795 in AssignmentModal)
- Therefore, `handleSave` never executes and collapse never happens
- No additional error handling needed

**Leverage Existing Component Architecture**
- ExpandableTimelineRow components load expansion state from localStorage on mount (lines 115-133)
- When localStorage keys are cleared and `refresh()` triggers re-render, components default to collapsed state
- Member expansion defaults to `false` when localStorage key not found (line 116-119)
- Project expansion defaults to empty Set when localStorage key not found (line 124-132)
- Reuse existing reset pattern from section navigation logic (lines 135-164 in ExpandableTimelineRow)

**State Management Pattern Compliance**
- Follow React Component → Actions → Store pattern per CLAUDE.md guidelines
- No business logic in CapacityTimeline component, only UI coordination
- localStorage cleanup is UI state management, not business logic
- Zustand store handles allocation data updates via `refresh()` method
- Component re-renders triggered by useCapacityTimeline hook's data refresh

**Testing via Cucumber BDD**
- Test scenario: Create assignment with expanded chevrons → all collapse after save
- Test scenario: Update assignment with expanded chevrons → all collapse after save
- Test scenario: Inline edit phase MD with expanded chevrons → chevrons remain expanded
- Test scenario: Modal cancel with expanded chevrons → chevrons remain expanded
- Test scenario: Save failure with expanded chevrons → chevrons remain expanded
- Verify localStorage cleanup: check keys after successful save
- Verify two-level collapse: both member-level AND project-level chevrons

**Performance Considerations**
- localStorage iteration over all keys is acceptable (typically small key set in browser)
- Clearing expansion state before refresh prevents race conditions
- Component re-mount with cleared localStorage is faster than programmatic state updates
- No need for refs or direct DOM manipulation

**No Changes to Other Components**
- AssignmentModal.tsx: No changes required (already calls `onSave` correctly on lines 786-790)
- ExpandableTimelineRow.tsx: No changes required (already loads from localStorage on mount)
- TimelineHeader.tsx: No changes required (not involved in modal save flow)
- useCapacityTimeline.ts: No changes required (refresh method already works correctly)

## Visual Design
No visual mockups provided. This is a behavioral fix to existing UI.

## Existing Code to Leverage

**ExpandableTimelineRow localStorage Loading Pattern (lines 115-133)**
- On component mount, attempts to load expansion state from localStorage using member ID as key
- Member expansion: `localStorage.getItem('timeline-expanded-${member.id}')` returns 'true' or null
- Project expansion: `localStorage.getItem('timeline-projects-expanded-${member.id}')` returns JSON array or null
- Defaults to collapsed state (false/empty Set) when keys not found
- This pattern ensures that clearing localStorage causes automatic collapse on next render

**ExpandableTimelineRow Section Navigation Reset (lines 135-164)**
- Already implements identical localStorage cleanup when leaving capacity section
- Monitors store subscription to detect section changes
- Clears `timeline-expanded-*` and `timeline-projects-expanded-*` keys on section exit
- Provides proven pattern for our modal save scenario
- Code at lines 153-154 is exact logic to replicate in CapacityTimeline.handleSave

**CapacityTimeline refresh() Method**
- Provided by useCapacityTimeline hook, already used in handleSave at line 110
- Triggers data reload from store and forces ExpandableTimelineRow components to re-render
- When components re-mount, they load from localStorage (which will be cleared)
- No modifications needed to refresh mechanism

**AssignmentModal onSave Callback Flow (lines 786-790)**
- Validates form data before calling any callbacks
- Only calls `onSave?.(result.allocation)` if save succeeds (result.success === true)
- Calls `onClose()` after onSave completes
- Our localStorage cleanup in CapacityTimeline.handleSave happens between onSave and onClose
- No changes needed to this flow

**localStorage.removeItem Pattern in ProjectsActions (line 245)**
- Shows existing codebase pattern for clearing localStorage entries
- Simple `localStorage.removeItem(key)` call is sufficient
- No error handling needed (removeItem silently ignores missing keys)
- Can iterate Object.keys(localStorage) to find matching patterns

## Out of Scope
- Changes to AssignmentModal component behavior or validation logic
- Changes to inline editing functionality (handlePhaseMDChange)
- Changes to chevron expand/collapse animation or visual behavior
- Changes to localStorage key naming conventions or structure
- Changes to ExpandableTimelineRow expansion state management logic
- Adding new collapse buttons or UI controls for manual collapse
- Changes to other timeline features (filters, navigation, statistics)
- Performance optimizations beyond localStorage cleanup
- Migration of legacy components to React (ongoing separate effort)
- Changes to Zustand store structure or allocation data models
