import React, { useState, useEffect } from 'react';
import { NavigationTab, ProductSubTab, CustomerSubTab, StoreSubTab, MerchantProfile, BankAccount, MobileBankingConfig, CodConfig, PaymentGatewayConfig, CourierService, Order, Product, Customer, AdminPaymentGatewayConfig, SubscriptionRequest, ThemeConfig, ThemePurchaseRequest, SubscriptionPlan, PlatformTheme, SupportTicket, PlatformAddon, AuditLog, PlatformSecuritySettings, BroadcastMessage, PlatformAutomationSettings, AdminTeamMember, AdminRolePermission } from './types';

import { 
  initialMerchant, 
  initialAllMerchants,
  initialBankAccounts, 
  initialMobileBanking, 
  initialCodConfig, 
  initialPaymentGateway,
  initialCouriers, 
  initialOrders, 
  initialCustomers,
  subscriptionPlans,
  initialThemes,
  initialPlatformSettings,
  initialPlatformAnnouncement,
  initialPendingSubscriptions,
  initialThemePurchaseRequests,
  initialSupportTickets,
  initialPlatformAddons,
  initialAuditLogs,
  initialSecuritySettings,
  initialBroadcastHistory,
  initialAutomationSettings,
  initialAdminTeam,
  initialRolePermissions
} from './data/initialData';

import { PublicPricingLanding } from './components/PublicPricingLanding';
import { PublicCheckout } from './PublicCheckout';
import { AuthFlow } from './components/AuthFlow';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SubscriptionModal } from './components/SubscriptionModal';
import { StorefrontPreviewModal } from './components/StorefrontPreviewModal';
import { TenantStorefrontView } from './components/TenantStorefrontView';
import { SuperAdminPortalView } from './components/SuperAdminPortalView';
import { safeSetItem, safeGetItem, safeRemoveItem } from './utils/safeStorage';

import { DashboardView } from './components/views/DashboardView';
import { PaymentsView } from './components/views/PaymentsView';
import { LogisticsView } from './components/views/LogisticsView';
import { BillingView } from './components/views/BillingView';
import { OrdersView } from './components/views/OrdersView';
import { ProductsView } from './components/views/ProductsView';
import { CustomersView } from './components/views/CustomersView';
import { supabase } from './lib/supabase';
import { MarketingView } from './components/views/MarketingView';
import { AppsWhatsAppView } from './components/views/AppsWhatsAppView';
import { OnlineStoreView } from './components/views/OnlineStoreView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { FinancingView } from './components/views/FinancingView';
import { GrowthView } from './components/views/GrowthView';
import { ChannelsView } from './components/views/ChannelsView';
import { SettingsView } from './components/views/SettingsView';

import { Menu, ShieldAlert, Clock, ArrowUpRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [productSubTab, setProductSubTab] = useState<ProductSubTab>('all_products');
  const [customerSubTab, setCustomerSubTab] = useState<CustomerSubTab>('all_customers');
  const [storeSubTab, setStoreSubTab] = useState<StoreSubTab>('themes');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isPremiumPlan, setIsPremiumPlan] = useState<boolean>(false); // Placeholder for testing premium features
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('zid_theme_mode');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('zid_theme_mode', JSON.stringify(nextMode));
    } catch (e) {
      console.error(e);
    }
  };

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const path = window.location.pathname;
      if (path === '/' || path === '' || path === '/pricing' || path === '/landing') {
        return false;
      }
      const savedSession = localStorage.getItem('zid_auth_session');
      return !!savedSession;
    } catch (e) {
      return false;
    }
  });

  // App Master States
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const path = window.location.pathname;
    if (path === '/' || path === '' || path === '/pricing' || path === '/landing') {
      return true;
    }
    const savedSession = localStorage.getItem('zid_auth_session');
    return !savedSession;
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [preAuthCheckoutPlan, setPreAuthCheckoutPlan] = useState<string | null>(null);

  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  React.useEffect(() => {
    // Auth State Detection on Load & Strict Root Landing Page Routing
    const checkAuthAndRoute = () => {
      const path = window.location.pathname;
      if (path === '/admin' || path === '/super-admin' || path === '/admin-login' || path === '/super-admin-gateway') {
        const adminSession = sessionStorage.getItem('zid_super_admin_auth');
        if (adminSession === 'true') {
          setIsAdminAuthenticated(true);
        }
        return;
      }

      if (path.startsWith('/store/')) {
        return;
      }

      const session = localStorage.getItem('zid_auth_session');

      // Root path (/) must show the Landing Page first.
      // Do NOT automatically redirect unauthenticated users or fresh visitors directly to /dashboard.
      if (path === '/' || path === '' || path === '/pricing' || path === '/landing') {
        setShowLanding(true);
        if (!session) {
          setIsAuthenticated(false);
        }
      } else if (path === '/dashboard' || path.startsWith('/dashboard/')) {
        if (session) {
          setIsAuthenticated(true);
          setShowLanding(false);
          setActiveTab('dashboard');
        } else {
          // Unauthenticated user trying to access /dashboard directly
          setIsAuthenticated(false);
          setShowLanding(true);
          window.history.replaceState({}, '', '/');
          setCurrentPath('/');
        }
      } else if (path === '/register' || path === '/signup') {
        setShowLanding(false);
        setAuthMode('signup');
      } else if (path === '/login' || path === '/signin') {
        setShowLanding(false);
        setAuthMode('login');
      }
    };
    checkAuthAndRoute();
  }, []);

  const [merchant, setMerchant] = useState<MerchantProfile>(() => {
    try {
      const savedSession = localStorage.getItem('zid_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.userProfile) return parsed.userProfile;
      }
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const storeMerchant = JSON.parse(saved).merchant;
        if (storeMerchant) return storeMerchant;
      }
    } catch (e) {
      console.error(e);
    }
    return initialMerchant;
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Supabase Auth listener
  React.useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchMerchantProfile(session.user.id, session.user.email);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchMerchantProfile(session.user.id, session.user.email);
      } else {
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchMerchantProfile = async (userId: string, userEmail?: string) => {
    try {
      let rawData: any = null;
      if (userEmail) {
        try {
          const res = await fetch(`/api/merchants/check/${encodeURIComponent(userEmail.toLowerCase())}`);
          if (res.ok) {
            rawData = await res.json();
          }
        } catch (e) {
          console.warn('Error checking backend merchant:', e);
        }
      }

      if (!rawData && supabase) {
        let query = supabase.from('merchants').select('*');
        if (userId) {
          query = query.or(`auth_user_id.eq.${userId},email.eq.${userEmail || ''}`);
        }
        const { data } = await query.maybeSingle();
        if (data) rawData = data;
      }
      
      if (rawData) {
        const plan = rawData.subscription_plan || rawData.subscriptionPlan || 'enterprise';
        const slug = rawData.store_slug || rawData.storeSlug || 'mystore';
        const name = rawData.store_name || rawData.storeName || 'My Store';
        const owner = rawData.owner_name || rawData.ownerName || 'Merchant Owner';
        const logo = rawData.logo_url || rawData.logoUrl || '';
        const expiry = rawData.subscription_expiry || rawData.subscriptionExpiry;

        setMerchant(prev => ({
          ...prev,
          ...rawData,
          subscriptionPlan: plan,
          storeSlug: slug,
          storeName: name,
          ownerName: owner,
          logoUrl: logo,
          subscriptionExpiry: expiry,
        }));

        if (slug && (window.location.pathname === '/' || window.location.pathname.startsWith('/dashboard'))) {
          window.history.replaceState({}, '', `/dashboard/${slug}`);
          setCurrentPath(`/dashboard/${slug}`);
        }
      }
    } catch (e) {
      console.error('Error fetching merchant profile:', e);
    } finally {
      setAuthLoading(false);
    }
  };

  // Trial & Subscription Logic
  const isPaidPlan = !!merchant?.subscriptionPlan && merchant.subscriptionPlan !== 'free_trial' && merchant.subscriptionPlan !== 'trial';
  const trialEndsAtDate = merchant?.trialEndsAt ? new Date(merchant.trialEndsAt) : null;
  const now = new Date();
  const trialDaysRemaining = trialEndsAtDate 
    ? Math.max(0, Math.ceil((trialEndsAtDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) 
    : (merchant?.trialDaysRemaining ?? 0);
  const isTrialExpired = !isPaidPlan && trialDaysRemaining <= 0;
  const isTrialActive = !isPaidPlan && trialDaysRemaining > 0;

  const prevSlugRef = React.useRef<string>(merchant?.storeSlug || '');

  // Fetch data from DB on mount, storeSlug change, or tab switch
  React.useEffect(() => {
    const merchantId = merchant?.id || merchant?.storeSlug || 'default';
    const storeSlug = merchant?.storeSlug || merchant?.id || 'default';
    let isMounted = true;

    // Safe helper to fetch JSON
    const safeFetch = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      } catch (err) {
        return null;
      }
    };

    // Products
    safeFetch(`/api/products-by-slug/${encodeURIComponent(storeSlug)}`).then(data => {
      if (isMounted && Array.isArray(data)) {
        if (data.length > 0 || products.length === 0) {
          setProducts(data);
        }
      }
    });

    // Merchant Settings & Profile by storeSlug
    if (merchant?.storeSlug) {
      safeFetch(`/api/merchants/slug/${encodeURIComponent(merchant.storeSlug)}`).then(dbMerchant => {
        if (isMounted && dbMerchant) {
          setMerchant(prev => ({
            ...prev,
            ...dbMerchant,
            themeConfig: dbMerchant.themeConfig || dbMerchant.theme_config || prev.themeConfig,
          }));
        }
      });
    }

    // Categories
    safeFetch(`/api/categories-by-slug/${encodeURIComponent(storeSlug)}`).then(data => {
      if (isMounted && Array.isArray(data)) {
        if (data.length > 0 || !(merchant?.themeConfig?.categoriesList?.length)) {
          setMerchant(prev => ({
            ...prev,
            themeConfig: {
              ...(prev.themeConfig || {}),
              categoriesList: data
            }
          }));
        }
      }
    });
      
    // Customers
    safeFetch(`/api/customers/${merchantId}`).then(data => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setCustomers(data);
      }
    });
      
    // Orders
    safeFetch(`/api/orders/${merchantId}`).then(data => {
      if (isMounted && Array.isArray(data) && data.length > 0) {
        setOrders(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [merchant?.id, merchant?.storeSlug, activeTab]);

  // Auto-sync merchant settings and categories to Supabase on change
  React.useEffect(() => {
    if (!merchant || !merchant.storeSlug) return;
    const timer = setTimeout(() => {
      fetch('/api/merchants/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merchant)
      }).catch(err => console.warn('Merchant auto-sync warning:', err));
    }, 800);
    return () => clearTimeout(timer);
  }, [merchant]);

  // Subscription Fetching
  React.useEffect(() => {
    if (merchant && merchant.storeName) {
      let isMounted = true;
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        } catch (err) {
          return null;
        }
      };

      safeFetch(`/api/subscription/by-store/${encodeURIComponent(merchant.storeName)}`).then(data => {
        if (isMounted && data && data.subscription_plan) {
          setMerchant(prev => ({
            ...prev,
            subscriptionPlan: data.subscription_plan,
            subscriptionExpiry: data.subscription_expiry
          }));
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [merchant?.storeName]);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        const accounts: BankAccount[] = parsed.bankAccounts || [];
        return accounts.filter(acc => acc.accountNumber !== '210.120.9876543' && acc.accountNumber !== '101235008912');
      }
    } catch (e) {
      console.error(e);
    }
    return initialBankAccounts;
  });
  
  const [mobileBanking, setMobileBanking] = useState<MobileBankingConfig[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mobileBanking && parsed.mobileBanking.length > 0) {
          const configs: MobileBankingConfig[] = parsed.mobileBanking;
          // Dynamically check and add Rocket if missing
          if (!configs.some((c) => c.provider === 'rocket')) {
            configs.push({
              id: 'mb-rocket',
              provider: 'rocket',
              displayName: 'Rocket Personal / Merchant',
              accountType: 'Personal',
              number: '01911223344',
              isEnabled: false,
              chargePercentage: 1.0,
              instructions: 'Send Money to Rocket Personal (01911223344). Enter your sender Rocket number and Transaction ID in checkout.',
              requireTrxId: true,
              canPayAdvanceCharge: true
            });
          }
          return configs;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return initialMobileBanking;
  });

  const [codConfig, setCodConfig] = useState<CodConfig>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.codConfig) {
          if (parsed.codConfig.insideDhakaFee === 60 && parsed.codConfig.outsideDhakaFee === 120) {
            return initialCodConfig;
          }
          return parsed.codConfig;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return initialCodConfig;
  });

  const [gatewayConfig, setGatewayConfig] = useState<PaymentGatewayConfig>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.gatewayConfig) return parsed.gatewayConfig;
      }
    } catch (e) {
      console.error(e);
    }
    return initialPaymentGateway;
  });

  const [couriers, setCouriers] = useState<CourierService[]>(initialCouriers);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) return JSON.parse(saved).customers || [];
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) return JSON.parse(saved).orders || [];
    } catch (e) {
      console.error(e);
    }
    return [];
  });
  
  const [themes, setThemes] = useState<ThemeConfig[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) return JSON.parse(saved).themes || initialThemes;
    } catch (e) {
      console.error(e);
    }
    return initialThemes;
  });

  React.useEffect(() => {
    try {
      const oldSlug = prevSlugRef.current;
      const newSlug = merchant?.storeSlug || '';

      if (oldSlug && newSlug && oldSlug !== newSlug) {
        // If slug has changed, migrate database data and delete the old entry
        const oldKey = `ZID_MERCHANT_STORE_DATA_${oldSlug}`;
        const newKey = `ZID_MERCHANT_STORE_DATA_${newSlug}`;
        const oldData = safeGetItem(oldKey);
        if (oldData) {
          try {
            const parsed = typeof oldData === 'object' ? oldData : JSON.parse(oldData);
            parsed.merchant = merchant;
            safeSetItem(newKey, parsed);
          } catch (err) {
            safeSetItem(newKey, oldData);
          }
          safeRemoveItem(oldKey);
        }
        
        // Update the ref to the new slug
        prevSlugRef.current = newSlug;
      }

      const storeData = {
        merchant,
        themes,
        bankAccounts,
        mobileBanking,
        codConfig,
        gatewayConfig
      };
      safeSetItem('ZID_MERCHANT_STORE_DATA', storeData);
      if (merchant?.storeSlug) {
        safeSetItem(`ZID_MERCHANT_STORE_DATA_${merchant.storeSlug}`, storeData);
      }

      // Update the main merchants index (allMerchants) by email to prevent old profile/slug from persisting
      setAllMerchants(prev => {
        // Filter out any other stale entry that might have had the old slug
        const filtered = prev.filter(m => m?.storeSlug !== oldSlug || m?.email === merchant?.email);
        const exists = merchant?.email ? filtered.some(m => m?.email === merchant.email) : false;
        const updated = exists
          ? filtered.map(m => m?.email === merchant?.email ? merchant : m)
          : (merchant ? [...filtered, merchant] : filtered);
        safeSetItem('ZID_ALL_MERCHANTS', updated);
        return updated;
      });

      // Synchronize zid_auth_session with updated profile
      const savedSession = safeGetItem('zid_auth_session');
      if (savedSession) {
        try {
          const parsed = typeof savedSession === 'object' ? savedSession : JSON.parse(savedSession);
          parsed.userProfile = merchant;
          safeSetItem('zid_auth_session', parsed);
        } catch (err) {
          console.error(err);
        }
      }

      // Automatically update the storeName in any pending or historical subscription requests for this merchant
      setPendingRequests(prev => {
        const updated = prev.map(req => req?.email === merchant?.email ? { ...req, storeName: merchant?.storeName || 'My Store' } : req);
        safeSetItem('ZID_PENDING_REQUESTS', updated);
        return updated;
      });

    } catch (e) {
      console.error(e);
    }
  }, [merchant, products, themes, bankAccounts, mobileBanking, codConfig, orders, customers]);

  // Super Admin States
  const [adminPaymentConfig, setAdminPaymentConfig] = useState<AdminPaymentGatewayConfig>(() => {
    try {
      const saved = localStorage.getItem('ZID_ADMIN_PAYMENT_CONFIG');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      bkashNumber: '',
      bkashType: 'Personal',
      bkashActive: true,
      nagadNumber: '',
      nagadType: 'Personal',
      nagadActive: true,
      rocketNumber: '',
      rocketType: 'Personal',
      rocketActive: true,
      bankName: '',
      accountName: '',
      accountNumber: '',
      branchName: '',
      routingNumber: '',
      bankActive: true,
      qrTitle: 'Bangla QR',
      qrAccountName: '',
      qrImageUrl: '',
      qrActive: false,
      customGateways: [],
      instructions: 'Send money to our admin accounts and submit your TrxID below for instant verification.',
      enableManualVerification: true
    };
  });

  const [pendingRequests, setPendingRequests] = useState<SubscriptionRequest[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_PENDING_REQUESTS');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialPendingSubscriptions;
  });

  const [themePurchaseRequests, setThemePurchaseRequests] = useState<ThemePurchaseRequest[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_THEME_PURCHASE_REQUESTS');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialThemePurchaseRequests;
  });

  const [allMerchants, setAllMerchants] = useState<MerchantProfile[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_ALL_MERCHANTS');
      if (saved) {
        const parsed: MerchantProfile[] = JSON.parse(saved);
        // Merge with initialAllMerchants to heal/seed themeConfig if missing or empty
        return parsed.map(m => {
          const initial = initialAllMerchants.find(i => i.email === m.email);
          if (initial) {
            const hasThemeConfig = m.themeConfig && Object.keys(m.themeConfig).length > 0;
            return {
              ...initial,
              ...m,
              themeConfig: hasThemeConfig ? m.themeConfig : initial.themeConfig
            };
          }
          return m;
        });
      }
    } catch (e) {
      console.error(e);
    }
    return initialAllMerchants;
  });

  // Platform Level States
  const [platformSettings, setPlatformSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ZID_PLATFORM_SETTINGS');
      return saved ? JSON.parse(saved) : initialPlatformSettings;
    } catch (e) {
      return initialPlatformSettings;
    }
  });

  const [platformAnnouncement, setPlatformAnnouncement] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('ZID_PLATFORM_ANNOUNCEMENT');
      return saved ? JSON.parse(saved) : initialPlatformAnnouncement;
    } catch (e) {
      return initialPlatformAnnouncement;
    }
  });

  const [platformPlans, setPlatformPlans] = useState<SubscriptionPlan[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_PLATFORM_PLANS');
      const parsed = saved ? JSON.parse(saved) : null;
      // Force refresh if the number of plans has changed (e.g. from 3 to 4)
      if (parsed && parsed.length === subscriptionPlans.length) {
        return parsed;
      }
      return subscriptionPlans;
    } catch (e) {
      return subscriptionPlans;
    }
  });

  const [platformThemes, setPlatformThemes] = useState<PlatformTheme[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_PLATFORM_THEMES');
      return saved ? JSON.parse(saved) : initialThemes;
    } catch (e) {
      return initialThemes;
    }
  });

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_SUPPORT_TICKETS');
      return saved ? JSON.parse(saved) : initialSupportTickets;
    } catch (e) {
      return initialSupportTickets;
    }
  });

  const [platformAddons, setPlatformAddons] = useState<PlatformAddon[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_PLATFORM_ADDONS');
      return saved ? JSON.parse(saved) : initialPlatformAddons;
    } catch (e) {
      return initialPlatformAddons;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_AUDIT_LOGS');
      return saved ? JSON.parse(saved) : initialAuditLogs;
    } catch (e) {
      return initialAuditLogs;
    }
  });

  const [platformSecuritySettings, setPlatformSecuritySettings] = useState<PlatformSecuritySettings>(() => {
    try {
      const saved = localStorage.getItem('ZID_SECURITY_SETTINGS');
      return saved ? JSON.parse(saved) : initialSecuritySettings;
    } catch (e) {
      return initialSecuritySettings;
    }
  });

  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_BROADCAST_HISTORY');
      return saved ? JSON.parse(saved) : initialBroadcastHistory;
    } catch (e) {
      return initialBroadcastHistory;
    }
  });

  const [automationSettings, setAutomationSettings] = useState<PlatformAutomationSettings>(() => {
    try {
      const saved = localStorage.getItem('ZID_AUTOMATION_SETTINGS');
      return saved ? JSON.parse(saved) : initialAutomationSettings;
    } catch (e) {
      return initialAutomationSettings;
    }
  });

  const [adminTeam, setAdminTeam] = useState<AdminTeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_ADMIN_TEAM');
      return saved ? JSON.parse(saved) : initialAdminTeam;
    } catch (e) {
      return initialAdminTeam;
    }
  });

  const [rolePermissions, setRolePermissions] = useState<AdminRolePermission[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_ROLE_PERMISSIONS');
      return saved ? JSON.parse(saved) : initialRolePermissions;
    } catch (e) {
      return initialRolePermissions;
    }
  });

  // Keep admin configurations persisted when modified
  React.useEffect(() => {
    try {
      localStorage.setItem('ZID_ADMIN_PAYMENT_CONFIG', JSON.stringify(adminPaymentConfig));
      localStorage.setItem('ZID_PLATFORM_SETTINGS', JSON.stringify(platformSettings));
      localStorage.setItem('ZID_PLATFORM_ANNOUNCEMENT', JSON.stringify(platformAnnouncement));
      localStorage.setItem('ZID_PLATFORM_PLANS', JSON.stringify(platformPlans));
      localStorage.setItem('ZID_PLATFORM_THEMES', JSON.stringify(platformThemes));
      localStorage.setItem('ZID_SUPPORT_TICKETS', JSON.stringify(supportTickets));
      localStorage.setItem('ZID_PLATFORM_ADDONS', JSON.stringify(platformAddons));
      localStorage.setItem('ZID_AUDIT_LOGS', JSON.stringify(auditLogs));
      localStorage.setItem('ZID_SECURITY_SETTINGS', JSON.stringify(platformSecuritySettings));
      localStorage.setItem('ZID_BROADCAST_HISTORY', JSON.stringify(broadcastHistory));
      localStorage.setItem('ZID_AUTOMATION_SETTINGS', JSON.stringify(automationSettings));
      localStorage.setItem('ZID_ADMIN_TEAM', JSON.stringify(adminTeam));
      localStorage.setItem('ZID_ROLE_PERMISSIONS', JSON.stringify(rolePermissions));
    } catch (e) {
      console.error(e);
    }
  }, [adminPaymentConfig, platformSettings, platformAnnouncement, platformPlans, platformThemes, supportTickets, platformAddons, auditLogs, platformSecuritySettings, broadcastHistory, automationSettings, adminTeam, rolePermissions]);

  React.useEffect(() => {
    try {
      localStorage.setItem('ZID_PENDING_REQUESTS', JSON.stringify(pendingRequests));
    } catch (e) {
      console.error(e);
    }
  }, [pendingRequests]);

  React.useEffect(() => {
    try {
      localStorage.setItem('ZID_ALL_MERCHANTS', JSON.stringify(allMerchants));
    } catch (e) {
      console.error(e);
    }
  }, [allMerchants]);

  // Dynamic Site Title and Favicon Synchronization
  React.useEffect(() => {
    const title = platformSettings?.siteTitle ? `${platformSettings.siteTitle} BD` : 'ZID SAAS BD';
    document.title = title;

    const faviconEl = document.getElementById('app-favicon') as HTMLLinkElement;
    if (faviconEl) {
      if (platformSettings?.logoUrl) {
        faviconEl.href = platformSettings.logoUrl;
      } else {
        faviconEl.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='gold' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23BF953F'/%3E%3Cstop offset='50%25' stop-color='%23FCF6BA'/%3E%3Cstop offset='100%25' stop-color='%23AA771C'/%3E%3C/linearGradient%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23181B26'/%3E%3Cstop offset='100%25' stop-color='%230E1017'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='16' fill='url(%23bg)' stroke='%23D4AF37' stroke-width='2.5'/%3E%3Cpath d='M18 20 H46 L26 44 H46' stroke='url(%23gold)' stroke-width='6.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3Ccircle cx='46' cy='20' r='3.5' fill='%23FCF6BA'/%3E%3Ccircle cx='18' cy='44' r='3.5' fill='%23BF953F'/%3E%3C/svg%3E";
      }
    }
  }, [platformSettings?.siteTitle, platformSettings?.logoUrl]);

  React.useEffect(() => {
    try {
      localStorage.setItem('ZID_THEME_PURCHASE_REQUESTS', JSON.stringify(themePurchaseRequests));
    } catch (e) {
      console.error(e);
    }
  }, [themePurchaseRequests]);

  const handleAddThemePurchaseRequest = (req: ThemePurchaseRequest) => {
    setThemePurchaseRequests(prev => [req, ...prev]);
  };

  // Modal States
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isStorefrontPreviewOpen, setIsStorefrontPreviewOpen] = useState(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Super Admin Security States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string>('');

  const handleLoginSuccess = (userProfile: MerchantProfile) => {
    setMerchant(userProfile);
    setIsAuthenticated(true);
    setShowLanding(false);
    
    // Explicit Dashboard Navigation
    const slug = userProfile.storeSlug || 'my-store';
    window.history.pushState({}, '', `/dashboard/${slug}`);
    setCurrentPath(`/dashboard/${slug}`);
    setActiveTab('dashboard');

    const intendedPlan = localStorage.getItem('zid_intended_plan');
    const prePayment = localStorage.getItem('zid_pre_payment');

    const isAlreadyPaid = userProfile.subscriptionPlan && userProfile.subscriptionPlan !== 'free_trial' && userProfile.subscriptionPlan !== 'trial';

    if (!isAlreadyPaid && intendedPlan && intendedPlan !== 'free_trial' && !prePayment) {
      setIsSubscriptionModalOpen(true);
    }

    try {
      // Restore this logged-in merchant's specific data from database
      const stored = localStorage.getItem(`ZID_MERCHANT_STORE_DATA_${userProfile.storeSlug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.bankAccounts) setBankAccounts(parsed.bankAccounts);
        if (parsed.mobileBanking) setMobileBanking(parsed.mobileBanking);
        if (parsed.codConfig) setCodConfig(parsed.codConfig);
        if (parsed.orders) setOrders(parsed.orders);
        if (parsed.themes) setThemes(parsed.themes);
      } else {
        // Fallback or fresh merchant setup
        setProducts([]);
        setBankAccounts([]);
        setMobileBanking(initialMobileBanking);
        setCodConfig(initialCodConfig);
        setOrders([]);
        setThemes([]);
      }
    } catch (e) {
      console.error('Error restoring merchant workspace:', e);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('zid_auth_session');
      localStorage.removeItem('zid_intended_plan');
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setShowLanding(true);
    window.history.pushState({}, '', '/');
    setCurrentPath('/');
  };

  const handleToggleCurrency = () => {
    setMerchant((prev) => ({
      ...prev,
      currency: prev.currency === 'BDT' ? 'USD' : 'BDT',
    }));
  };

  const handleConfirmSubscription = async (planId: string, paymentMethod: string, txId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId) || subscriptionPlans[1];
    
    // Calculate expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    const newReq: SubscriptionRequest = {
      id: `req-${Date.now()}`,
      storeName: merchant?.storeName || 'My Store',
      email: merchant?.email || '',
      planId,
      planName: plan.name,
      amountBDT: plan.price,
      paymentMethod,
      transactionId: txId,
      requestedAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    setPendingRequests(prev => [newReq, ...prev]);

    // Update DB (e.g. status) - actually user only asked to persist when upgraded.
    // For now, let's keep the pending request flow as it is, but also
    // update subscriptionPlan and expiryDate in DB when approved.
    // Wait, the user asked to persist when they purchase/upgrade.
    // So I should do this upon submission as well? 
    // The request said: "When a merchant purchases/upgrades... Persist...".
    // I will do it here, assuming 'pending' approval is how upgrades are processed.

    try {
        await fetch('/api/subscription/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                storeName: merchant?.storeName,
                planId,
                expiryDate: expiryDateStr
            })
        });
        // Update local state
        setMerchant(prev => ({...prev, subscriptionPlan: planId as any, subscriptionExpiry: expiryDateStr}));
    } catch (e) {
        console.error('Failed to update subscription in DB', e);
    }
    
    alert(`Subscription request submitted successfully! Your Transaction ID (${txId}) is pending Super Admin verification.`);
  };

  const handleUpdateCustomers = async (updatedCustomers: Customer[]) => {
    setCustomers(updatedCustomers);
    if (merchant?.id) {
        await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCustomers.map(c => ({...c, merchantId: merchant.id})))
        }).catch(err => console.error('Error updating customers in DB:', err));
    }
  };

  const handleUpdateOrders = async (updatedOrders: Order[]) => {
    setOrders(updatedOrders);
    if (merchant?.id) {
        await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedOrders.map(o => ({...o, merchantId: merchant.id})))
        }).catch(err => console.error('Error updating orders in DB:', err));
    }
  };

  if (currentPath.startsWith('/store/')) {
    const storeSlug = currentPath.replace('/store/', '').split('/')[0];
    
    // Retrieve direct custom tenant store configurations from database
    let targetMerchant = merchant;
    let targetProducts = products;
    let targetBankAccounts = bankAccounts;
    let targetMobileBanking = mobileBanking;
    let targetThemes = themes;

    try {
      // Fetch precise custom configuration using unique store slug
      const customStoreDataStr = localStorage.getItem(`ZID_MERCHANT_STORE_DATA_${storeSlug}`);
      if (customStoreDataStr) {
        const parsed = JSON.parse(customStoreDataStr);
        if (parsed.merchant) targetMerchant = parsed.merchant;
        if (parsed.products) targetProducts = parsed.products;
        if (parsed.bankAccounts) targetBankAccounts = parsed.bankAccounts;
        if (parsed.mobileBanking) targetMobileBanking = parsed.mobileBanking;
        if (parsed.themes) targetThemes = parsed.themes;
      } else {
        // Fallback search in general merchant profiles index
        const matchedProfile = allMerchants.find(m => m.storeSlug === storeSlug);
        if (matchedProfile) {
          targetMerchant = matchedProfile;
        }
      }
    } catch (e) {
      console.error('Error fetching custom theme from database:', e);
    }

    return (
      <TenantStorefrontView
        storeSlug={storeSlug || targetMerchant.storeSlug}
        merchant={targetMerchant}
        products={targetProducts}
        bankAccounts={targetBankAccounts}
        mobileBanking={targetMobileBanking}
        themes={targetThemes}
        onPlaceOrder={(newOrder) => {
          try {
            // Persist order details back to that store's custom record
            const key = `ZID_MERCHANT_STORE_DATA_${storeSlug}`;
            const customStoreDataStr = localStorage.getItem(key);
            if (customStoreDataStr) {
              const parsed = JSON.parse(customStoreDataStr);
              parsed.orders = [newOrder, ...(parsed.orders || [])];
              localStorage.setItem(key, JSON.stringify(parsed));
            }
            // Append to current logged-in orders view if active
            if (merchant?.storeSlug === storeSlug) {
              setOrders(prev => [newOrder, ...prev]);
            }
          } catch (e) {
            console.error('Error recording order to database:', e);
          }
        }}
      />
    );
  }

  const isSuperAdminRoute = 
    currentPath === '/admin' || 
    currentPath === '/super-admin' || 
    currentPath === '/admin-login' || 
    currentPath === '/super-admin-gateway' || 
    activeTab === 'super_admin_portal';

  if (isSuperAdminRoute) {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#12151F] text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="bg-[#181B26] border border-[#2E3548] p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Super Admin Gateway</h1>
                <p className="text-xs text-slate-400">Restricted Enterprise Platform Access</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (adminPasswordInput === '3565') {
                setIsAdminAuthenticated(true);
                sessionStorage.setItem('zid_super_admin_auth', 'true');
                setAdminLoginError('');
              } else {
                setAdminLoginError('Invalid Master Password.');
              }
            }} className="space-y-4">
              <div>
                <label className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Master Password / PIN</span>
                  <span className="text-[10px] text-slate-500 font-normal">Default PIN: 3565</span>
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full bg-[#202533] border border-[#3A435E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  required
                />
              </div>

              {adminLoginError && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs font-bold">
                  {adminLoginError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    window.history.pushState({}, '', '/dashboard');
                    setCurrentPath('/dashboard');
                  }}
                  className="flex-1 bg-[#202533] hover:bg-[#282E3F] text-slate-300 font-bold py-3 rounded-xl text-sm transition border border-[#3A435E] cursor-pointer"
                >
                  Return to Store
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <SuperAdminPortalView
        currentMerchant={merchant}
        onUpdateMerchant={setMerchant}
        adminPaymentConfig={adminPaymentConfig}
        onUpdateAdminPaymentConfig={setAdminPaymentConfig}
        pendingRequests={pendingRequests}
        onUpdatePendingRequests={setPendingRequests}
        themePurchaseRequests={themePurchaseRequests}
        onUpdateThemePurchaseRequests={setThemePurchaseRequests}
        allMerchants={allMerchants}
        onUpdateAllMerchants={setAllMerchants}
        onSwitchToMerchantPortal={() => {
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('zid_super_admin_auth');
          setActiveTab('dashboard');
          window.history.pushState({}, '', '/dashboard');
          setCurrentPath('/dashboard');
        }}
        onLoginAsMerchant={(m) => {
          setMerchant(m);
          setIsAdminAuthenticated(false);
          sessionStorage.removeItem('zid_super_admin_auth');
          setIsAuthenticated(true);
          setShowLanding(false);
          setActiveTab('dashboard');
          window.history.pushState({}, '', '/dashboard');
          setCurrentPath('/dashboard');
        }}
        platformSettings={platformSettings}
        onUpdatePlatformSettings={setPlatformSettings}
        platformAnnouncement={platformAnnouncement}
        onUpdatePlatformAnnouncement={setPlatformAnnouncement}
        platformPlans={platformPlans}
        onUpdatePlatformPlans={setPlatformPlans}
        platformThemes={platformThemes}
        onUpdatePlatformThemes={setPlatformThemes}
        supportTickets={supportTickets}
        onUpdateSupportTickets={setSupportTickets}
        platformAddons={platformAddons}
        onUpdatePlatformAddons={setPlatformAddons}
        auditLogs={auditLogs}
        onUpdateAuditLogs={setAuditLogs}
        securitySettings={platformSecuritySettings}
        onUpdateSecuritySettings={setPlatformSecuritySettings}
        broadcastHistory={broadcastHistory}
        onUpdateBroadcastHistory={setBroadcastHistory}
        automationSettings={automationSettings}
        onUpdateAutomationSettings={setAutomationSettings}
        adminTeam={adminTeam}
        onUpdateAdminTeam={setAdminTeam}
        rolePermissions={rolePermissions}
        onUpdateRolePermissions={setRolePermissions}
      />
    );
  }

  if (showLanding) {
    return (
      <PublicPricingLanding
        isAuthenticated={isAuthenticated}
        onGoToDashboard={() => {
          setShowLanding(false);
          setActiveTab('dashboard');
          window.history.pushState({}, '', '/dashboard');
          setCurrentPath('/dashboard');
        }}
        onSelectPlan={(planId) => {
          if (planId === 'free_trial') {
            localStorage.setItem('zid_intended_plan', planId);
            setAuthMode('signup');
            setShowLanding(false);
          } else {
            setPreAuthCheckoutPlan(planId);
            setShowLanding(false);
          }
        }}
        onLoginClick={() => {
          setAuthMode('login');
          setShowLanding(false);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    if (preAuthCheckoutPlan) {
      return (
        <PublicCheckout
          planId={preAuthCheckoutPlan}
          adminPaymentConfig={adminPaymentConfig}
          onPaymentSuccess={(txId: string) => {
            localStorage.setItem('zid_pre_payment', JSON.stringify({ planId: preAuthCheckoutPlan, txId }));
            setPreAuthCheckoutPlan(null);
            setAuthMode('signup');
          }}
          onCancel={() => {
            setPreAuthCheckoutPlan(null);
            setShowLanding(true);
          }}
        />
      );
    }

    return (
      <AuthFlow
        onLoginSuccess={handleLoginSuccess}
        defaultMerchant={initialMerchant}
        onAdminAccess={() => {
          setIsAdminAuthenticated(true);
          setActiveTab('super_admin_portal');
        }}
        initialMode={authMode}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans selection:bg-[#D4AF37] selection:text-slate-950 transition-colors duration-200 ${
      isDarkMode ? 'bg-[#141721] text-slate-100' : 'bg-[#F4F6F9] text-slate-900'
    }`}>
      {/* Global Platform Announcement */}
      {platformAnnouncement.isActive && (
        <div className={`py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-[0.1em] shadow-sm relative z-[100] ${
          platformAnnouncement.type === 'urgent' ? 'bg-red-600 text-white' : 
          platformAnnouncement.type === 'warning' ? 'bg-orange-500 text-slate-950' : 
          'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950'
        }`}>
          {platformAnnouncement.message}
        </div>
      )}

      {/* TRIAL EXPIRY LOCK SCREEN */}
      {isTrialExpired && (
        <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1e293b] border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">ট্রায়াল শেষ হয়েছে!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                আপনার ৩০ দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে! দোকান চালু রাখতে এবং সেলস অব্যাহত রাখতে অনুগ্রহ করে একটি প্ল্যান বেছে নিন।
              </p>
            </div>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
            >
              এখনই প্ল্যান বেছে নিন
            </button>
          </div>
        </div>
      )}

      {/* Trial Countdown Banner */}
      {isTrialActive && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs md:text-sm font-medium text-slate-200">
                আপনার ফ্রি ট্রায়ালের আর <span className="text-white font-black px-1.5 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/30">{trialDaysRemaining} দিন</span> বাকি আছে। এখনই প্ল্যান বেছে নিন।
              </p>
            </div>
            <button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-400 hover:text-white transition-colors"
            >
              <span>View Plans</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          productSubTab={productSubTab}
          onSelectProductSubTab={setProductSubTab}
          customerSubTab={customerSubTab}
          onSelectCustomerSubTab={setCustomerSubTab}
          storeSubTab={storeSubTab}
          onSelectStoreSubTab={setStoreSubTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          ordersBadgeCount={orders.length}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
          isDarkMode={isDarkMode}
          platformSettings={platformSettings}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Sticky Header */}
          <Header
            merchant={merchant}
            orders={orders}
            products={products}
            merchants={allMerchants}
            pendingRequests={pendingRequests}
            platformSettings={platformSettings}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
            onOpenStorefrontPreview={() => setIsStorefrontPreviewOpen(true)}
            onToggleCurrency={handleToggleCurrency}
            onLogout={handleLogout}
            onNavigateTab={setActiveTab}
            onQuickAddProduct={() => setActiveTab('products')}
            onToggleSidebarMobile={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          {/* View Container */}
          <main className="p-4 lg:p-6 max-w-7xl w-full mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                merchant={merchant}
                orders={orders}
                products={products}
                onNavigateTab={setActiveTab}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                orders={orders}
                onUpdateOrders={handleUpdateOrders}
                merchantId={merchant?.id}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                onUpdateProducts={setProducts}
                activeSubTab={productSubTab}
                onSelectSubTab={setProductSubTab}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                merchant={merchant}
                platformSettings={platformSettings}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersView
                customers={customers}
                onUpdateCustomers={handleUpdateCustomers}
                activeSubTab={customerSubTab}
                onSelectSubTab={setCustomerSubTab}
              />
            )}

            {activeTab === 'marketing' && (
              <MarketingView 
                merchant={merchant} 
                platformSettings={platformSettings} 
                adminPaymentConfig={adminPaymentConfig}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)} 
              />
            )}

            {(activeTab === 'whatsapp' || activeTab === 'apps') && (
              <AppsWhatsAppView merchant={merchant} platformSettings={platformSettings} onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)} />
            )}

            {activeTab === 'store' && (
              <OnlineStoreView
                onOpenStorefrontPreview={() => setIsStorefrontPreviewOpen(true)}
                activeSubTab={storeSubTab}
                onSelectSubTab={setStoreSubTab}
                merchant={merchant}
                setMerchant={setMerchant}
                adminPaymentConfig={adminPaymentConfig}
                themePurchaseRequests={themePurchaseRequests}
                onAddThemePurchaseRequest={handleAddThemePurchaseRequest}
                isPremiumPlan={isPremiumPlan}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView orders={orders} />
            )}

            {activeTab === 'logistics' && (
              <LogisticsView
                merchant={merchant}
                couriers={couriers}
                codConfig={codConfig}
                onUpdateCouriers={setCouriers}
                onUpdateCodConfig={setCodConfig}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsView
                bankAccounts={bankAccounts}
                mobileBanking={mobileBanking}
                codConfig={codConfig}
                gatewayConfig={gatewayConfig}
                onUpdateBankAccounts={setBankAccounts}
                onUpdateMobileBanking={setMobileBanking}
                onUpdateCodConfig={setCodConfig}
                onUpdateGatewayConfig={setGatewayConfig}
              />
            )}

            {activeTab === 'financing' && (
              <FinancingView merchant={merchant} />
            )}

            {activeTab === 'growth' && (
              <GrowthView 
                merchant={merchant} 
                onSwitchToBilling={() => setActiveTab('billing')}
              />
            )}

            {activeTab === 'channels' && (
              <ChannelsView />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                merchant={merchant}
                onUpdateMerchant={setMerchant}
              />
            )}

            {activeTab === 'billing' && (
              <BillingView
                merchant={merchant}
                pendingRequests={pendingRequests}
                onOpenSubscriptionModal={() => setIsSubscriptionModalOpen(true)}
                onBack={() => setActiveTab('settings')}
              />
            )}
          </main>
        </div>
      </div>

      {/* Subscription Plan Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        merchant={merchant}
        pendingRequests={pendingRequests}
        onConfirmSubscription={handleConfirmSubscription}
        adminPaymentConfig={adminPaymentConfig}
        initialPlanId={localStorage.getItem('zid_intended_plan') || undefined}
      />

      {/* Storefront Customer Preview Drawer Modal */}
      <StorefrontPreviewModal
        isOpen={isStorefrontPreviewOpen}
        onClose={() => setIsStorefrontPreviewOpen(false)}
        merchant={merchant}
        products={products}
        bankAccounts={bankAccounts}
        mobileBanking={mobileBanking}
      />

      {/* Admin Login Modal for In-App Preview */}
      {isAdminLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181B26] border border-[#2E3548] p-8 rounded-2xl max-w-md w-full space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsAdminLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Super Admin Portal Gateway</h3>
                <p className="text-xs text-slate-400">Enter authorization passcode to proceed.</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (adminPasswordInput === '3565') {
                setIsAdminAuthenticated(true);
                setIsAdminLoginModalOpen(false);
                setAdminLoginError('');
                setActiveTab('super_admin_portal');
              } else {
                setAdminLoginError('Invalid Master Password.');
              }
            }} className="space-y-4">
              <div>
                <label className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Master Password / PIN</span>
                  <span className="text-[10px] text-slate-500 font-normal">Default PIN: 3565</span>
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter admin password..."
                  className="w-full bg-[#202533] border border-[#3A435E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  required
                  autoFocus
                />
              </div>

              {adminLoginError && (
                <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs font-bold">
                  {adminLoginError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminLoginModalOpen(false)}
                  className="flex-1 bg-[#202533] hover:bg-[#282E3F] text-slate-300 font-bold py-3 rounded-xl text-sm transition border border-[#3A435E] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  Unlock Admin Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
