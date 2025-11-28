import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';

interface UnresolvedIssue {
  id: number;
  issue_date: string;
  issue_name: string;
  comments: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EditingIssue {
  id?: number;
  issue_date: string;
  issue_name: string;
  comments: string;
  status: string;
}

const UnresolvedIssuesTab: React.FC = () => {
  const [issues, setIssues] = useState<UnresolvedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingIssue, setEditingIssue] = useState<EditingIssue | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch issues on component mount
  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('unresolved_issues')
        .select('*')
        .order('issue_date', { ascending: false });
      
      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      setError('Failed to load unresolved issues');
      console.error('Error fetching issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (issue: UnresolvedIssue) => {
    setEditingIssue({
      id: issue.id,
      issue_date: issue.issue_date,
      issue_name: issue.issue_name,
      comments: issue.comments,
      status: issue.status
    });
    setIsCreating(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    
    try {
      const { error } = await supabase
        .from('unresolved_issues')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setIssues(issues.filter(issue => issue.id !== id));
    } catch (err) {
      setError('Failed to delete issue');
      console.error('Error deleting issue:', err);
    }
  };

  const handleCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingIssue({
      issue_date: today,
      issue_name: '',
      comments: '',
      status: 'OPEN'
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editingIssue) return;
    
    try {
      if (isCreating) {
        const { data, error } = await supabase
          .from('unresolved_issues')
          .insert(editingIssue)
          .select();
        
        if (error) throw error;
        if (data) setIssues([...issues, data[0]]);
      } else {
        const { data, error } = await supabase
          .from('unresolved_issues')
          .update({
            issue_date: editingIssue.issue_date,
            issue_name: editingIssue.issue_name,
            comments: editingIssue.comments,
            status: editingIssue.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingIssue.id)
          .select();
        
        if (error) throw error;
        if (data) {
          setIssues(issues.map(issue => 
            issue.id === editingIssue.id ? data[0] : issue
          ));
        }
      }
      
      setEditingIssue(null);
      setIsCreating(false);
    } catch (err) {
      setError(`Failed to ${isCreating ? 'create' : 'update'} issue`);
      console.error(`Error ${isCreating ? 'creating' : 'updating'} issue:`, err);
    }
  };

  const handleCancel = () => {
    setEditingIssue(null);
    setIsCreating(false);
  };

  const renderIssueTable = () => {
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issues.map(issue => (
            <tr key={issue.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(issue.issue_date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {issue.issue_name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  issue.status === 'OPEN' ? 'bg-red-100 text-red-800' : 
                  issue.status === 'IN PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {issue.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button 
                  onClick={() => handleEdit(issue)} 
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                >
                  <FaEdit />
                </button>
                <button 
                  onClick={() => handleDelete(issue.id)} 
                  className="text-red-600 hover:text-red-900"
                >
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderIssueDetails = () => {
    return (
      <div className="mt-6 p-4 bg-white shadow-md rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          {isCreating ? 'Create New Issue' : `Edit Issue: ${editingIssue?.issue_name}`}
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={editingIssue?.issue_date || ''}
              onChange={(e) => setEditingIssue({...editingIssue!, issue_date: e.target.value})}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Issue Name</label>
            <input
              type="text"
              value={editingIssue?.issue_name || ''}
              onChange={(e) => setEditingIssue({...editingIssue!, issue_name: e.target.value})}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={editingIssue?.status || 'OPEN'}
              onChange={(e) => setEditingIssue({...editingIssue!, status: e.target.value})}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            >
              <option value="OPEN">OPEN</option>
              <option value="IN PROGRESS">IN PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Comments</label>
            <textarea
              rows={4}
              value={editingIssue?.comments || ''}
              onChange={(e) => setEditingIssue({...editingIssue!, comments: e.target.value})}
              className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <button 
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <FaTimes className="mr-2" /> Cancel
          </button>
          <button 
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <FaSave className="mr-2" /> Save
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Unresolved Issues</h2>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <FaPlus className="mr-2" /> New Issue
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-4">Loading issues...</div>
      ) : (
        <>
          {issues.length === 0 ? (
            <p className="text-gray-500">No unresolved issues found.</p>
          ) : (
            <div className="overflow-x-auto">
              {renderIssueTable()}
            </div>
          )}
        </>
      )}
      
      {editingIssue && renderIssueDetails()}
    </div>
  );
};

export default UnresolvedIssuesTab;
