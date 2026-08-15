import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GlobalCustomField } from '../../types';

interface AddCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: GlobalCustomField) => void;
}

export const AddCustomFieldModal: React.FC<AddCustomFieldModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [type, setType] = useState<'Text' | 'Dropdown' | 'Checkbox'>('Text');
  const [required, setRequired] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      name,
      nameBn,
      type,
      appliesTo: 'All Products',
      required,
    });
    onClose();
    // Reset form
    setName('');
    setNameBn('');
    setType('Text');
    setRequired(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1D212E] border border-[#2E3548] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Add Custom Field</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Field Name (English)</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              placeholder="e.g. Fabric Material"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Bangla / Display Label</label>
            <input 
              type="text" 
              value={nameBn} 
              onChange={e => setNameBn(e.target.value)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              placeholder="e.g. কাপড়ের ধরণ"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Input Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as any)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              required
            >
              <option value="Text">Text</option>
              <option value="Dropdown">Dropdown</option>
              <option value="Checkbox">Checkbox</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="required"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
              className="w-4 h-4 rounded border-[#2E3548] text-[#00D68F] focus:ring-[#00D68F] bg-[#181B26]"
            />
            <label htmlFor="required" className="text-sm text-slate-300 font-medium cursor-pointer">
              Mark as Required Field
            </label>
          </div>

          <button type="submit" className="w-full bg-[#00D68F] text-slate-950 font-bold py-3 rounded-lg mt-4 cursor-pointer hover:bg-[#00E699] transition-colors">
            Create Custom Field
          </button>
        </form>
      </div>
    </div>
  );
};
