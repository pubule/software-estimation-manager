# Standardized Components

Always prefer using a standardized, shared React component over creating a one-off component with custom styling. This project has several standard components located in `src/renderer/react/components/`.

## Key Components

-   `Button`: For all clickable actions.
-   `ExpandableCardButton`: For collapsible card headers.
-   `LoadingState`, `ErrorState`, `EmptyState`: For displaying data states.

## Rationale (Why)

1.  **Consistency**: Ensures a uniform look, feel, and behavior across the application.
2.  **Maintainability**: A single component is easier to update, fix, and theme than dozens of custom implementations. The `Button` component replaced over 30 custom button styles.
3.  **Accessibility**: Standard components have accessibility (WCAG AA) built-in, including focus management, ARIA attributes, and keyboard navigation. Enforcing accessibility and making theming easier are the primary reasons for this standard.

## Rules

-   **DO** use a standard component if one exists for your use case.
-   **DO** check the component's documentation (e.g., `BUTTON_GUIDE.md`) to see if its props can achieve the desired appearance and behavior.
-   **DO NOT** create a new component if an existing one can be configured to fit the need.
-   **AVOID** custom styling on top of standard components. Use their props (`variant`, `size`, etc.) instead.

## Exceptions

Exceptions should be rare. Only create a custom component for a highly specialized, one-off UI element that is visually and functionally unique and cannot be achieved using the props of a standard component.
