import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { supabase } from '../utils/supabaseClient';
import { US_STATES } from '../utils/usStates'; // Utility: { AL: 'Alabama', ... }

const geoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

export interface StaffAssignment {
  id: number;
  staff_member_name: string;
  state_code: string;
  assigned_date: string;
}

export interface ProspectTally {
  staff_member_name: string;
  states: string[];
  prospect_count: number;
}

const salesmanColors: Record<string, string> = {
  Alice: 'bg-blue-500',
  Bob: 'bg-green-500',
  Carol: 'bg-red-500',
  Unassigned: 'bg-gray-300',
};

const salespeople = ['Alice', 'Bob', 'Carol'];

export const SalesmanXrefModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [prospectTallies, setProspectTallies] = useState<ProspectTally[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchAssignments();
      fetchProspectTallies();
    }
  }, [isOpen]);

  async function fetchAssignments() {
    setLoading(true);
    const { data, error } = await supabase.from('STAFF_STATE_ASSIGNMENTS').select('*');
    if (!error && data) setAssignments(data);
    setLoading(false);
  }

  async function fetchProspectTallies() {
    // Aggregate prospects by staff assignment
    const { data, error } = await supabase.rpc('get_prospect_tally_by_staff');
    if (!error && data) setProspectTallies(data);
  }

  function getStateAssignment(stateCode: string) {
    return assignments.find(a => a.state_code === stateCode)?.staff_member_name || 'Unassigned';
  }

  async function handleAssignState() {
    if (!selectedState || !selectedSalesperson) return;
    setAssigning(true);
    // Upsert assignment
    await supabase.from('STAFF_STATE_ASSIGNMENTS').upsert({
      state_code: selectedState,
      staff_member_name: selectedSalesperson,
      assigned_date: new Date().toISOString(),
    }, { onConflict: ['state_code'] });
    setSelectedState(null);
    setSelectedSalesperson('');
    await fetchAssignments();
    await fetchProspectTallies();
    setAssigning(false);
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40" />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-4">Sales Territory Assignment</h2>
          <ComposableMap projection="geoAlbersUsa">
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const stateCode = geo.properties?.postal;
                  const assigned = getStateAssignment(stateCode);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => setSelectedState(stateCode)}
                      style={{
                        default: { fill: salesmanColors[assigned] || salesmanColors['Unassigned'], outline: 'none' },
                        hover: { fill: '#FFD700', outline: 'none' },
                        pressed: { fill: '#FFA500', outline: 'none' },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
          {selectedState && (
            <div className="mt-4 p-4 bg-gray-100 rounded shadow">
              <h3 className="font-semibold">Assign {selectedState} to:</h3>
              <select
                className="mt-2 p-2 border rounded"
                value={selectedSalesperson}
                onChange={e => setSelectedSalesperson(e.target.value)}
              >
                <option value="">Select Salesperson</option>
                {salespeople.map(sp => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
              <button
                className="ml-4 px-4 py-2 bg-blue-600 text-white rounded"
                onClick={handleAssignState}
                disabled={assigning}
              >Assign</button>
              <button className="ml-2 px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setSelectedState(null)}>Cancel</button>
            </div>
          )}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Legend</h3>
            <div className="flex gap-4">
              {Object.entries(salesmanColors).map(([name, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <span className={`inline-block w-4 h-4 rounded ${color}`}></span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold mb-4">Salesperson Territory Summary</h3>
          <table className="w-full border rounded">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-2">Salesperson</th>
                <th className="p-2">States</th>
                <th className="p-2">Total Prospects</th>
              </tr>
            </thead>
            <tbody>
              {prospectTallies.map(row => (
                <tr key={row.staff_member_name}>
                  <td className="p-2 font-semibold">{row.staff_member_name}</td>
                  <td className="p-2">{row.states.join(', ')}</td>
                  <td className="p-2">{row.prospect_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="absolute top-4 right-4 px-4 py-2 bg-red-600 text-white rounded" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  );
};
