import React from 'react';
import { ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Building2, Smartphone, Zap } from 'lucide-react';
import { subscriptionPlans } from '../data/initialData';

interface PublicPricingLandingProps {
  onSelectPlan: (planId: string) => void;
  onLoginClick: () => void;
  isAuthenticated?: boolean;
  onGoToDashboard?: () => void;
}

export const PublicPricingLanding: React.FC<PublicPricingLandingProps> = ({ 
  onSelectPlan, 
  onLoginClick,
  isAuthenticated,
  onGoToDashboard
}) => {
  return (
    <div className="min-h-screen bg-[#12151F] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-slate-950 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2E3548] bg-[#181B26]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="font-black text-lg text-white tracking-tight">Zid SAAS BD</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          {isAuthenticated && onGoToDashboard ? (
            <button 
              onClick={onGoToDashboard} 
              className="bg-[#D4AF37] hover:bg-[#FCF6BA] text-slate-950 px-4 py-2 rounded-xl shadow-lg shadow-[#D4AF37]/20 transition flex items-center gap-2 font-bold cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button onClick={onLoginClick} className="text-slate-300 hover:text-white transition cursor-pointer">
                Sign In
              </button>
              <button 
                onClick={() => onSelectPlan('free_trial')}
                className="bg-[#D4AF37] hover:bg-[#FCF6BA] text-slate-950 px-4 py-2 rounded-xl shadow-lg shadow-[#D4AF37]/20 transition flex items-center gap-2 cursor-pointer font-bold"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Launch Your Dream Store Today</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
          Everything You Need to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#FCF6BA]">Sell Online in Bangladesh</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mb-12">
          Create your professional online store in minutes. 0% Commission on sales. Local payment gateways built right in.
        </p>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full">
          
          {/* Free Trial Card */}
          <div className="bg-[#181B26] border border-[#2E3548] rounded-3xl p-6 flex flex-col text-left hover:border-[#D4AF37]/50 transition-colors relative">
            <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
            <p className="text-sm text-slate-400 mb-4 h-10">Experience the full platform risk-free for 30 days.</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">৳0</span>
              <span className="text-slate-500"> / 30 Days</span>
            </div>
            <button 
              onClick={() => onSelectPlan('free_trial')}
              className="w-full bg-[#202533] hover:bg-[#282E3F] border border-[#3A435E] text-white font-bold py-3 rounded-xl mb-6 transition"
            >
              Start Free Trial
            </button>
            <div className="space-y-3 flex-1">
              {['Up to 20 Products', 'Basic Theme', 'Standard Support'].map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map real subscription plans */}
          {subscriptionPlans.filter(p => p.isActive).map((plan) => (
            <div 
              key={plan.id} 
              className={`bg-[#181B26] border rounded-3xl p-6 flex flex-col text-left transition-colors relative ${
                plan.isPopular 
                  ? 'border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10' 
                  : 'border-[#2E3548] hover:border-[#D4AF37]/50'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
              </div>
              <p className="text-sm text-slate-400 mb-4 h-10">Perfect for growing businesses.</p>
              <div className="mb-6">
                <span className="text-4xl font-black text-white">৳{plan.price}</span>
                <span className="text-slate-500"> / {plan.durationDays} Days</span>
              </div>
              <button 
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full font-bold py-3 rounded-xl mb-6 transition ${
                  plan.isPopular
                    ? 'bg-[#D4AF37] hover:bg-[#FCF6BA] text-slate-950 shadow-lg shadow-[#D4AF37]/20'
                    : 'bg-[#202533] hover:bg-[#282E3F] border border-[#3A435E] text-white'
                }`}
              >
                Subscribe Now
              </button>
              <div className="space-y-3 flex-1">
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
};
