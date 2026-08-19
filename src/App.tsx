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
  initialProducts, 
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

import { DashboardView } from './components/views/DashboardView';
import { PaymentsView } from './components/views/PaymentsView';
import { LogisticsView } from './components/views/LogisticsView';
import { BillingView } from './components/views/BillingView';
import { OrdersView } from './components/views/OrdersView';
import { ProductsView } from './components/views/ProductsView';
import { CustomersView } from './components/views/CustomersView';
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
      const savedSession = localStorage.getItem('zid_auth_session');
      return !!savedSession;
    } catch (e) {
      return false;
    }
  });

  // App Master States
  const [showLanding, setShowLanding] = useState<boolean>(!isAuthenticated);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [preAuthCheckoutPlan, setPreAuthCheckoutPlan] = useState<string | null>(null);

  React.useEffect(() => {
    // Auth State Detection on Load & Automatic Dashboard Redirect
    const checkAuthAndRoute = () => {
      const session = localStorage.getItem('zid_auth_session');
      if (session) {
        setIsAuthenticated(true);
        setShowLanding(false);
        if (window.location.pathname === '/' || window.location.pathname === '/pricing') {
          window.history.replaceState({}, '', '/dashboard');
        }
      } else {
        setIsAuthenticated(false);
        if (window.location.pathname === '/dashboard') {
          window.history.replaceState({}, '', '/');
          setShowLanding(true);
        }
      }
    };
    checkAuthAndRoute();
  }, []);

  const [merchant, setMerchant] = useState<MerchantProfile>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) return JSON.parse(saved).merchant || initialMerchant;
      const savedSession = localStorage.getItem('zid_auth_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.userProfile) return parsed.userProfile;
      }
    } catch (e) {
      console.error(e);
    }
    return initialMerchant;
  });

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
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) return JSON.parse(saved).orders || initialOrders;
    } catch (e) {
      console.error(e);
    }
    return initialOrders;
  });
  
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const savedProducts = localStorage.getItem('zid_merchant_products');
      if (savedProducts) return JSON.parse(savedProducts);

      const saved = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.products) return parsed.products;
      }
    } catch (e) {
      console.error(e);
    }
    return initialProducts;
  });
  
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  
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
        const oldData = localStorage.getItem(oldKey);
        if (oldData) {
          try {
            const parsed = JSON.parse(oldData);
            parsed.merchant = merchant;
            localStorage.setItem(newKey, JSON.stringify(parsed));
          } catch (err) {
            localStorage.setItem(newKey, oldData);
          }
          localStorage.removeItem(oldKey);
        }
        
        // Update the ref to the new slug
        prevSlugRef.current = newSlug;
      }

      const storeData = {
        merchant,
        products,
        themes,
        bankAccounts,
        mobileBanking,
        codConfig,
        gatewayConfig,
        orders
      };
      localStorage.setItem('ZID_MERCHANT_STORE_DATA', JSON.stringify(storeData));
      if (merchant?.storeSlug) {
        localStorage.setItem(`ZID_MERCHANT_STORE_DATA_${merchant.storeSlug}`, JSON.stringify(storeData));
      }
      localStorage.setItem('zid_merchant_products', JSON.stringify(products));

      // Update the main merchants index (allMerchants) by email to prevent old profile/slug from persisting
      setAllMerchants(prev => {
        // Filter out any other stale entry that might have had the old slug
        const filtered = prev.filter(m => m?.storeSlug !== oldSlug || m?.email === merchant?.email);
        const exists = merchant?.email ? filtered.some(m => m?.email === merchant.email) : false;
        const updated = exists
          ? filtered.map(m => m?.email === merchant?.email ? merchant : m)
          : (merchant ? [...filtered, merchant] : filtered);
        localStorage.setItem('ZID_ALL_MERCHANTS', JSON.stringify(updated));
        return updated;
      });

      // Synchronize zid_auth_session with updated profile
      const savedSession = localStorage.getItem('zid_auth_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          parsed.userProfile = merchant;
          localStorage.setItem('zid_auth_session', JSON.stringify(parsed));
        } catch (err) {
          console.error(err);
        }
      }

      // Automatically update the storeName in any pending or historical subscription requests for this merchant
      setPendingRequests(prev => {
        const updated = prev.map(req => req?.email === merchant?.email ? { ...req, storeName: merchant?.storeName || 'My Store' } : req);
        localStorage.setItem('ZID_PENDING_REQUESTS', JSON.stringify(updated));
        return updated;
      });

    } catch (e) {
      console.error(e);
    }
  }, [merchant, products, themes, bankAccounts, mobileBanking, codConfig, orders]);

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

  // Pre-seed individual store databases if not yet initialized
  React.useEffect(() => {
    const seedStores = [
      {
        slug: 'gadget-hub',
        merchant: initialAllMerchants.find(m => m.storeSlug === 'gadget-hub')!,
        products: [
          {
            id: 'gh-p1',
            title: 'Wireless ANC Over-Ear Headphones - Studio Pro',
            sku: 'GH-ANC-01',
            category: 'Audio Gear',
            priceBDT: 4800,
            compareAtPriceBDT: 5800,
            stock: 25,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 14,
            descriptionEn: 'Experience high-fidelity audio with active noise cancellation. 40-hour battery life.'
          },
          {
            id: 'gh-p2',
            title: 'RGB Mechanical Gaming Keyboard - Blue Switch',
            sku: 'GH-KB-RGB',
            category: 'Gaming Tools',
            priceBDT: 3200,
            compareAtPriceBDT: 3800,
            stock: 18,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 29,
            descriptionEn: 'Tactile blue switches, custom dynamic RGB backlighting, durable aluminum plate.'
          },
          {
            id: 'gh-p3',
            title: 'Smart Watch Series Ultra - GPS + Cellular',
            sku: 'GH-SW-ULTRA',
            category: 'Wearables',
            priceBDT: 6500,
            compareAtPriceBDT: 8000,
            stock: 12,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 8,
            descriptionEn: 'AMOLED always-on display, heart-rate tracking, blood oxygen levels, and multi-sport mode.'
          },
          {
            id: 'gh-p4',
            title: 'Power Bank 20,000mAh - 22.5W Fast Charge',
            sku: 'GH-PB-20K',
            category: 'Power Devices',
            priceBDT: 1950,
            compareAtPriceBDT: 2400,
            stock: 40,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 42,
            descriptionEn: 'Compact high-capacity power bank supporting fast charging for all iOS and Android devices.'
          }
        ],
        bankAccounts: [
          {
            id: 'ba-gh',
            bankName: 'City Bank PLC',
            accountName: 'Dhaka Gadget Hub Ltd',
            accountNumber: '1102938172901',
            branchName: 'Dhanmondi Branch',
            routingNumber: '090150115',
            isEnabled: true,
            instructions: 'Transfer full amount to our City Bank account and mention order number in reference. Upload transfer receipt/screenshot.'
          }
        ],
        mobileBanking: [
          {
            id: 'mb-gh-bkash',
            provider: 'bkash',
            displayName: 'bKash Merchant Payment',
            accountType: 'Merchant',
            number: '01812345678',
            isEnabled: true,
            instructions: 'Dial *247# or open bKash app, make a Payment to our merchant number 01812345678. Paste Transaction ID below.',
            requireTrxId: true
          }
        ]
      },
      {
        slug: 'sylhet-organic',
        merchant: initialAllMerchants.find(m => m.storeSlug === 'sylhet-organic')!,
        products: [
          {
            id: 'so-p1',
            title: 'Sylhet Premium Black Tea - Sreemangal Gold',
            sku: 'SO-TEA-SREGOLD',
            category: 'Organic Tea',
            priceBDT: 420,
            compareAtPriceBDT: 480,
            stock: 100,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 110,
            descriptionEn: 'Exquisite leaf blend from Sreemangal\'s finest tea estate. Bold flavor and rich aroma.'
          },
          {
            id: 'so-p2',
            title: 'Cold-Pressed Mustard Oil (Kani Sorishar Tel)',
            sku: 'SO-OIL-MUSTARD',
            category: 'Farm Oils',
            priceBDT: 360,
            compareAtPriceBDT: 420,
            stock: 50,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 95,
            descriptionEn: 'Traditionally extracted cold-pressed mustard oil with an intense flavor and high health benefits.'
          },
          {
            id: 'so-p3',
            title: 'Wild Forest Raw Sundarban Honey 500g',
            sku: 'SO-HONEY-WILD',
            category: 'Honey & Ghee',
            priceBDT: 880,
            compareAtPriceBDT: 980,
            stock: 35,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 47,
            descriptionEn: '100% natural, unfiltered raw honey harvested ethically from the deep mangrove forests of Sundarbans.'
          },
          {
            id: 'so-p4',
            title: 'Traditional Cow Ghee - Pure A2 500g',
            sku: 'SO-GHEE-COW',
            category: 'Honey & Ghee',
            priceBDT: 1150,
            compareAtPriceBDT: 1250,
            stock: 20,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1631730359575-38e4755d772b?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 15,
            descriptionEn: 'Pure handmade cow ghee churned using traditional Bilona method for exquisite taste and granular texture.'
          }
        ],
        bankAccounts: [],
        mobileBanking: [
          {
            id: 'mb-so-bkash',
            provider: 'bkash',
            displayName: 'bKash Personal Direct',
            accountType: 'Personal',
            number: '01712345678',
            isEnabled: true,
            instructions: 'Send Money to our bKash Personal number 01712345678. Enter Transaction ID below.',
            requireTrxId: true
          }
        ]
      },
      {
        slug: 'ctg-fashion',
        merchant: initialAllMerchants.find(m => m.storeSlug === 'ctg-fashion')!,
        products: [
          {
            id: 'cf-p1',
            title: 'Handcrafted Tangail Cotton Saree - Crimson Red',
            sku: 'CF-SR-COTTON',
            category: 'Sarees & Ethnic',
            priceBDT: 3400,
            compareAtPriceBDT: 4200,
            stock: 15,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 38,
            descriptionEn: 'Beautifully woven Tangail pure cotton handloom saree with elegant zari border work. Authentic Bangladeshi design.'
          },
          {
            id: 'cf-p2',
            title: 'Men\'s Semi-Formal Slim Fit Shirt - Classic White',
            sku: 'CF-SH-WHITE',
            category: 'Menswear',
            priceBDT: 1650,
            compareAtPriceBDT: 1950,
            stock: 30,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 54,
            descriptionEn: 'Tailored slim-fit long sleeve casual/semi-formal shirt made from 100% breathable premium Giza cotton.'
          },
          {
            id: 'cf-p3',
            title: 'Chittagong Traditional Block-Printed Designer Kurti',
            sku: 'CF-KT-BLOCK',
            category: 'Womenswear',
            priceBDT: 1850,
            compareAtPriceBDT: 2200,
            stock: 22,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 43,
            descriptionEn: 'Hand-block printed kurti with delicate hand-stitched detailing. Perfect for festivals and daily elegant wear.'
          },
          {
            id: 'cf-p4',
            title: 'Genuine Leather Trifold Wallet - Dark Tan',
            sku: 'CF-WL-LEATHER',
            category: 'Accessories',
            priceBDT: 1250,
            compareAtPriceBDT: 1500,
            stock: 15,
            status: 'Active',
            image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80',
            variantsCount: 0,
            salesCount: 27,
            descriptionEn: 'Handcrafted from 100% genuine full-grain leather, featuring multiple card slots, ID window, and cash compartment.'
          }
        ],
        bankAccounts: [
          {
            id: 'ba-cf',
            bankName: 'Eastern Bank PLC',
            accountName: 'Chittagong Fashion House Ltd',
            accountNumber: '1012948271048',
            branchName: 'GEC Branch',
            routingNumber: '095150115',
            isEnabled: true,
            instructions: 'Send payment via Eastern Bank and paste the transaction details.'
          }
        ],
        mobileBanking: [
          {
            id: 'mb-cf-nagad',
            provider: 'nagad',
            displayName: 'Nagad Merchant Payment',
            accountType: 'Merchant',
            number: '01912345678',
            isEnabled: true,
            instructions: 'Send money to our Nagad Merchant number 01912345678.',
            requireTrxId: true
          }
        ]
      }
    ];

    seedStores.forEach(store => {
      const key = `ZID_MERCHANT_STORE_DATA_${store.slug}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({
          merchant: store.merchant,
          products: store.products,
          themes: [],
          bankAccounts: store.bankAccounts,
          mobileBanking: store.mobileBanking,
          codConfig: {
            isEnabled: true,
            insideDhakaFee: '80',
            outsideDhakaFee: '150',
            subDhakaFee: '100',
            freeShippingThreshold: '5000',
            maxOrderLimit: '10000',
            requestAdvanceDeliveryCharge: false,
            advanceDeliveryChargeAmount: '',
            notes: 'Thanks for shopping at ' + (store?.merchant?.storeName || 'My Store')
          },
          orders: []
        }));
      }
    });
  }, []);

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
    
    // Automatic Dashboard Redirect
    window.history.pushState({}, '', '/dashboard');
    setActiveTab('dashboard');

    const intendedPlan = localStorage.getItem('zid_intended_plan');
    const prePayment = localStorage.getItem('zid_pre_payment');

    if (intendedPlan && intendedPlan !== 'free_trial' && !prePayment) {
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
  };

  const handleToggleCurrency = () => {
    setMerchant((prev) => ({
      ...prev,
      currency: prev.currency === 'BDT' ? 'USD' : 'BDT',
    }));
  };

  const handleConfirmSubscription = (planId: string, paymentMethod: string, txId: string) => {
    const plan = subscriptionPlans.find(p => p.id === planId) || subscriptionPlans[1];
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
    alert(`Subscription request submitted successfully! Your Transaction ID (${txId}) is pending Super Admin verification.`);
  };

  const currentPath = window.location.pathname;
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

  if (currentPath === '/admin-login' || currentPath === '/super-admin-gateway' || activeTab === 'super_admin_portal') {
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
                    window.history.pushState({}, '', '/');
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
          setActiveTab('dashboard');
          window.history.pushState({}, '', '/');
        }}
        onLoginAsMerchant={(m) => {
          setMerchant(m);
          setIsAdminAuthenticated(false);
          setActiveTab('dashboard');
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

  if (!isAuthenticated) {
    if (showLanding) {
      return (
        <PublicPricingLanding
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
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Sticky Header */}
          <Header
            merchant={merchant}
            orders={orders}
            products={products}
            merchants={allMerchants}
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
                onUpdateOrders={setOrders}
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
                onUpdateCustomers={setCustomers}
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
