# Declarative UI States

When a component or view fetches data, use dedicated state components to represent the loading, error, and empty states. This project provides standard components for this purpose:

-   `LoadingState`
-   `ErrorState`
-   `EmptyState`

## Rationale (Why)

The primary reason for this pattern is **visual consistency**. By using shared components, we ensure that all loading indicators, error messages, and empty state prompts look and feel the same across the entire application, creating a more professional and predictable user experience.

## How to Use

A component that fetches data should manage a status variable (e.g., 'loading', 'success', 'error') and render the appropriate state component.

```tsx
import { useDataFetching } from '../hooks/useDataFetching';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { DataDisplay } from '../components/DataDisplay';

const MyFeature = () => {
  const { status, data, error, refetch } = useDataFetching();

  if (status === 'loading') {
    return <LoadingState message="Fetching data..." />;
  }

  if (status === 'error') {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  if (status === 'success' && data.length === 0) {
    return <EmptyState message="No data found." />;
  }

  return <DataDisplay data={data} />;
}
```

## Rules

-   **DO** use `LoadingState` when data is being fetched.
-   **DO** use `ErrorState` when an API call or process fails.
-   **DO** use `EmptyState` when a successful fetch returns no data.
-   **DO NOT** implement custom, one-off loading spinners or error messages.

## Scope of Use

This pattern applies to **any part of the UI that fetches data**, from full pages to individual widgets or cards.
