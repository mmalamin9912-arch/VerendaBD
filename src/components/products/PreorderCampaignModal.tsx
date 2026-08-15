import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PreorderCampaign, Product } from '../../types';

interface PreorderCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSave: (campaign: PreorderCampaign) => void;
}

export const PreorderCampaignModal: React.FC<PreorderCampaignModalProps> = ({
  isOpen,
  onClose,
  products,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [discount, setDiscount] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === productId);
    onSave({
      id: Math.random().toString(36).substr(2, 9),
      name,
      productId,
      productTitle: product?.title || 'Unknown',
      discountPercentage: Number(discount),
      advanceDepositPercentage: Number(discount),
      targetEndDate: endDate,
      status: 'Draft',
    });
    onClose();
    // Reset form
    setName('');
    setProductId('');
    setDiscount('');
    setEndDate('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1D212E] border border-[#2E3548] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Create Preorder Campaign</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Campaign Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Select Product</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
              required
            >
              <option value="">Select a product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Discount/Deposit %</label>
              <input 
                type="number" 
                value={discount} 
                onChange={e => setDiscount(e.target.value)}
                className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Target End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#181B26] border border-[#2E3548] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00D68F]"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-[#00D68F] text-slate-950 font-bold py-3 rounded-lg mt-4 cursor-pointer">
            Launch Campaign
          </button>
        </form>
      </div>
    </div>
  );
};
