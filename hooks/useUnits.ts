/**
 * Units Hook
 * Fetch and cache units from the database
 */

import { useEffect, useState } from 'react';

export interface Unit {
  id: string;
  name: string;
  description: string | null;
  code: string | null;
  color: string | null;
  icon: string | null;
}

export function useUnits() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/public/units');
      
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units || []);
      } else {
        setError('Failed to fetch units');
      }
    } catch (err) {
      console.error('Error fetching units:', err);
      setError('Error loading units');
    } finally {
      setLoading(false);
    }
  };

  const getUnitNames = () => units.map(u => u.name);
  
  const getUnitByName = (name: string) => units.find(u => u.name === name);
  
  const getUnitById = (id: string) => units.find(u => u.id === id);

  return {
    units,
    loading,
    error,
    refetch: fetchUnits,
    getUnitNames,
    getUnitByName,
    getUnitById,
  };
}
