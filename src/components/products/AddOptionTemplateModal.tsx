import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { VariantOptionPreset } from '../../types';

interface AddOptionTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: VariantOptionPreset) => void;
}

export const AddOptionTemplateModal: React.FC<AddOptionTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Pill Buttons' | 'Color Swatches' | 'Dropdown List'>('Pill Buttons');
  const [newValue, setNewValue] = useState('');
  const [values, setValues] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddValue = () => {
    if (newValue.trim()) {
      setValues([...values, newValue.trim()]);
      setNewValue('');
    }
  };

  const handleRemoveValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || values.length === 0) return;

    onSave({
      id: `opt-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      type,
      values,
    });

    // Reset and close
    setTitle('');
    setType('Pill Buttons');
    setValues([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1D212E] border border-[#2E3548] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Add Option Template</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Template Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fabric Material, Silk Types"
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Display Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              required
            >
              <option value="Pill Buttons">Pill Buttons (Best for Sizes)</option>
              <option value="Color Swatches">Color Swatches (Visual circles)</option>
              <option value="Dropdown List">Dropdown List (Compact)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400">Values</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddValue())}
                placeholder="Add a value..."
                className="flex-1 bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              />
              <button
                type="button"
                onClick={handleAddValue}
                className="bg-[#2E3548] text-white px-3 py-2 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {values.map((v, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-[#181B26] text-slate-200 px-2.5 py-1 rounded-lg border border-[#2E3548] text-xs font-medium"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(i)}
                    className="text-slate-500 hover:text-red-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {values.length === 0 && (
                <p className="text-[10px] text-slate-500 italic">No values added yet. Type and press Enter or click (+).</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!title.trim() || values.length === 0}
              className="w-full bg-[#00D68F] disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold py-3 rounded-lg cursor-pointer hover:bg-[#00E699] transition-colors"
            >
              Create Option Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
