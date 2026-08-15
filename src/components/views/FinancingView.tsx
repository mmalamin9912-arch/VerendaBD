import React, { useState } from 'react';
import { Landmark, ArrowUpRight, CheckCircle2, ShieldCheck, Zap, Coins, X, AlertCircle, Lock } from 'lucide-react';
import { MerchantProfile } from '../../types';

interface FinancingViewProps {
  merchant: MerchantProfile;
}

export const FinancingView: React.FC<FinancingViewProps> = ({ merchant }) => {
  const [requestedAmount, setRequestedAmount] = useState(150000);
  const [isApplied, setIsApplied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const isAnnualPlan = merchant?.subscriptionPlan === '12_months';
  const isQualified = isAnnualPlan && (merchant?.totalSalesBDT ?? 0) >= 50000;

  const handleApply = () => {
    setIsApplied(true);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#202533] border border-[#2E3548] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#00D68F] uppercase bg-[#00D68F]/10 px-2.5 py-0.5 rounded border border-[#00D68F]/20">
              Zid Financing & Merchant Loans
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Instant Working Capital for Merchants</h1>
          <p className="text-xs text-slate-400 mt-1">
            Grow your store inventory with collateral-free financing calculated automatically from your bKash & Card sales history.
          </p>
          <p className="text-[10px] text-slate-500 mt-3 font-semibold italic">
            Powered by Licensed Financial Partners (IDLC, BRAC Bank, City Bank)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#181B26] p-3 rounded-xl border border-[#2E3548]">
          <Landmark className="w-6 h-6 text-[#00D68F]" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Pre-Approved Limit</div>
            <div className="text-lg font-black text-[#00D68F]">৳300,000 BDT</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Calculator Card */}
        <div className="md:col-span-2 relative bg-[#202533] border border-[#2E3548] p-6 rounded-2xl space-y-5">
          {!isAnnualPlan && (
            <div className="absolute inset-0 bg-[#1D212E]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 rounded-2xl text-center">
              <Lock className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-white font-black text-lg mb-2">Annual Plan Required</h3>
              <p className="text-slate-400 text-xs mb-6 max-w-xs">
                Exclusive Benefit: Upgrade to a 1-Year (Annual) Subscription Plan to unlock Instant Capital Financing up to ৳300,000.
              </p>
              <button className="px-6 py-3 bg-[#00D68F] text-slate-950 font-black rounded-xl hover:bg-[#00E699]">
                Upgrade to Annual Plan & Unlock Loan
              </button>
            </div>
          )}
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#00D68F]" />
              <span>Select Financing Loan Amount</span>
            </h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${!isAnnualPlan ? 'bg-amber-500/10 text-amber-500' : isQualified ? 'bg-[#00D68F]/10 text-[#00D68F]' : 'bg-red-500/10 text-red-500'}`}>
              Eligibility Status: {!isAnnualPlan ? 'Annual Plan Required' : isQualified ? 'Qualified' : 'Not Qualified'}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 font-semibold mb-2">
              <span>Loan Amount:</span>
              <span className="text-[#00D68F] font-bold text-sm">৳{requestedAmount.toLocaleString()} BDT</span>
            </div>
            <input
              type="range"
              min={20000}
              max={300000}
              step={10000}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              className="w-full accent-[#00D68F] cursor-pointer"
              disabled={!isQualified}
            />
          </div>

          {!isQualified ? (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-xs text-red-500 font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{isAnnualPlan ? 'Complete at least ৳50,000 in store sales to unlock financing.' : 'Exclusive Benefit: Upgrade to a 1-Year (Annual) Subscription Plan to unlock Instant Capital Financing up to ৳300,000.'}</span>
            </div>
          ) : isApplied ? (
            <div className="bg-[#00D68F]/15 border border-[#00D68F]/30 p-4 rounded-xl text-xs text-[#00D68F] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Application Submitted! Your Zid account manager will verify your bKash merchant statement within 2 hours.</span>
            </div>
          ) : (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full py-3 bg-[#00D68F] hover:bg-[#00E699] text-slate-950 font-extrabold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#00D68F]/20"
            >
              <span>Apply for ৳{requestedAmount.toLocaleString()} Capital Loan</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Benefits Card */}
        <div className="bg-[#202533] border border-[#2E3548] p-6 rounded-2xl space-y-4">
          <h3 className="font-bold text-white text-base">Why Zid Financing?</h3>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#00D68F] shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">0% Physical Collateral</strong>
                <p className="text-slate-400 text-[11px]">No paperwork or bank visits needed.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Instant Disbursal</strong>
                <p className="text-slate-400 text-[11px]">Funds deposited directly to your bank/bKash.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Flexible Micro-Repayment</strong>
                <p className="text-slate-400 text-[11px]">Deducted automatically from daily customer checkouts.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1D212E] border border-[#2E3548] rounded-3xl p-8 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-white mb-6">Complete Loan Application</h3>
            <div className="space-y-4">
              <input type="text" placeholder="NID Number" className="w-full bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-3 text-white" />
              <input type="text" placeholder="Trade License Number (Optional)" className="w-full bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-3 text-white" />
              <input type="text" placeholder="Payout Account (e.g. 017...)" className="w-full bg-[#181B26] border border-[#3A435E] rounded-xl px-4 py-3 text-white" />
              <button 
                onClick={handleApply}
                className="w-full py-4 bg-[#00D68F] text-slate-950 font-black rounded-xl hover:bg-[#00E699]"
              >
                Submit Application for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
