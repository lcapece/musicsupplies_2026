import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronUp, ChevronDown, Edit2, Save, X, Download } from 'lucide-react';

interface StateAssignment {
  state_abbr: string;
  state_name: string;
  salesman_assigned: string | null;
  prospect_count: number;
  country_code: string;
}

interface SortConfig {
  key: keyof StateAssignment;
  direction: 'asc' | 'desc';
}

interface StateAssignmentManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Predefined color palette for salesperson assignments
const COLOR_PALETTE = [
  { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', dot: 'bg-red-500', name: 'Red' },
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', dot: 'bg-blue-500', name: 'Blue' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', dot: 'bg-green-500', name: 'Green' },
  { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', dot: 'bg-yellow-500', name: 'Yellow' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', dot: 'bg-purple-500', name: 'Purple' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', dot: 'bg-pink-500', name: 'Pink' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', dot: 'bg-indigo-500', name: 'Indigo' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', dot: 'bg-orange-500', name: 'Orange' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', dot: 'bg-teal-500', name: 'Teal' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800', dot: 'bg-cyan-500', name: 'Cyan' },
  { bg: 'bg-lime-100', border: 'border-lime-400', text: 'text-lime-800', dot: 'bg-lime-500', name: 'Lime' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', dot: 'bg-emerald-500', name: 'Emerald' },
];

// Function to get consistent color for a salesperson
const getColorForSalesperson = (salesperson: string | null) => {
  if (!salesperson || salesperson === 'Unassigned') {
    return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', dot: 'bg-gray-400', name: 'Gray' };
  }
  // Generate consistent index based on salesperson name
  const index = salesperson.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
};
