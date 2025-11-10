/**
 * SearchBox Component
 *
 * Search input with debouncing
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Input, makeStyles } from '@fluentui/react-components';
import { SearchRegular, DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    position: 'relative',
    width: '100%',
  },
});

interface SearchBoxProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  value?: string;
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  value: controlledValue,
}) => {
  const styles = useStyles();
  const [internalValue, setInternalValue] = useState(controlledValue || '');

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  const handleChange = useCallback(
    (_: any, data: { value: string }) => {
      if (controlledValue === undefined) {
        setInternalValue(data.value);
      }
      // If controlled, parent handles the change
    },
    [controlledValue]
  );

  const handleClear = useCallback(() => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onSearch('');
  }, [controlledValue, onSearch]);

  return (
    <div className={styles.container}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        contentBefore={<SearchRegular />}
        contentAfter={
          value && (
            <DismissRegular
              onClick={handleClear}
              style={{ cursor: 'pointer' }}
            />
          )
        }
      />
    </div>
  );
};
