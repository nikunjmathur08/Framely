import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing URL hash parameters
 * Example: #play=abc123 -> useHashParam('play') returns 'abc123'
 */
export const useHashParam = (key: string): [string | null, (value: string | null) => void] => {
  const [value, setValue] = useState<string | null>(() => {
    // Parse initial value from URL hash
    const hash = window.location.hash;
    const match = hash.match(new RegExp(`[#&]${key}=([^&]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  });

  // Update URL hash when value changes
  const updateHash = useCallback((newValue: string | null) => {
    const currentHash = window.location.hash;
    
    if (newValue === null) {
      // Remove the parameter from hash
      const newHash = currentHash.replace(new RegExp(`[#&]${key}=[^&]*&?`), '');
      window.location.hash = newHash.replace(/[#&]$/, ''); // Clean up trailing # or &
    } else {
      // Add or update the parameter
      const encoded = encodeURIComponent(newValue);
      if (currentHash.includes(`${key}=`)) {
        // Replace existing value
        window.location.hash = currentHash.replace(
          new RegExp(`${key}=[^&]*`),
          `${key}=${encoded}`
        );
      } else {
        // Add new parameter
        const separator = currentHash.includes('#') ? '&' : '#';
        window.location.hash = currentHash + separator + `${key}=${encoded}`;
      }
    }
    setValue(newValue);
  }, [key]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(new RegExp(`[#&]${key}=([^&]*)`));
      const newValue = match ? decodeURIComponent(match[1]) : null;
      setValue(newValue);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [key]);

  return [value, updateHash];
};
