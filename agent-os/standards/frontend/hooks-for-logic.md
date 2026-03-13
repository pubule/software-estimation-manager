# Hooks for Business Logic

In React components, business logic, data fetching, and interactions with the state store should be encapsulated within custom hooks. This pattern is preferred over having complex logic directly inside UI components.

## Rationale (Why)

1.  **Separation of Concerns**: It cleanly separates the view (JSX) from the logic. Components become simpler and focus only on rendering the UI.
2.  **Reusability**: Encapsulating logic in a hook makes it easy to reuse that same logic across multiple components, which was a key reason for adopting this pattern.
3.  **Testability**: Hooks are plain JavaScript functions, which makes them easier to unit test in isolation, independent of any rendering component.

## Example

```tsx
// good-example.tsx
import { useProjectActions } from '../hooks/useProjectActions';

const MyComponent = () => {
  // All complex logic is handled by the hook
  const { currentProject, saveProject } = useProjectActions();

  // The component is simple and declarative
  return (
    <div>
      <h1>{currentProject.name}</h1>
      <Button onClick={saveProject}>Save</Button>
    </div>
  );
}
```

## Rules

-   **DO** create a custom hook for any logic that involves fetching data, interacting with the global state store, or complex business rules.
-   **DO** use a custom hook for any logic that needs to be shared between two or more components.
-   **DO NOT** put complex data transformations, API calls, or state dispatches directly inside a component's event handlers or `useEffect` blocks.

## When to Keep Logic in a Component

It is acceptable to keep state logic directly inside a component **only if** it is simple, component-local UI state. A good rule of thumb is managing the open/closed state of a dropdown menu or the value of a single text input.
