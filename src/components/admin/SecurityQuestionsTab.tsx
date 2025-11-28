import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, EyeOff, Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface SecurityQuestion {
  id: number;
  account_id: number;
  question_number: number;
  question_text: string;
  answer_hash: string;
  alternate_answers: string[] | null;
  created_at: string;
  updated_at: string;
}

const SecurityQuestionsTab: React.FC = () => {
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state for editing/adding
  const [formData, setFormData] = useState({
    question_text: '',
    primary_answer: '',
    alternate_answers: ''
  });

  useEffect(() => {
    fetchSecurityQuestions();
  }, []);

  const fetchSecurityQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_questions')
        .select('*')
        .eq('account_id', 999)
        .order('question_number');

      if (error) {
        console.error('Error fetching security questions:', error);
        setError('Failed to fetch security questions');
      } else {
        setQuestions(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAdd = () => {
    setIsAddingNew(true);
    setEditingId(null);
    setFormData({
      question_text: '',
      primary_answer: '',
      alternate_answers: ''
    });
    clearMessages();
  };

  const handleEdit = (question: SecurityQuestion) => {
    setEditingId(question.id);
    setIsAddingNew(false);
    setFormData({
      question_text: question.question_text,
      primary_answer: '', // Don't show existing answer for security
      alternate_answers: question.alternate_answers ? question.alternate_answers.join(', ') : ''
    });
    clearMessages();
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setFormData({
      question_text: '',
      primary_answer: '',
      alternate_answers: ''
    });
    clearMessages();
  };

  const handleSave = async () => {
    if (!formData.question_text.trim() || !formData.primary_answer.trim()) {
      setError('Question and primary answer are required');
      return;
    }

    try {
      const alternateAnswersArray = formData.alternate_answers
        .split(',')
        .map(ans => ans.trim())
        .filter(ans => ans.length > 0);

      if (isAddingNew) {
        // Get the next question number
        const maxQuestionNumber = Math.max(...questions.map(q => q.question_number), 0);
        
        const { error } = await supabase.rpc('add_security_question', {
          p_account_id: 999,
          p_question_number: maxQuestionNumber + 1,
          p_question_text: formData.question_text,
          p_primary_answer: formData.primary_answer,
          p_alternate_answers: alternateAnswersArray.length > 0 ? alternateAnswersArray : null
        });

        if (error) {
          setError('Failed to add security question: ' + error.message);
          return;
        }

        setSuccess('Security question added successfully!');
      } else if (editingId) {
        const { error } = await supabase.rpc('update_security_question', {
          p_question_id: editingId,
          p_question_text: formData.question_text,
          p_primary_answer: formData.primary_answer || null,
          p_alternate_answers: alternateAnswersArray.length > 0 ? alternateAnswersArray : null
        });

        if (error) {
          setError('Failed to update security question: ' + error.message);
          return;
        }

        setSuccess('Security question updated successfully!');
      }

      handleCancel();
      fetchSecurityQuestions();
    } catch (err) {
      console.error('Save error:', err);
      setError('Unexpected error occurred while saving');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this security question? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('security_questions')
        .delete()
        .eq('id', id)
        .eq('account_id', 999);

      if (error) {
        setError('Failed to delete security question: ' + error.message);
      } else {
        setSuccess('Security question deleted successfully!');
        fetchSecurityQuestions();
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Unexpected error occurred while deleting');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading security questions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Security Questions Management</h2>
        <p className="text-gray-600">
          Manage security questions for account 999. These questions will be randomly presented during login.
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center space-x-2"
            disabled={isAddingNew || editingId !== null}
          >
            <Plus size={16} />
            <span>Add New Question</span>
          </button>

          <button
            onClick={() => setShowAnswers(!showAnswers)}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center space-x-2"
          >
            {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showAnswers ? 'Hide Answers' : 'Show Answers'}</span>
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Total Questions: {questions.length}
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingId) && (
        <div className="mb-6 bg-gray-50 border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">
            {isAddingNew ? 'Add New Security Question' : 'Edit Security Question'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Text
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Enter the security question..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Answer
              </label>
              <input
                type="text"
                value={formData.primary_answer}
                onChange={(e) => setFormData(prev => ({ ...prev, primary_answer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter the primary answer..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternate Answers (comma-separated)
              </label>
              <input
                type="text"
                value={formData.alternate_answers}
                onChange={(e) => setFormData(prev => ({ ...prev, alternate_answers: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., levi, levy"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Additional acceptable answers, separated by commas
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center space-x-2"
              >
                <Save size={16} />
                <span>Save</span>
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex items-center space-x-2"
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              {showAnswers && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Answer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alternate Answers
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Updated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {questions.map((question) => (
              <tr key={question.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {question.question_number}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs">
                    {question.question_text}
                  </div>
                </td>
                {showAnswers && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="bg-yellow-100 px-2 py-1 rounded text-xs">
                        [ENCRYPTED]
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {question.alternate_answers ? (
                        <div className="flex flex-wrap gap-1">
                          {question.alternate_answers.map((alt, index) => (
                            <span key={index} className="bg-blue-100 px-2 py-1 rounded text-xs">
                              {alt}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                  </>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(question.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(question)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                    disabled={isAddingNew || editingId !== null}
                  >
                    <Edit size={14} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(question.id)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center space-x-1"
                    disabled={isAddingNew || editingId !== null}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {questions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No security questions found.</p>
            <p className="text-sm">Click "Add New Question" to create your first security question.</p>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Security Questions Information</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Security questions are only used for account 999</li>
          <li>• One random question is selected during each login attempt</li>
          <li>• Answers are case-insensitive and automatically trimmed</li>
          <li>• Primary answers are encrypted in the database</li>
          <li>• Alternate answers allow for variations (e.g., "levi" and "levy")</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityQuestionsTab;