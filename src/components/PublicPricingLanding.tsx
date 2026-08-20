import React from 'react';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
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
    <div id="pricing-landing-container" className="min-h-screen bg-slate-950 text-white font-sans selection:bg-[#D4AF37] selection:text-slate-950 flex flex-col overflow-hidden">
      {/* Navbar */}
      <nav id="pricing-navbar" className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 bg-gradient-to-tr from-[#BF953F] to-[#B38728]">
            <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10 12 H30 L16 28 H30"
                  stroke="#D4AF37"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="30" cy="12" r="2" fill="#FCF6BA" />
                <circle cx="10" cy="28" r="2" fill="#BF953F" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white tracking-tight text-base">ZID</span>
            <span className="font-extrabold text-[#E6C587] uppercase text-xs px-1.5 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/25">
              SAAS BD
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm font-semibold">
          {isAuthenticated && onGoToDashboard ? (
            <button 
              id="pricing-dashboard-btn"
              onClick={onGoToDashboard} 
              className="bg-[#D4AF37] hover:bg-[#e4be42] text-slate-950 px-4 py-2 rounded-xl transition flex items-center gap-2 font-bold cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button 
                id="pricing-signin-btn"
                onClick={onLoginClick} 
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                Sign In
              </button>
              <button 
                id="pricing-start-trial-btn"
                onClick={() => onSelectPlan('free_trial')}
                className="bg-[#D4AF37] hover:bg-[#e4be42] text-slate-950 px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer font-bold"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div id="pricing-hero" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Launch Your Dream Store Today</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6 max-w-4xl">
          Everything You Need to <br />
          <span className="text-[#D4AF37]">Sell Online in Bangladesh</span>
        </h1>
        <p className="text-base md:text-lg text-slate-400 max-w-2xl mb-12">
          Create your professional online store in minutes. 0% Commission on sales. Local payment gateways built right in.
        </p>

        {/* Pricing Grid */}
        <div id="pricing-plans-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full">
          
          {/* Free Trial Card */}
          <div id="plan-card-free-trial" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col text-left hover:border-slate-700 transition-colors relative">
            <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
            <p className="text-sm text-slate-400 mb-4 h-10">Experience the full platform risk-free for 30 days.</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">৳0</span>
              <span className="text-slate-500"> / 30 Days</span>
            </div>
            <button 
              id="plan-btn-free-trial"
              onClick={() => onSelectPlan('free_trial')}
              className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl mb-6 transition cursor-pointer"
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
              id={`plan-card-${plan.id}`}
              className={`bg-slate-900 border rounded-2xl p-6 flex flex-col text-left transition-colors relative ${
                plan.isPopular 
                  ? 'border-[#D4AF37]' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D4AF37] text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full whitespace-nowrap">
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
                id={`plan-btn-${plan.id}`}
                onClick={() => onSelectPlan(plan.id)}
                className={`w-full font-bold py-3 rounded-xl mb-6 transition cursor-pointer ${
                  plan.isPopular
                    ? 'bg-[#D4AF37] hover:bg-[#e4be42] text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white'
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

