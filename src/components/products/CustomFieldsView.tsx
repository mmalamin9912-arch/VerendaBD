import React, { useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { GlobalCustomField } from '../../types';
import { AddCustomFieldModal } from './AddCustomFieldModal';

export const CustomFieldsView: React.FC = () => {
  const [fields, setFields] = useState<GlobalCustomField[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSaveField = (field: GlobalCustomField) => {
    setFields([...fields, field]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#202533] border border-[#2E3548] p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00D68F]" />
            <span>Global Custom Product Attributes</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define custom specification fields like care guides, origin, and warranty certificates for products.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#00D68F] hover:bg-[#00E699] text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Custom Field</span>
        </button>
      </div>

      <div className="bg-[#202533] border border-[#2E3548] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#181B26] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#2E3548] font-bold">
              <tr>
                <th className="p-3.5">Field Name</th>
                <th className="p-3.5">Bangla / Display Label</th>
                <th className="p-3.5">Input Type</th>
                <th className="p-3.5">Applies To</th>
                <th className="p-3.5">Required</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E3548]">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 font-medium italic">
                    No custom fields defined yet. Click "Add Custom Field" to create one.
                  </td>
                </tr>
              ) : (
                fields.map((field) => (
                  <tr key={field.id} className="hover:bg-[#252B3B]">
                    <td className="p-3.5 font-bold text-white">{field.name}</td>
                    <td className="p-3.5 font-semibold text-slate-300">{field.nameBn}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-mono bg-[#181B26] text-slate-300 px-2 py-0.5 rounded-md border border-[#2E3548]">
                        {field.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">{field.appliesTo}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        field.required ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'
                      }`}>
                        {field.required ? 'Required' : 'Optional'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setFields(fields.filter(f => f.id !== field.id))}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddCustomFieldModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveField}
      />
    </div>
  );
};
