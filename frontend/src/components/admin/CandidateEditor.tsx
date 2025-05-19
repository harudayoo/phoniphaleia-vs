import React, { useState } from 'react';
import { Check, AlertCircle, RefreshCw, Edit, Plus } from 'lucide-react';

interface Candidate {
  id: string | number;
  name: string;
  votes?: number;
  percentage?: number;
}

interface CandidateEditorProps {
  candidates: Candidate[];
  onSave: (candidates: Candidate[]) => void;
  loading?: boolean;
}

const CandidateEditor: React.FC<CandidateEditorProps> = ({ candidates: initialCandidates, onSave, loading = false }) => {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates || []);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string>('');
  
  const handleAdd = () => {
    const newId = `temp-${Date.now()}`;
    setCandidates([...candidates, { id: newId, name: '' }]);
    setEditingId(newId);
  };
  
  const handleEdit = (id: string | number) => {
    setEditingId(id);
  };
  
  const handleDelete = (id: string | number) => {
    setCandidates(candidates.filter(c => c.id !== id));
  };
  
  const handleNameChange = (id: string | number, name: string) => {
    setCandidates(candidates.map(c => 
      c.id === id ? { ...c, name } : c
    ));
  };

  const handleVotesChange = (id: string | number, votesStr: string) => {
    const votes = parseInt(votesStr, 10) || 0;
    setCandidates(candidates.map(c => 
      c.id === id ? { ...c, votes } : c
    ));
  };
  
  const handleSave = () => {
    // Validate candidates
    const emptyNameCandidate = candidates.find(c => !c.name.trim());
    if (emptyNameCandidate) {
      setError('All candidates must have a name');
      return;
    }
    
    // Calculate percentages
    const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
    const candidatesWithPercentages = candidates.map(c => ({
      ...c,
      percentage: totalVotes > 0 ? Math.round(((c.votes || 0) / totalVotes) * 1000) / 10 : 0
    }));
    
    onSave(candidatesWithPercentages);
    setEditingId(null);
    setError('');
  };
  
  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Candidates</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-3 mb-4">
        {candidates.map(candidate => (
          <div key={candidate.id} className="border border-gray-200 rounded-lg p-3">
            {editingId === candidate.id ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={candidate.name}
                    onChange={(e) => handleNameChange(candidate.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Candidate name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votes</label>
                  <input
                    type="number"
                    value={candidate.votes || ''}
                    onChange={(e) => handleVotesChange(candidate.id, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Number of votes"
                    min="0"
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-2">
                  <button 
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(candidate.id)}
                    className="px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{candidate.name}</div>
                  {candidate.votes !== undefined && (
                    <div className="text-sm text-gray-500">
                      {candidate.votes} votes
                      {candidate.percentage !== undefined && ` (${candidate.percentage}%)`}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => handleEdit(candidate.id)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
        
        {candidates.length === 0 && (
          <div className="text-center py-4 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No candidates added yet
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={handleAdd}
          className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Candidate
        </button>
        
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center px-4 py-2 rounded-md ${
            loading
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CandidateEditor;
