import React, { useState } from 'react';
import { Share2, Globe, CheckCircle2, ArrowUpRight, Zap, MessageCircle, ShoppingBag, X } from 'lucide-react';

export const ChannelsView: React.FC = () => {
  const [channels, setChannels] = useState([
    { id: 'web', name: 'Zid Storefront Website', status: 'Connected', ordersThisMonth: 124, icon: Globe },
    { id: 'fb', name: 'Facebook Shop & Instagram Catalog', status: 'Connected', ordersThisMonth: 68, icon: Share2 },
    { id: 'tiktok', name: 'TikTok Dynamic Ads & Catalog Feed', status: 'Connected', ordersThisMonth: 32, icon: Zap },
    { id: 'google', name: 'Google Merchant Center Shopping', status: 'Syncing', ordersThisMonth: 19, icon: Globe },
    { id: 'whatsapp', name: 'WhatsApp Business Catalog Sync', status: 'Disconnected', ordersThisMonth: 0, icon: MessageCircle },
    { id: 'pos', name: 'Manual Orders & Social Inbox POS', status: 'Active', ordersThisMonth: 12, icon: ShoppingBag },
  ]);

  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

  const getFeedUrl = (channelId: string) => {
    return `https://api.zid.store/feeds/${channelId}/catalog.xml?key=z_prod_882910`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#202533] border border-[#2E3548] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#00D68F] uppercase bg-[#00D68F]/10 px-2.5 py-0.5 rounded border border-[#00D68F]/20">
              Omnichannel Sales Integration
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Sales Channels & Catalog Sync</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sell everywhere from a single Zid inventory dashboard. Product stock and orders sync in real-time across Facebook, Instagram, TikTok and Google.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((ch) => {
          const Icon = ch.icon;
          return (
            <div key={ch.id} className="bg-[#202533] border border-[#2E3548] p-5 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#181B26] border border-[#2E3548] flex items-center justify-center text-[#00D68F]">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{ch.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#00D68F] bg-[#00D68F]/10 px-2 py-0.5 rounded font-semibold border border-[#00D68F]/20">
                      {ch.status}
                    </span>
                    <span className="text-xs text-slate-400">{ch.ordersThisMonth} Orders</span>
                  </div>
                </div>
              </div>

              {['fb', 'tiktok', 'google'].includes(ch.id) ? (
                <button 
                    onClick={() => setSelectedChannel(ch)}
                    className="p-2 text-slate-300 hover:text-white bg-[#181B26] hover:bg-[#282D3F] rounded-xl border border-[#2E3548] text-xs font-semibold flex items-center gap-1 transition"
                >
                    <span>Manage</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button className="p-2 text-slate-300 hover:text-white bg-[#181B26] hover:bg-[#282D3F] rounded-xl border border-[#2E3548] text-xs font-semibold flex items-center gap-1 transition">
                    <span>Configure</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {selectedChannel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1D212E] border border-[#2E3548] rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setSelectedChannel(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white mb-2">{selectedChannel.name} Sync</h3>
            <p className="text-xs text-slate-400 mb-6">Use this Dynamic Feed URL in your Ads Manager settings.</p>
            
            <div className="bg-[#181B26] border border-[#2E3548] rounded-xl p-4 mb-6">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Dynamic XML/CSV Product Feed URL</p>
                <code className="text-xs text-[#00D68F] break-all">{getFeedUrl(selectedChannel.id)}</code>
            </div>

            <button 
                onClick={() => navigator.clipboard.writeText(getFeedUrl(selectedChannel.id))}
                className="w-full py-3 bg-[#00D68F] text-slate-950 font-black rounded-xl hover:bg-[#00E699]"
            >
                Copy Catalog Feed URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
