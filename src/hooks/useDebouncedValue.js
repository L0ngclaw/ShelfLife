// Returns the value only after it has stopped changing for `delayMs`.
// Used for search, so we filter once the user pauses typing, not on every key.
import { useEffect, useState } from "react";

export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // a new key press cancels the old timer
  }, [value, delayMs]);

  return debounced;
}
