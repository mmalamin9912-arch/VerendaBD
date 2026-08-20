import React from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Truck, 
  CreditCard, 
  Headphones, 
  Check, 
  Star,
  Lock
} from 'lucide-react';
import { subscriptionPlans } from '../data/initialData';
import { SubscriptionPlan, PlatformSettings } from '../types';

interface PublicPricingLandingProps {
  onSelectPlan: (planId: string) => void;
  onLoginClick: () => void;
  isAuthenticated?: boolean;
  onGoToDashboard?: () => void;
  plans?: SubscriptionPlan[];
  platformSettings?: PlatformSettings;
}

export const PublicPricingLanding: React.FC<PublicPricingLandingProps> = ({ 
  onSelectPlan, 
  onLoginClick,
  isAuthenticated,
  onGoToDashboard,
  plans = subscriptionPlans,
  platformSettings
}) => {
  const activePlans = (plans && plans.length > 0 ? plans : subscriptionPlans).filter(p => p.isActive !== false);

  const getPlanDurationLabel = (plan: SubscriptionPlan) => {
    if (plan.durationDays === 30) return '1 Month (30 Days)';
    if (plan.durationDays === 90) return '3 Months (90 Days)';
    if (plan.durationDays === 180) return '6 Months (180 Days)';
    if (plan.durationDays === 365) return '1 Year (365 Days)';
    return `${plan.durationDays} Days`;
  };

  const getPlanDescription = (plan: SubscriptionPlan) => {
    if (plan.id === 'starter_1m') return 'Great for new sellers testing online business.';
    if (plan.id === 'starter_3m') return 'Best value starter kit with AI tools included.';
    if (plan.id === 'pro_6m') return 'High-growth package with unlimited products & VIP tools.';
    if (plan.id === 'enterprise_12m') return 'Full year powerhouse for established brands & stores.';
    return 'Complete e-commerce toolkit for your business.';
  };

  return (
    <div className="min-h-screen bg-[#12151F] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-slate-950 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#181B26]/90 border-b border-[#2E3548]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] p-0.5 shadow-md shadow-[#D4AF37]/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#181B26] rounded-[10px] flex items-center justify-center font-black text-[#E6C587] text-base">
                Z
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">
                {platformSettings?.siteTitle || 'ZID SAAS'}
              </span>
              <span className="text-[#E6C587] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/25">
                BD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-sm font-semibold">
            {isAuthenticated && onGoToDashboard ? (
              <button 
                onClick={onGoToDashboard} 
                className="bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-slate-950 px-4 py-2 rounded-xl shadow-lg shadow-[#D4AF37]/20 transition-transform active:scale-95 hover:brightness-105 flex items-center gap-2 font-black cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button 
                  onClick={onLoginClick} 
                  className="text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => onSelectPlan('free_trial')}
                  className="bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-slate-950 px-4 py-2 rounded-xl shadow-md shadow-[#D4AF37]/20 transition-transform active:scale-95 hover:brightness-105 flex items-center gap-2 cursor-pointer font-black"
                >
                  <span>Start Free Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full flex flex-col items-center">
        {/* Badge & Title */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-black uppercase tracking-wider mb-6 shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch Your Store in Minutes • 0% Sales Commission</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight text-center max-w-4xl mb-4 tracking-tight">
          Everything You Need to <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728]">
            Sell Online in Bangladesh
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base md:text-lg text-center max-w-2xl mb-12">
          Choose a transparent plan that fits your business scale. All plans include full storefront features, courier automation, and instant local payment setup.
        </p>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full mb-16 items-stretch">
          
          {/* Card 1: 30-Day Free Trial */}
          <div className="bg-[#181B26] border border-[#2E3548] rounded-3xl p-6 flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all duration-200 relative group shadow-lg">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  Risk Free
                </span>
                <span className="text-xs text-slate-400 font-semibold">30 Days</span>
              </div>
              <h3 className="text-xl font-black text-white mb-1">Free Trial</h3>
              <p className="text-xs text-slate-400 mb-5 min-h-[32px]">
                Full platform access to test features and start uploading products.
              </p>
              
              <div className="mb-6 pb-6 border-b border-[#2E3548]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">৳0</span>
                  <span className="text-xs text-slate-400 font-medium">/ 30 Days</span>
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 font-semibold">No credit card required</p>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-[11px] uppercase font-black tracking-wider text-slate-500">Includes:</p>
                {[
                  'Up to 20 Products',
                  'Standard Responsive Theme',
                  'SSLCommerz & Manual Payments',
                  'Steadfast / Pathao Courier Link',
                  'Full Order Management',
                  'Standard Email Support'
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => onSelectPlan('free_trial')}
              className="w-full bg-[#202533] hover:bg-[#2A3144] border border-[#3A435E] hover:border-[#D4AF37]/50 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] text-sm cursor-pointer shadow-sm"
            >
              Start 30-Day Trial
            </button>
          </div>

          {/* Cards 2-5: Dynamic Subscription Plans */}
          {activePlans.map((plan) => {
            const isPro = plan.isPopular || plan.id === 'pro_6m';
            const isEnterprise = plan.id === 'enterprise_12m';

            return (
              <div 
                key={plan.id} 
                className={`bg-[#181B26] rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 relative group shadow-lg ${
                  isPro 
                    ? 'border-2 border-[#D4AF37] shadow-[#D4AF37]/15 bg-gradient-to-b from-[#1E2333] to-[#181B26] md:-translate-y-2' 
                    : 'border border-[#2E3548] hover:border-[#D4AF37]/50'
                }`}
              >
                {/* Popular Pill */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-slate-950 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md shadow-[#D4AF37]/30 flex items-center gap-1 whitespace-nowrap">
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      isPro 
                        ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FCF6BA]' 
                        : isEnterprise 
                        ? 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                        : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                    }`}>
                      {getPlanDurationLabel(plan)}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 mb-5 min-h-[32px]">
                    {getPlanDescription(plan)}
                  </p>
                  
                  <div className="mb-6 pb-6 border-b border-[#2E3548]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">৳{plan.price.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 font-medium">/ {plan.durationDays} Days</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ≈ ৳{Math.round(plan.price / (plan.durationDays / 30)).toLocaleString()}/month
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <p className="text-[11px] uppercase font-black tracking-wider text-slate-500">Features Included:</p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isPro ? 'text-[#D4AF37]' : 'text-emerald-400'
                        }`} />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => onSelectPlan(plan.id)}
                  className={`w-full font-black py-3 rounded-xl transition-all active:scale-[0.98] text-sm cursor-pointer shadow-md ${
                    isPro
                      ? 'bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] text-slate-950 hover:brightness-105 shadow-[#D4AF37]/25'
                      : 'bg-[#202533] hover:bg-[#2A3144] border border-[#3A435E] hover:border-[#D4AF37]/50 text-white'
                  }`}
                >
                  Choose {plan.name.split(' ')[0]}
                </button>
              </div>
            );
          })}

        </div>

        {/* Feature Highlights / Trust Bar */}
        <div className="w-full bg-[#181B26] border border-[#2E3548] rounded-3xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Instant Activation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your store and subdomain are created instantly upon signup.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">bKash & Nagad Ready</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Accept mobile payments directly into your personal or merchant numbers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Couriers Integrated</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                1-click consignment creation with Steadfast, Pathao & RedX.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">24/7 Bangla Support</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Direct WhatsApp and ticket support from our Dhaka support center.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2E3548] py-8 text-center text-xs text-slate-400 bg-[#141721]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ZID SAAS BD • Empowering Bangladeshi Merchants.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-300 transition-colors">Terms of Service</span>
            <span className="hover:text-slate-300 transition-colors">Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
