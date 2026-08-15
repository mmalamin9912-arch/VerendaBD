import React, { useState } from 'react';
import { Clock, Plus } from 'lucide-react';
import { Product, PreorderCampaign } from '../../types';
import { PreorderCampaignModal } from './PreorderCampaignModal';

interface PreorderViewProps {
  products: Product[];
}

export const PreorderView: React.FC<PreorderViewProps> = ({ products }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<PreorderCampaign[]>([]);

  const handleSaveCampaign = (campaign: PreorderCampaign) => {
    setCampaigns([...campaigns, campaign]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#00D68F]" />
          Preorder & Reserve Campaigns
        </h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#00D68F] text-slate-950 px-4 py-2 rounded-lg font-bold text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Launch Preorder Campaign
        </button>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="bg-[#181B26] border border-[#2E3548] p-8 rounded-2xl text-center text-slate-400">
          No active preorder campaigns yet. Create your first campaign to start accepting advance orders.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(c => (
                <div key={c.id} className="bg-[#1D212E] border border-[#2E3548] p-4 rounded-xl text-white">
                    <h4 className="font-bold">{c.name}</h4>
                    <p className="text-sm text-slate-400">{c.productTitle}</p>
                    <p className="text-sm text-slate-400">Ends: {c.targetEndDate}</p>
                </div>
            ))}
        </div>
      )}

      <PreorderCampaignModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        products={products}
        onSave={handleSaveCampaign}
      />
    </div>
  );
};
