/**
 * useReferenceData - Hook for fetching reference table data with caching
 *
 * This hook provides a standardized way to fetch data from reference tables
 * (ref_payment_terms, ref_ship_methods, ref_payment_types) with built-in
 * caching to minimize database calls.
 *
 * Usage:
 *   const { data: paymentTerms, loading } = useReferenceData('ref_payment_terms');
 *   const { data: shipMethods } = useReferenceData('ref_ship_methods');
 *   const { data: paymentTypes } = useReferenceData('ref_payment_types');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Reference table types
export interface RefPaymentTerm {
  id: number;
  code: string;
  description: string;
  days_until_due: number;
  is_active: boolean;
  sort_order: number;
}

export interface RefShipMethod {
  id: number;
  code: string;
  description: string;
  carrier: string;
  is_active: boolean;
  sort_order: number;
}

export interface RefPaymentType {
  id: number;
  code: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

// Union type for all reference data
export type ReferenceData = RefPaymentTerm | RefShipMethod | RefPaymentType;

// Valid table names
export type ReferenceTableName = 'ref_payment_terms' | 'ref_ship_methods' | 'ref_payment_types';

// Cache structure with TTL
interface CacheEntry<T> {
  data: T[];
  timestamp: number;
}

// In-memory cache (shared across all hook instances)
const cache: Map<string, CacheEntry<ReferenceData>> = new Map();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Check if cache entry is still valid
const isCacheValid = (entry: CacheEntry<ReferenceData> | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

interface UseReferenceDataOptions {
  includeInactive?: boolean;
  forceRefresh?: boolean;
}

interface UseReferenceDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Generic hook for fetching reference data from any reference table
 */
export function useReferenceData<T extends ReferenceData>(
  tableName: ReferenceTableName,
  options: UseReferenceDataOptions = {}
): UseReferenceDataReturn<T> {
  const { includeInactive = false, forceRefresh = false } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  const cacheKey = `${tableName}:${includeInactive ? 'all' : 'active'}`;

  const fetchData = useCallback(async () => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedEntry = cache.get(cacheKey);
      if (isCacheValid(cachedEntry)) {
        if (isMounted.current) {
          setData(cachedEntry!.data as T[]);
          setLoading(false);
        }
        return;
      }
    }

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      let query = supabase
        .from(tableName)
        .select('*')
        .order('sort_order', { ascending: true });

      // Filter by active status unless includeInactive is true
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data: fetchedData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const resultData = (fetchedData || []) as T[];

      // Update cache
      cache.set(cacheKey, {
        data: resultData,
        timestamp: Date.now()
      });

      if (isMounted.current) {
        setData(resultData);
        setError(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : `Failed to fetch ${tableName}`);
        setData([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [tableName, includeInactive, forceRefresh, cacheKey]);

  // Refresh function to manually reload data
  const refresh = useCallback(async () => {
    // Clear cache for this key
    cache.delete(cacheKey);
    await fetchData();
  }, [fetchData, cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refresh };
}

/**
 * Convenience hook for payment terms
 */
export function usePaymentTerms(options?: UseReferenceDataOptions) {
  return useReferenceData<RefPaymentTerm>('ref_payment_terms', options);
}

/**
 * Convenience hook for ship methods
 */
export function useShipMethods(options?: UseReferenceDataOptions) {
  return useReferenceData<RefShipMethod>('ref_ship_methods', options);
}

/**
 * Convenience hook for payment types
 */
export function usePaymentTypes(options?: UseReferenceDataOptions) {
  return useReferenceData<RefPaymentType>('ref_payment_types', options);
}

/**
 * Clear all cached reference data
 * Call this after admin updates to reference tables
 */
export function clearReferenceDataCache(): void {
  cache.clear();
}

/**
 * Clear cache for a specific table
 */
export function clearTableCache(tableName: ReferenceTableName): void {
  // Clear both active and all variants
  cache.delete(`${tableName}:active`);
  cache.delete(`${tableName}:all`);
}

export default useReferenceData;
