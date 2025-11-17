# ExpandableCardButton Component Guide

## Overview

`ExpandableCardButton` is a specialized button component for expandable/collapsible card headers used in dashboards, metrics, and alert displays.

This component consolidates scattered button patterns previously implemented with individual CSS classes:
- `.resolution-card-header` (KPI metric card headers)
- `.backlog-card-header` (KPI backlog card headers)
- `.alert-header` (Alert card headers)
- `.expand-btn` (Icon-only expand buttons)
- `.collapsible-section-header` (Collapsible section headers)

## Key Features

✅ **Type-Safe** - Full TypeScript props system
✅ **Accessible** - WCAG AA compliant (aria-expanded, aria-label, focus-visible)
✅ **Animated** - Smooth icon rotation and transitions
✅ **Themeable** - CSS variable support for dark theme
✅ **Responsive** - Mobile-friendly with proper touch targets
✅ **Reduced Motion** - Respects prefers-reduced-motion
✅ **High Contrast** - Supports high contrast mode

## Component Props

```typescript
interface ExpandableCardButtonProps {
  /** Whether the card is currently expanded */
  expanded: boolean;

  /** Callback when button is clicked */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /** Card layout type: 'kpi' | 'alert' | 'compact' */
  cardType?: CardType;

  /** Icon position: 'right' (fixed) | 'trailing' (flex) */
  iconPosition?: IconPosition;

  /** Main content to display */
  children: React.ReactNode;

  /** Optional icon element (displayed before content) */
  icon?: React.ReactNode;

  /** REQUIRED: Aria label for accessibility */
  ariaLabel: string;

  /** Additional CSS class name for styling */
  className?: string;

  /** Tooltip title attribute */
  title?: string;

  /** Custom expand icon renderer - default: (expanded) => expanded ? '▼' : '▶' */
  expandIcon?: (expanded: boolean) => React.ReactNode;
}
```

## Usage Examples

### 1. KPI Card Header (Resolution Time)

**Before (Old Pattern):**
```tsx
const [expandedResolutionCard, setExpandedResolutionCard] = useState(false);

return (
  <div className={`kpi-card ${expandedResolutionCard ? 'expanded' : ''}`}>
    <button
      className="resolution-card-header"
      onClick={() => setExpandedResolutionCard(!expandedResolutionCard)}
      aria-expanded={expandedResolutionCard}
      aria-label="Toggle resolution time details"
    >
      <div className="kpi-value">{resolutionTime}</div>
      <div className="kpi-label">Avg Resolution Time</div>
      <span className="expand-icon" aria-hidden="true">
        {expandedResolutionCard ? '▼' : '▶'}
      </span>
    </button>
    {expandedResolutionCard && <div>...</div>}
  </div>
);
```

**After (New Pattern):**
```tsx
const [expandedResolutionCard, setExpandedResolutionCard] = useState(false);

return (
  <div className={`kpi-card ${expandedResolutionCard ? 'expanded' : ''}`}>
    <ExpandableCardButton
      expanded={expandedResolutionCard}
      onClick={() => setExpandedResolutionCard(!expandedResolutionCard)}
      ariaLabel="Toggle resolution time details"
      cardType="kpi"
    >
      <div className="kpi-value">{resolutionTime}</div>
      <div className="kpi-label">Avg Resolution Time</div>
    </ExpandableCardButton>
    {expandedResolutionCard && <div>...</div>}
  </div>
);
```

**Benefits:**
- ✅ Cleaner JSX (no manual icon handling)
- ✅ Icon animation handled by component
- ✅ Type-safe props
- ✅ Consistent styling across all KPI cards

---

### 2. Backlog Card Header

```tsx
const [expandedBacklogCard, setExpandedBacklogCard] = useState(false);

return (
  <div className={`kpi-card ${expandedBacklogCard ? 'expanded' : ''}`}>
    <ExpandableCardButton
      expanded={expandedBacklogCard}
      onClick={() => setExpandedBacklogCard(!expandedBacklogCard)}
      ariaLabel="Toggle backlog details"
      cardType="kpi"
    >
      <div className="kpi-value">{backlogCount}</div>
      <div className="kpi-label">Current Backlog</div>
    </ExpandableCardButton>
    {expandedBacklogCard && <div>{/* Backlog details */}</div>}
  </div>
);
```

---

### 3. Alert Card Header

**Before:**
```tsx
<button
  className="alert-header"
  onClick={() => toggleAlert(index)}
  aria-expanded={isExpanded}
  aria-label={`${alert.title}, ${alert.count} alerts`}
>
  <span className="alert-icon">{icon}</span>
  <strong>{alert.title}</strong>
  <span className="alert-count">{alert.count}</span>
  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
</button>
```

**After:**
```tsx
<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => toggleAlert(index)}
  ariaLabel={`${alert.title}, ${alert.count} alerts`}
  cardType="alert"
  iconPosition="trailing"
  icon={<span className="alert-icon">{icon}</span>}
>
  <strong>{alert.title}</strong>
  <span className="alert-count">{alert.count}</span>
</ExpandableCardButton>
```

---

### 4. Compact Mode (Icon-only)

```tsx
<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => setExpanded(!isExpanded)}
  ariaLabel="Toggle details"
  cardType="compact"
  iconPosition="trailing"
>
  {/* Content */}
</ExpandableCardButton>
```

---

### 5. Custom Icon Renderer

```tsx
<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => setExpanded(!isExpanded)}
  ariaLabel="Toggle details"
  cardType="kpi"
  expandIcon={(expanded) => (
    <i className={`fas fa-chevron-${expanded ? 'down' : 'right'}`} />
  )}
>
  <div className="kpi-value">{value}</div>
  <div className="kpi-label">{label}</div>
</ExpandableCardButton>
```

---

## Card Type Reference

### `cardType="kpi"`
Used for KPI metric cards with value/label layout.

**Layout:**
```
┌─────────────────────────────────┐
│ Value        [icon]         ▶   │
│ Label                           │
└─────────────────────────────────┘
```

**Features:**
- Fixed-position icon on right (20px from edge)
- Column flex layout for content
- Preserves KPI value/label structure

---

### `cardType="alert"`
Used for alert cards with leading icon and multiple elements.

**Layout:**
```
┌────────────────────────────────┐
│ 🔴 Title    Count [5]    ▶     │
└────────────────────────────────┘
```

**Features:**
- Flex layout with centered alignment
- Leading icon support
- Trailing expand icon
- Proper gap spacing

---

### `cardType="compact"`
Minimal variant for simple expandable sections.

**Layout:**
```
┌─────────────────────┐
│ Content      ▶      │
└─────────────────────┘
```

---

## Icon Position Reference

### `iconPosition="right"` (Default for KPI)
Fixed-position icon on the right side.

```css
position: absolute;
right: 15px;
top: 15px;
```

Use when: Icon should be absolutely positioned regardless of content width.

---

### `iconPosition="trailing"` (Default for Alert)
Flex-based trailing icon (uses `margin-left: auto`).

```css
margin-left: auto;
position: static;
```

Use when: Icon should flex to the end of flex container.

---

## Accessibility Features

### WCAG AA Compliance

✅ **aria-expanded** - Communicates expanded/collapsed state to screen readers
✅ **aria-label** - Descriptive label for button purpose
✅ **aria-hidden** - Hides decorative expand icon from screen readers
✅ **focus-visible** - Blue outline on keyboard focus
✅ **Semantic button** - Uses native `<button>` element
✅ **Keyboard support** - Fully operable with Enter/Space keys

### Example with Full Accessibility

```tsx
<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => setExpanded(!isExpanded)}
  ariaLabel="Toggle resolution time analysis showing slowest, fastest, and average tickets"
  title="Click to expand resolution time breakdown"
  cardType="kpi"
>
  <div className="kpi-value">
    {resolutionTime}
  </div>
  <div className="kpi-label">Avg Resolution Time</div>
</ExpandableCardButton>
```

---

## Styling & Theming

### CSS Variables

The component respects these CSS variables:

```css
--expand-icon-color: #007acc;      /* Icon color */
--focus-color: #007fd4;             /* Focus outline color */
--button-hover-bg: rgba(255,255,255,0.1);  /* Hover background */
--text-color: #ffffff;              /* Text color */
```

### Dark Theme Support

Component automatically adapts to dark theme via `prefers-color-scheme: dark`.

```tsx
// Component renders correctly in dark/light themes without manual theming
<ExpandableCardButton expanded={isExpanded} onClick={toggle} ariaLabel="..." />
```

### Reduced Motion Support

When user prefers reduced motion, all transitions are disabled:

```css
@media (prefers-reduced-motion: reduce) {
  .expandable-card-button {
    transition: none; /* No animations */
  }
}
```

### High Contrast Mode

Outline width increases in high contrast mode:

```css
@media (prefers-contrast: more) {
  .expandable-card-button:focus-visible {
    outline-width: 3px; /* Thicker for visibility */
  }
}
```

---

## Migration Guide

### Step 1: Import Component

```tsx
import ExpandableCardButton from './ExpandableCardButton';
```

### Step 2: Add CSS Import (in component or main.css)

```tsx
import '../../styles/button-expandable.css';
```

### Step 3: Replace Old Pattern

**Replace this:**
```tsx
<button className="resolution-card-header" onClick={...}>
  {/* content */}
</button>
```

**With this:**
```tsx
<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => setExpanded(!isExpanded)}
  ariaLabel="Toggle resolution time details"
  cardType="kpi"
>
  {/* content */}
</ExpandableCardButton>
```

### Step 4: Remove CSS from ticket-dashboard.css

Once migrated, you can remove these old class definitions:
- `.resolution-card-header`
- `.backlog-card-header`
- `.alert-header`
- Associated focus-visible and hover states

---

## Common Patterns

### Pattern 1: State Toggle with Hook

```tsx
const [expanded, setExpanded] = useState(false);

<ExpandableCardButton
  expanded={expanded}
  onClick={() => setExpanded(!expanded)}
  ariaLabel="Toggle content"
  cardType="kpi"
>
  Content
</ExpandableCardButton>
{expanded && <div>Expanded content</div>}
```

---

### Pattern 2: Multiple Expandable Cards

```tsx
const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

const toggleCard = (cardId: string) => {
  const newSet = new Set(expandedCards);
  if (newSet.has(cardId)) {
    newSet.delete(cardId);
  } else {
    newSet.add(cardId);
  }
  setExpandedCards(newSet);
};

return (
  <>
    {cards.map(card => (
      <ExpandableCardButton
        key={card.id}
        expanded={expandedCards.has(card.id)}
        onClick={() => toggleCard(card.id)}
        ariaLabel={`Toggle ${card.title}`}
        cardType="kpi"
      >
        {card.content}
      </ExpandableCardButton>
    ))}
  </>
);
```

---

### Pattern 3: Alert Cards with Dynamic Icons

```tsx
const alertIcons = {
  critical: '🔴',
  warning: '⚠️',
  info: 'ℹ️'
};

<ExpandableCardButton
  expanded={isExpanded}
  onClick={() => setExpanded(!isExpanded)}
  ariaLabel={`${alert.type} alert: ${alert.title}`}
  cardType="alert"
  icon={<span>{alertIcons[alert.type]}</span>}
>
  <strong>{alert.title}</strong>
  <span className="count">{alert.count}</span>
</ExpandableCardButton>
```

---

## Troubleshooting

### Issue: Icon doesn't rotate
**Solution:** Ensure `cardType` is set correctly. Icon animation depends on proper class application.

```tsx
// ✓ Correct
<ExpandableCardButton cardType="kpi" expanded={true}>
```

---

### Issue: Content alignment is off
**Solution:** Use proper flex properties on child elements.

```tsx
// ✓ Correct - children are properly structured
<ExpandableCardButton cardType="kpi">
  <div className="kpi-value">{value}</div>
  <div className="kpi-label">{label}</div>
</ExpandableCardButton>
```

---

### Issue: Focus outline not visible
**Solution:** Ensure focus-visible CSS is loaded and browser supports it.

```tsx
// ✓ Add to component or global CSS
import '../../styles/button-expandable.css';
```

---

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 88+ | ✅ Full | All features supported |
| Firefox 85+ | ✅ Full | All features supported |
| Safari 14+ | ✅ Full | All features supported |
| Edge 88+ | ✅ Full | All features supported |
| IE 11 | ❌ No | Modern CSS features not supported |

---

## Performance Considerations

- ✅ No synthetic event creation
- ✅ Minimal re-renders (expanded prop controlled by parent)
- ✅ CSS animations (not JavaScript)
- ✅ No third-party dependencies
- ✅ Gzip: ~2KB (component + CSS)

---

## Files Affected

### Component Files
- `src/renderer/react/components/ExpandableCardButton.tsx` - Main component
- `src/renderer/styles/button-expandable.css` - CSS styles

### To Migrate
- `src/renderer/react/components/TicketDashboard.tsx` - Uses card headers
- `src/renderer/react/components/CollapsibleSection.tsx` - Uses collapsible pattern
- `src/renderer/styles/ticket-dashboard.css` - Contains old button classes

---

## Next Steps

1. ✅ Create ExpandableCardButton.tsx component
2. ✅ Create button-expandable.css stylesheet
3. ⏳ Migrate TicketDashboard to use component
4. ⏳ Migrate CollapsibleSection to use component
5. ⏳ Remove old CSS classes from ticket-dashboard.css
6. ⏳ Run full test suite and verify accessibility

---

## Related Components

- **Button** - Standard action buttons (src/renderer/react/components/Button.tsx)
- **CollapsibleSection** - Modern collapsible section wrapper (src/renderer/react/components/CollapsibleSection.tsx)
- **ResourceOverviewHeatmap** - Uses expandable patterns (src/renderer/react/components/ResourceOverviewHeatmap.tsx)

---

## Questions?

For questions or issues, refer to:
1. Component JSDoc comments in ExpandableCardButton.tsx
2. CSS comments in button-expandable.css
3. Usage examples in TicketDashboard.tsx migration
