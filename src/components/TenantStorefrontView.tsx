import React, { useState, useEffect } from 'react';
import { MerchantProfile, Product, BankAccount, MobileBankingConfig, CodConfig, Order, OrderItem, ThemeConfig } from '../types';
import { ShoppingBag, X, Check, Copy, CreditCard, Building2, Smartphone, ShieldCheck, Search, Globe, Phone, MapPin, ArrowRight, ArrowLeft, ExternalLink, Clock, Menu, User, Lock, Sparkles, PackageCheck, LogOut, Home, Star, Share2, RotateCcw, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';
import { sendWhatsAppOtp, verifyWhatsAppOtp, formatFullPhoneNumber } from '../lib/whatsappOtpService';
import { PhoneVerificationInput } from './PhoneVerificationInput';
import { readZidStoreData, subscribeToZidStoreData, writeZidStoreData, type ZidStoreData } from '../lib/storeData';
import { supabase } from '../lib/supabase';
import { LanguageToggle } from './LanguageToggle';

function mapSupabaseProduct(p: any): Product {
  const title = p.title || p.name || 'Untitled Product';
  return {
    id: String(p.id || `prod-${Math.random()}`),
    title,
    priceBDT: Number(p.price ?? p.priceBDT ?? 0),
    compareAtPriceBDT: p.compare_at_price != null ? Number(p.compare_at_price) : (p.compareAtPriceBDT != null ? Number(p.compareAtPriceBDT) : undefined),
    image: p.image_url || p.image || '',
    additionalImages: Array.isArray(p.additional_images) ? p.additional_images : (Array.isArray(p.additionalImages) ? p.additionalImages : []),
    category: p.category || p.category_name || 'General',
    categoryId: String(p.category_id || p.categoryId || ''),
    category_id: String(p.category_id || p.categoryId || ''),
    descriptionEn: p.description || p.descriptionEn || '',
    sku: p.sku || '',
    stock: p.stock !== undefined ? Number(p.stock) : 99,
    status: p.status || 'active',
    is_published: p.is_published !== false,
    storeSlug: p.store_slug || p.storeSlug || '',
    store_slug: p.store_slug || p.storeSlug || '',
    variants: Array.isArray(p.variants) ? p.variants : [],
    variantsCount: Array.isArray(p.variants) ? p.variants.length : (p.variantsCount ?? 0),
    salesCount: p.salesCount ?? 0,
  };
}

function mapSupabaseCategory(c: any) {
  const name = c.name || c.title || 'Category';
  return {
    id: String(c.id || c.category_id || `cat-${Math.random()}`),
    name,
    title: name,
    image: c.image_url || c.image || c.coverImage || '',
    coverImage: c.cover_image || c.coverImage || '',
    status: c.status || (c.is_published !== false ? 'published' : 'hidden'),
    parentId: c.parent_id || c.parentId || null,
    slug: c.slug || '',
    description: c.description || '',
    productCount: Number(c.product_count ?? c.productCount ?? 0),
  };
}
import { BrandLogo } from './BrandLogo';
import { useLanguage } from '../lib/i18n';

interface TenantStorefrontViewProps {
  storeSlug: string;
  merchant: MerchantProfile;
  products: Product[];
  bankAccounts: BankAccount[];
  mobileBanking: MobileBankingConfig[];
  themes: ThemeConfig[];
  orders: Order[];
  onPlaceOrder: (order: Order) => void;
}

interface CustomerReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Completed' | 'Rejected';
  token: string;
  createdAt: string;
}

interface CustomerReviewItem {
  id: string;
  orderId: string;
  orderNumber: string;
  productTitle: string;
  productImage?: string;
  rating: number;
  comment: string;
  customerName?: string;
  createdAt: string;
}

export const TenantStorefrontView: React.FC<TenantStorefrontViewProps> = ({
  storeSlug,
  merchant,
  products,
  bankAccounts,
  mobileBanking,
  themes,
  orders,
  onPlaceOrder,
}) => {
  // The storefront may be mounted in another route/tab from the editor. Subscribe
  // directly to the shared store so products and published theme changes appear
  // immediately without remounting or refreshing the page.
  const { t } = useLanguage();
  const [liveStoreData, setLiveStoreData] = useState<ZidStoreData>(() => readZidStoreData(storeSlug));
  useEffect(() => subscribeToZidStoreData(setLiveStoreData, storeSlug), [storeSlug]);
  useEffect(() => {
    let active = true;
    const loadStorefront = async () => {
      try {
        const [storefrontRes, productsRes] = await Promise.all([
          fetch(`/api/storefront/${encodeURIComponent(storeSlug)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          }),
          fetch(`/api/products?store_slug=${encodeURIComponent(storeSlug)}`, {
            cache: 'no-store',
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          })
        ]);
        
        let apiProducts: any[] = [];
        if (productsRes.ok && productsRes.headers.get('content-type')?.includes('application/json')) {
          const fetched = await productsRes.json();
          if (Array.isArray(fetched)) {
            apiProducts = fetched;
          }
        }

        let serverData: Record<string, unknown> = {};
        if (storefrontRes.ok && storefrontRes.headers.get('content-type')?.includes('application/json')) {
          const payload = await storefrontRes.json();
          serverData = (payload?.storefront || payload?.tenant || payload || {}) as Record<string, unknown>;
        }

        if (active) {
          const existing = readZidStoreData(storeSlug);
          const merged = {
            ...existing,
            ...serverData,
            products: Array.isArray(apiProducts) ? apiProducts : (existing?.products || []),
          };
          writeZidStoreData(merged as ZidStoreData, storeSlug);
          setLiveStoreData(merged as ZidStoreData);
        }
      } catch { /* local slug-scoped cache remains the offline fallback */ }
    };
    void loadStorefront();
    const poll = window.setInterval(() => void loadStorefront(), 3000);
    return () => { active = false; window.clearInterval(poll); };
  }, [storeSlug]);

  const themeCustomization = (liveStoreData.themeCustomization || {}) as {
    storeLogoText?: string;
    desktopLogoUrl?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroImage?: string;
    announcementText?: string;
    primaryColor?: string;
    themePrimaryColor?: string;
  };
  const storefrontMerchant: MerchantProfile = {
    ...merchant,
    ...(liveStoreData.merchant || {}),
    storeName: themeCustomization.storeLogoText || liveStoreData.merchant?.storeName || merchant.storeName,
    logoUrl: themeCustomization.desktopLogoUrl || liveStoreData.merchant?.logoUrl || merchant.logoUrl,
    heroTitle: themeCustomization.heroTitle || liveStoreData.merchant?.heroTitle || merchant.heroTitle,
    heroSubtitle: themeCustomization.heroSubtitle || liveStoreData.merchant?.heroSubtitle || merchant.heroSubtitle,
    heroImage: themeCustomization.heroImage || liveStoreData.merchant?.heroImage || merchant.heroImage,
    announcementText: themeCustomization.announcementText || liveStoreData.merchant?.announcementText || merchant.announcementText,
  };
  const storeDisplayName = (
    storefrontMerchant.storeName ||
    storefrontMerchant.ownerName ||
    liveStoreData.merchant?.storeName ||
    merchant?.storeName ||
    ''
  ).trim() || 'Store';
  const storefrontThemes = Array.isArray(liveStoreData.themes) && (liveStoreData.themes as ThemeConfig[]).length > 0
    ? (liveStoreData.themes as ThemeConfig[])
    : (Array.isArray(themes) ? themes : []);
  const activeTheme = (storefrontThemes || []).find((theme) => theme?.id === storefrontMerchant.activeThemeId) || storefrontThemes[0];
  const merchantThemeConfig = (storefrontMerchant.themeConfig || liveStoreData.themeCustomization || {}) as Record<string, unknown>;
  const primaryColor = (
    (typeof merchantThemeConfig.primaryColor === 'string' && merchantThemeConfig.primaryColor) ||
    (typeof merchantThemeConfig.themePrimaryColor === 'string' && merchantThemeConfig.themePrimaryColor) ||
    (typeof themeCustomization.primaryColor === 'string' && themeCustomization.primaryColor) ||
    (typeof themeCustomization.themePrimaryColor === 'string' && themeCustomization.themePrimaryColor) ||
    activeTheme?.primaryColor ||
    '#00D68F'
  );
  // Direct Supabase & Backend API & LocalStorage Catalog Hook
  const [supabaseProducts, setSupabaseProducts] = useState<Product[]>([]);
  const [supabaseCategories, setSupabaseCategories] = useState<any[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchCatalog = async () => {
      let catData: any[] = [];
      let prodData: any[] = [];

      // 1. Fetch from Backend API endpoints & localStorage first
      try {
        const [catRes1, catRes2, prodRes, storefrontRes] = await Promise.all([
          fetch(`/api/categories?store_slug=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' }).catch(() => null),
          fetch(`/api/categories-by-slug/${encodeURIComponent(storeSlug)}`, { cache: 'no-store' }).catch(() => null),
          fetch(`/api/products?store_slug=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' }).catch(() => null),
          fetch(`/api/storefront/${encodeURIComponent(storeSlug)}`, { cache: 'no-store' }).catch(() => null),
        ]);

        if (catRes1 && catRes1.ok) {
          const json1 = await catRes1.json().catch(() => null);
          const list = json1?.categories || json1;
          if (Array.isArray(list) && list.length > 0) catData.push(...list);
        }
        if (catRes2 && catRes2.ok) {
          const json2 = await catRes2.json().catch(() => null);
          if (Array.isArray(json2) && json2.length > 0) catData.push(...json2);
        }
        if (prodRes && prodRes.ok) {
          const pJson = await prodRes.json().catch(() => null);
          if (Array.isArray(pJson) && pJson.length > 0) prodData.push(...pJson);
        }
        if (storefrontRes && storefrontRes.ok) {
          const sJson = await storefrontRes.json().catch(() => null);
          const sf = sJson?.storefront || sJson?.tenant || sJson;
          if (sf) {
            if (Array.isArray(sf.categories)) catData.push(...sf.categories);
            if (Array.isArray(sf.products)) prodData.push(...sf.products);
          }
        }
      } catch (e) {
        console.warn('API catalog fetch warning:', e);
      }

      // Check localStorage fallbacks
      try {
        const localCatKeys = [
          `zid_store_categories_v2:${storeSlug}`,
          'zid_store_categories_v2:bd',
          'zid_store_categories_v2:default',
          'zid_store_categories_v2:verandabd'
        ];
        for (const k of localCatKeys) {
          const val = localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) catData.push(...parsed);
          }
        }

        const localStoreKeys = [
          `ZID_MERCHANT_STORE_DATA_${storeSlug}`,
          'ZID_MERCHANT_STORE_DATA_bd',
          'ZID_MERCHANT_STORE_DATA_verandabd'
        ];
        for (const k of localStoreKeys) {
          const val = localStorage.getItem(k);
          if (val) {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed?.categories)) catData.push(...parsed.categories);
            if (Array.isArray(parsed?.products)) prodData.push(...parsed.products);
          }
        }
      } catch (e) {
        console.warn('LocalStorage fallback warning:', e);
      }

      // 2. Fetch from Supabase client if available
      try {
        if (supabase) {
          const slugsToQuery = Array.from(new Set([storeSlug, storeSlug?.toLowerCase?.(), 'bd', 'verandabd', 'default'])).filter(Boolean);
          const [catRes, prodRes] = await Promise.all([
            supabase.from('categories').select('*').in('store_slug', slugsToQuery),
            supabase.from('products').select('*').in('store_slug', slugsToQuery).eq('status', 'active')
          ]);

          if (catRes && catRes.data && Array.isArray(catRes.data)) catData.push(...catRes.data);
          if (prodRes && prodRes.data && Array.isArray(prodRes.data)) prodData.push(...prodRes.data);
        }
      } catch (e) {
        // silent
      }

      if (active) {
        const uniqueCatMap = new Map<string, any>();
        for (const c of catData) {
          if (c) {
            const key = String(c.id || c.category_id || c.name || c.title || '').trim().toLowerCase();
            if (key) uniqueCatMap.set(key, c);
          }
        }

        const uniqueProdMap = new Map<string, any>();
        for (const p of prodData) {
          if (p) {
            const key = String(p.id || p.title || p.name || '').trim();
            if (key) uniqueProdMap.set(key, p);
          }
        }

        setSupabaseCategories(Array.from(uniqueCatMap.values()).map(mapSupabaseCategory));
        setSupabaseProducts(Array.from(uniqueProdMap.values()).map(mapSupabaseProduct));
        setIsLoadingSupabase(false);
      }
    };

    void fetchCatalog();
    const interval = setInterval(fetchCatalog, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [storeSlug]);

  const combinedRawProducts = [
    ...(Array.isArray(liveStoreData?.products) ? liveStoreData.products : []),
    ...(Array.isArray(products) ? products : []),
    ...supabaseProducts,
  ];
  const prodMap = new Map<string, Product>();
  for (const p of combinedRawProducts) {
    if (p && p.id) {
      prodMap.set(p.id, p);
    }
  }

  const storefrontProducts = supabaseProducts.length > 0
    ? supabaseProducts
    : (Array.from(prodMap.values()).length > 0 ? Array.from(prodMap.values()) : (liveStoreData.products || []).map(mapSupabaseProduct));

  const storefrontMobileBanking = Array.isArray(liveStoreData.mobileBanking)
    ? liveStoreData.mobileBanking as MobileBankingConfig[]
    : (Array.isArray(mobileBanking) ? mobileBanking : []);
  const storefrontBankAccounts = Array.isArray(liveStoreData.bankAccounts)
    ? liveStoreData.bankAccounts as BankAccount[]
    : (Array.isArray(bankAccounts) ? bankAccounts : []);
  const enabledMobileMethods = (storefrontMobileBanking || []).filter((method) => method?.isEnabled && method?.number?.trim());
  const visibleBankAccount = (storefrontBankAccounts || []).find((account) => account?.isVisibleAtCheckout);

  const rawStorefrontCategories = supabaseCategories.length > 0
    ? supabaseCategories
    : (Array.isArray(liveStoreData.categories) && liveStoreData.categories.length > 0
        ? liveStoreData.categories
        : []);

  const allActiveProducts = (storefrontProducts || []).filter(p => {
    const status = (p.status || 'active').toLowerCase();
    return status === 'active' || status === 'published';
  });

  // Dynamically compute category product counts based on retrieved Supabase products
  const storefrontCategories = rawStorefrontCategories.map(cat => {
    const catId = cat.id || cat.category_id;
    const catNameLower = (cat.name || cat.title || '').toLowerCase().trim();
    const count = allActiveProducts.filter(p => {
      const pCatId = p.categoryId || p.category_id;
      if (pCatId && catId && String(pCatId) === String(catId)) return true;
      const pCatLower = (p.category || '').toLowerCase().trim();
      if (pCatLower && catNameLower && pCatLower === catNameLower) return true;
      if (catNameLower === 'home' && (!pCatLower || pCatLower === 'home' || pCatLower === 'general')) return true;
      return false;
    }).length;
    return { ...cat, productCount: count };
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [cart, setCart] = useState<{product: Product, quantity: number, variant: string}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authNotice, setAuthNotice] = useState('');

  // Customer WhatsApp OTP States
  const [customerWhatsappOtpInput, setCustomerWhatsappOtpInput] = useState('');
  const [isCustomerWhatsappOtpSent, setIsCustomerWhatsappOtpSent] = useState(false);
  const [isCustomerPhoneVerified, setIsCustomerPhoneVerified] = useState(false);
  const [verifiedCustomerPhone, setVerifiedCustomerPhone] = useState('');
  const [isSendingCustomerWhatsappOtp, setIsSendingCustomerWhatsappOtp] = useState(false);
  const [isVerifyingCustomerWhatsappOtp, setIsVerifyingCustomerWhatsappOtp] = useState(false);

  const handleSendCustomerWhatsappOtp = async () => {
    setAuthNotice('');
    if (!authPhone || authPhone.trim().length < 9) {
      setAuthNotice('Please enter a valid phone number before requesting WhatsApp verification.');
      return;
    }
    setIsSendingCustomerWhatsappOtp(true);
    const res = await sendWhatsAppOtp(authPhone, 'customer');
    setIsSendingCustomerWhatsappOtp(false);
    if (res.success) {
      setIsCustomerWhatsappOtpSent(true);
      setAuthNotice(res.message);
    } else {
      setAuthNotice(res.message);
    }
  };

  const handleVerifyCustomerWhatsappOtp = async () => {
    setAuthNotice('');
    if (!customerWhatsappOtpInput || customerWhatsappOtpInput.trim().length !== 6) {
      setAuthNotice('Please enter the 6-digit WhatsApp verification code.');
      return;
    }
    setIsVerifyingCustomerWhatsappOtp(true);
    const res = await verifyWhatsAppOtp(authPhone, customerWhatsappOtpInput);
    setIsVerifyingCustomerWhatsappOtp(false);
    if (res.success && res.verified) {
      setIsCustomerPhoneVerified(true);
      setVerifiedCustomerPhone(authPhone.trim());
      setIsCustomerWhatsappOtpSent(false);
      setAuthNotice('Phone number successfully verified via Supabase WhatsApp OTP ✓');
    } else {
      setAuthNotice(res.message || 'Failed to verify WhatsApp code. Please check and try again.');
    }
  };
  const [mobileTab, setMobileTab] = useState<'home' | 'orders' | 'profile'>('home');
  const [showOrderDashboard, setShowOrderDashboard] = useState(false);
  const [customerReturns, setCustomerReturns] = useState<CustomerReturnRequest[]>([]);
  const [customerReviews, setCustomerReviews] = useState<CustomerReviewItem[]>([]);
  const [returnOrderId, setReturnOrderId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnNotice, setReturnNotice] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');
  const [customerSession, setCustomerSession] = useState<{ email: string; name: string; phone: string } | null>(() => {
    try {
      const session = localStorage.getItem('zid_customer_session');
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setIsSplashVisible(false), 1400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const rawReturns = localStorage.getItem(`zid_customer_returns_${storeSlug}`);
      if (rawReturns) setCustomerReturns(JSON.parse(rawReturns));
      const rawReviews = localStorage.getItem(`zid_customer_reviews_${storeSlug}`);
      if (rawReviews) setCustomerReviews(JSON.parse(rawReviews));
    } catch (e) {
      console.warn('Failed to load customer returns/reviews:', e);
    }
  }, [storeSlug]);

  useEffect(() => {
    try {
      localStorage.setItem(`zid_customer_returns_${storeSlug}`, JSON.stringify(customerReturns));
    } catch (e) { /* ignore quota / privacy errors */ }
  }, [customerReturns, storeSlug]);

  useEffect(() => {
    try {
      localStorage.setItem(`zid_customer_reviews_${storeSlug}`, JSON.stringify(customerReviews));
    } catch (e) { /* ignore quota / privacy errors */ }
  }, [customerReviews, storeSlug]);

  // Checkout Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'bank' | 'cod'>('bkash');
  const [custCity, setCustCity] = useState('Dhaka');
  const [custAddress, setCustAddress] = useState('');
  const [custTxId, setCustTxId] = useState('');
  const [confirmedOrderNum, setConfirmedOrderNum] = useState('');
  const [codAdvanceProvider, setCodAdvanceProvider] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [copiedNum, setCopiedNum] = useState(false);

  const handleCopyNumber = (num: string) => {
    if (!num) return;
    navigator.clipboard.writeText(num);
    setCopiedNum(true);
    setTimeout(() => setCopiedNum(false), 2000);
  };

  useEffect(() => {
    const available = [
      ...(enabledMobileMethods || []).map((method) => method.provider),
      ...(visibleBankAccount ? ['bank'] : []),
      ...(storefrontMerchant.paymentMethods?.cod ? ['cod'] : []),
    ];
    if (!available.includes(payMethod)) setPayMethod((available[0] || 'cod') as typeof payMethod);
  }, [enabledMobileMethods, visibleBankAccount, storefrontMerchant.paymentMethods?.cod, payMethod]);

  const selectedMobileMethod = (enabledMobileMethods || []).find((method) => method.provider === payMethod);

  const storefrontCodConfig = (liveStoreData.codConfig as CodConfig) || undefined;
  const insideFee = Number(storefrontCodConfig?.insideDhakaFee) || 80;
  const outsideFee = Number(storefrontCodConfig?.outsideDhakaFee) || 150;
  const shippingFee = (custCity || 'Dhaka').toLowerCase().includes('dhaka') ? insideFee : outsideFee;

  const cartTotal = (cart || []).reduce((sum, item) => sum + ((item.product?.priceBDT ?? 0) * item.quantity), 0);
  const itemsSubtotal = (cart || []).length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0);
  const baseTotalAmount = itemsSubtotal + shippingFee;

  const mobileChargePercent = selectedMobileMethod?.chargePercentage || 0;
  const mobileCashOutFee = Math.round(baseTotalAmount * (mobileChargePercent / 100));
  const finalPayableMobile = baseTotalAmount + mobileCashOutFee;

  const advanceMethodsAvailable = enabledMobileMethods.filter(m => m.canPayAdvanceCharge && m.number);
  const requiresAdvanceFee = (payMethod === 'cod') && (advanceMethodsAvailable.length > 0 || !!storefrontCodConfig?.requestAdvanceDeliveryCharge);
  const advanceDeliveryFeeAmount = Number(storefrontCodConfig?.advanceDeliveryChargeAmount) || shippingFee;
  const selectedAdvConfig = advanceMethodsAvailable.find(m => m.provider === codAdvanceProvider) || advanceMethodsAvailable[0] || enabledMobileMethods[0];
  const advChargePercent = selectedAdvConfig?.chargePercentage || 0;
  const advCashOutFee = Math.round(advanceDeliveryFeeAmount * (advChargePercent / 100));
  const totalAdvancePayable = advanceDeliveryFeeAmount + advCashOutFee;
  const remainingCodBalance = Math.max(0, baseTotalAmount - advanceDeliveryFeeAmount);

  const totalAmount = ['bkash', 'nagad', 'rocket'].includes(payMethod)
    ? finalPayableMobile
    : baseTotalAmount;

  const customerOrders = customerSession
    ? (orders || []).filter((order) =>
        order?.customerPhone === customerSession.phone ||
        (order?.customerName || '').toLowerCase() === (customerSession.name || '').toLowerCase()
      )
    : [];

  const handleCustomerSessionPersist = (session: { email: string; name: string; phone: string }) => {
    try {
      localStorage.setItem('zid_customer_session', JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    setCustomerSession(session);
  };

  const handleCustomerAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice('');

    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();
    const cleanName = authName.trim() || 'Zid Customer';
    const cleanPhone = authPhone.trim();

    if (!cleanEmail.includes('@') || !cleanPassword || !cleanPhone) {
      setAuthNotice('Please enter a valid email, password, and phone number to continue.');
      return;
    }

    if (authMode === 'signup') {
      if (!isCustomerPhoneVerified || verifiedCustomerPhone !== cleanPhone) {
        setAuthNotice('Please verify your phone number via WhatsApp before creating your account.');
        return;
      }
    }

    const savedAccounts = (() => {
      try {
        const data = localStorage.getItem('zid_customer_accounts');
        if (data) {
          return JSON.parse(data);
        }
      } catch (e) {
        console.error(e);
      }
      return [
        {
          email: '',
          password: '',
          name: '',
          phone: '',
        },
      ];
    })();

    if (authMode === 'signin') {
      const existing = (savedAccounts || []).find((account: any) => account.email.toLowerCase() === cleanEmail && account.password === cleanPassword);
      if (!existing) {
        setAuthNotice('No matching customer account was found. Try the demo account or create your own profile.');
        return;
      }
      handleCustomerSessionPersist({ email: existing.email, name: existing.name, phone: existing.phone });
      setAuthNotice('Signed in successfully. Your order dashboard is ready.');
      setIsAuthOpen(false);
      setMobileTab('orders');
      return;
    }

    const updatedAccounts = [...(savedAccounts || []).filter((account: any) => account.email.toLowerCase() !== cleanEmail), {
      email: cleanEmail,
      password: cleanPassword,
      name: cleanName,
      phone: cleanPhone,
    }];

    localStorage.setItem('zid_customer_accounts', JSON.stringify(updatedAccounts));
    handleCustomerSessionPersist({ email: cleanEmail, name: cleanName, phone: cleanPhone });
    setAuthNotice('Your new customer account has been created and synced locally.');
    setIsAuthOpen(false);
    setMobileTab('orders');
  };

  const handleCustomerSignOut = () => {
    try {
      localStorage.removeItem('zid_customer_session');
    } catch (e) {
      console.error(e);
    }
    setCustomerSession(null);
    setMobileTab('home');
    setIsCartOpen(false);
  };

  const handleAddToCart = (product: Product, variant = 'Default') => {
    setCart(prev => {
      const next = prev || [];
      const existing = next.find(item => item.product.id === product.id && item.variant === variant);
      if (existing) {
        return next.map(item => item.product.id === product.id && item.variant === variant
          ? { ...item, quantity: item.quantity + 1 }
          : item
        );
      }
      return [...next, { product, quantity: 1, variant }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => (prev || []).map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as any);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = '#' + Math.floor(100000 + Math.random() * 900000);
    setConfirmedOrderNum(orderNum);

    const items: OrderItem[] = (cart || []).length > 0 ? (cart || []).map((c, i) => ({
      id: `item-${i}`,
      productName: c.product.title,
      variant: c.variant,
      quantity: c.quantity,
      unitPriceBDT: c.product.priceBDT,
      image: c.product.image,
    })) : selectedProduct ? [{
      id: 'item-single',
      productName: selectedProduct.title,
      variant: 'Standard',
      quantity: 1,
      unitPriceBDT: selectedProduct.priceBDT,
      image: selectedProduct.image,
    }] : [];

    const total = cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      source: 'Store',
      customerName: customerSession?.name || custName,
      customerPhone: customerSession?.phone || custPhone,
      customerCity: custCity,
      deliveryZone: custCity.toLowerCase().includes('dhaka') ? 'Inside Dhaka' : 'Outside Dhaka',
      address: custAddress,
      platform: 'Mobile web',
      totalBDT: total,
      paymentMethod: payMethod === 'bkash' ? 'bKash' : payMethod === 'nagad' ? 'Nagad' : payMethod === 'bank' ? 'Bank Transfer' : 'COD',
      paymentStatus: payMethod === 'cod' ? 'Unpaid' : 'Pending Verification',
      transactionId: custTxId || undefined,
      fulfillmentStatus: 'Unfulfilled',
      status: 'New',
      courierName: 'Steadfast Courier',
      trackingCode: 'SF-PENDING-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleString(),
      items,
    };

    onPlaceOrder(newOrder);
    setCheckoutStep('success');
    setCart([]);
  };

  // ------------------------------------------------------------------
  // Token / Return request handlers (customer mobile app)
  // ------------------------------------------------------------------
  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    setReturnNotice('');
    const order = (customerOrders || []).find((o) => o.id === returnOrderId);
    if (!order) {
      setReturnNotice(t('sf_select_order_first'));
      return;
    }
    if (!returnReason.trim()) {
      setReturnNotice(t('sf_return_reason_required'));
      return;
    }
    const token = 'RTK-' + Math.floor(100000 + Math.random() * 900000);
    const newReturn: CustomerReturnRequest = {
      id: `ret-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      reason: returnReason.trim(),
      status: 'Pending',
      token,
      createdAt: new Date().toLocaleString(),
    };
    setCustomerReturns((prev) => [newReturn, ...prev]);
    setReturnNotice(t('sf_return_submitted') + ' ' + token);
    setReturnOrderId('');
    setReturnReason('');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewNotice('');
    const order = (customerOrders || []).find((o) => o.id === reviewOrderId);
    if (!order) {
      setReviewNotice(t('sf_select_order_first'));
      return;
    }
    if (reviewRating < 1 || reviewRating > 5 || !reviewComment.trim()) {
      setReviewNotice(t('sf_review_required'));
      return;
    }
    const firstItem = order.items?.[0];
    const newReview: CustomerReviewItem = {
      id: `rev-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      productTitle: firstItem?.productName || order.orderNumber,
      productImage: firstItem?.image,
      rating: reviewRating,
      comment: reviewComment.trim(),
      customerName: customerSession?.name || order.customerName,
      createdAt: new Date().toLocaleString(),
    };
    setCustomerReviews((prev) => [newReview, ...prev]);
    setReviewNotice(t('sf_review_submitted'));
    setReviewOrderId('');
    setReviewRating(0);
    setReviewComment('');
  };

  const handleShareReview = (review: CustomerReviewItem) => {
    const stars = '⭐'.repeat(review.rating);
    const text = `${stars} ${review.comment} — ${review.productTitle} (Order ${review.orderNumber})`;
    const shareUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
    if (navigator.share) {
      navigator.share({ title: review.productTitle, text, url: shareUrl }).catch(() => { /* user dismissed */ });
    } else {
      window.open(facebookUrl, '_blank', 'width=640,height=600');
    }
  };

  // Ensure all active created products render under Products section regardless of sub-category assignment
  const displayProducts = (storefrontProducts || [])
    .filter(p => {
      const status = (p?.status || 'active').toLowerCase();
      const isPublished = p?.is_published !== false;
      return status !== 'archived' && status !== 'hidden' && isPublished;
    })
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if ((p.title || '').toLowerCase().includes(q) || ((p as any).name || '').toLowerCase().includes(q)) return true;
      
      const pCatLower = (p.category || '').toLowerCase();
      if (pCatLower.includes(q)) return true;
      
      const matchedCat = rawStorefrontCategories.find(c => c.name.toLowerCase() === q);
      if (matchedCat) {
        const pCatId = p.categoryId || p.category_id;
        if (pCatId && matchedCat.id && pCatId === matchedCat.id) return true;
        if (q === 'home' && (!pCatLower || pCatLower === 'home' || pCatLower === 'general')) return true;
      }
      
      return false;
    });

  return (
    <div
      className="min-h-screen font-sans bg-slate-950 flex justify-center items-start text-slate-900 selection:text-white selection:bg-[var(--theme-primary)]"
      style={{ ['--theme-primary' as string]: primaryColor } as React.CSSProperties}
    >
      <div className="w-full max-w-[480px] min-h-screen bg-slate-50 shadow-2xl relative flex flex-col border-x border-slate-800/80 overflow-x-hidden pb-16">
        {isSplashVisible && (
          <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center animate-pulse">
              <div className="relative flex items-center justify-center w-20 h-20 rounded-[24px] bg-[#00D68F] shadow-[0_0_40px_rgba(0,214,143,0.45)]">
                <span className="text-2xl font-black text-slate-950">Z</span>
                <div className="absolute -inset-2 rounded-[28px] border border-[#00D68F]/70 animate-ping" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.35em] text-[#00D68F]">ZID SAAS BD</div>
                <div className="mt-2 text-xl font-black text-white">{t('sf_loading_storefront')}</div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in {
            animation: slideInRight 0.3s ease-out;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.4s ease-out;
          }
          @keyframes zidMarqueeSlide {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .zid-marquee-track {
            display: inline-flex;
            width: max-content;
            animation: zidMarqueeSlide 22s linear infinite;
            will-change: transform;
          }
          .zid-marquee-track:hover {
            animation-play-state: paused;
          }
        `}</style>

        {/* Top Header Bar (Mobile-Only) */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-sm">
          {/* Top Announcement Bar */}
          <div className="bg-[#00D68F] text-slate-950 py-1.5 px-3 overflow-hidden whitespace-nowrap relative text-[11px] font-bold">
            <div className="zid-marquee-track inline-flex items-center">
              <span className="mx-2">{storefrontMerchant.announcementText || "Welcome to ZidSaaS BD"}</span>
              <span className="mx-2">✦</span>
              <span className="mx-2">{storefrontMerchant.announcementText || "Welcome to ZidSaaS BD"}</span>
              <span className="mx-2">✦</span>
              <span className="mx-2">{storefrontMerchant.announcementText || "Welcome to ZidSaaS BD"}</span>
            </div>
          </div>

          <div className="py-2 px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => { setCheckoutStep('catalog'); setMobileTab('home'); }}>
              <button 
                className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg shrink-0"
                onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(!isMobileMenuOpen); }}
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Stacked Branding Hierarchy: Official ZID SAAS BD logo at the top, Merchant store name right below */}
              <div className="flex flex-col min-w-0">
                <BrandLogo size="sm" showSubtitle={false} isDarkMode={false} />
                <h1 className="text-xs font-black tracking-tight text-slate-900 truncate max-w-[170px] mt-0.5">
                  {storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-1.5 text-slate-600 hover:text-[#00D68F] transition rounded-lg hover:bg-slate-100"
              >
                <Search className="w-5 h-5" />
              </button>

              <LanguageToggle compact />

              {customerSession ? (
                <button
                  onClick={handleCustomerSignOut}
                  className="p-1.5 text-slate-700 hover:text-red-500 transition rounded-lg hover:bg-slate-100"
                  title={t('sf_sign_out')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="p-1.5 text-slate-700 hover:text-[#00D68F] transition rounded-lg hover:bg-slate-100"
                  title={t('sf_customer_sign_in')}
                >
                  <User className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-1.5 text-slate-700 hover:text-[#00D68F] transition rounded-lg hover:bg-slate-100"
              >
                <ShoppingBag className="w-5 h-5" />
                {cart.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center bg-[#00D68F] shadow">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Input Popup */}
          {isSearchOpen && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('sf_search_placeholder')}
                  className="w-full rounded-xl pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 focus:border-[#00D68F] outline-none shadow-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="border-t border-slate-100 bg-white shadow-xl p-3 space-y-1 animate-fade-in-up">
              <button
                onClick={() => { setCheckoutStep('catalog'); setMobileTab('home'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 ${mobileTab === 'home' ? 'bg-[#00D68F]/15 text-[#00D68F]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <Home className="w-4 h-4" /> {t('sf_home')}
              </button>
              <button
                onClick={() => { setCheckoutStep('catalog'); setMobileTab('orders'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 ${mobileTab === 'orders' ? 'bg-[#00D68F]/15 text-[#00D68F]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <PackageCheck className="w-4 h-4" /> {t('sf_my_orders')}
              </button>
              <button
                onClick={() => { setCheckoutStep('catalog'); setMobileTab('profile'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 ${mobileTab === 'profile' ? 'bg-[#00D68F]/15 text-[#00D68F]' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <User className="w-4 h-4" /> {t('sf_tab_profile')}
              </button>
            </div>
          )}
        </header>

      {/* Main Content Area */}
      <main className="w-full">
        
        {/* Catalog View */}
        {checkoutStep === 'catalog' && (
          <>
            {mobileTab === 'home' && (
            <div className="space-y-4 pb-6">
            
            {/* Hero Banner (Mobile Height) */}
            <div className="w-full h-[210px] relative overflow-hidden bg-slate-900">
              <img 
                src={storefrontMerchant.heroImage || "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80"} 
                alt="Hero Banner" 
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-4">
                <div className="space-y-2">
                  <span className="inline-block bg-[#00D68F] text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {t('sf_new_arrivals')}
                  </span>
                  <h2 className="text-xl font-black text-white leading-tight">
                    {storefrontMerchant.heroTitle || t('sf_hero_fallback_title')}
                  </h2>
                  <p className="text-xs text-slate-300 line-clamp-2">
                    {storefrontMerchant.heroSubtitle || t('sf_hero_fallback_subtitle')}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3.5 space-y-6">
              
              {/* Popular Categories Grid (2-Column Mobile) */}
              <section className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{t('sf_popular_categories')}</h2>
                    <p className="text-[11px] text-slate-500">{t('sf_shop_by_category')}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {(storefrontCategories.length
                    ? storefrontCategories
                    : (Array.from(new Set(displayProducts.map(p => p.category))) as string[]).map(name => ({ name, image: '' }) as { name: string; status?: string; image?: string; coverImage?: string })
                  ).slice(0, 4).map((cat, i) => {
                    const catName = typeof cat === 'string' ? cat : (cat?.name || '');
                    const catImage = cat && typeof cat === 'object' ? (cat.image || cat.coverImage || '') : '';
                    const firstProductImage = displayProducts.find(p => p.category === catName)?.image || '';
                    const image = catName ? (catImage || firstProductImage) : '';
                    return (
                      <div 
                        key={catName || `cat-${i}`} 
                        className="aspect-[4/3] bg-slate-100 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-200 shadow-sm"
                        onClick={() => {
                          setSearchQuery(catName);
                          // Scroll to products section smoothly
                          document.getElementById('storefront-products-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {image ? (
                          <img src={image} alt={catName} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#00D68F]/20 via-slate-200 to-[#D4AF37]/20">
                            <span className="text-3xl font-black text-slate-800">{catName.charAt(0) || 'Z'}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 p-2.5">
                          <h3 className="text-white font-bold text-xs truncate max-w-[140px]">{catName || t('sf_products')}</h3>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Product Grid (2-Column Mobile) */}
              <section className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{t('sf_products')}</h2>
                    <p className="text-[11px] text-slate-500">{t('sf_discover_collection')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {displayProducts.length === 0 ? (
                    <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                      <ShoppingBag className="mx-auto h-8 w-8 text-slate-300" />
                      <h3 className="mt-2 text-sm font-extrabold text-slate-900">{t('sf_no_products')}</h3>
                      <p className="mt-1 text-xs text-slate-500">{t('sf_no_products_desc')}</p>
                    </div>
                  ) : displayProducts.map(p => (
                    <div 
                      key={p.id}
                      className="group flex flex-col justify-between bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm relative"
                    >
                      {(p.status === 'Active' || p.status === 'active') && (
                        <div className="absolute top-2 left-2 z-10 bg-[#00D68F] text-slate-950 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                          Hot
                        </div>
                      )}

                      <div className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer" onClick={() => {
                        setSelectedProduct(p);
                        setCheckoutStep('checkout');
                      }}>
                        <img 
                          src={p.image} 
                          alt={p.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                      </div>

                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</p>
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight cursor-pointer hover:text-[#00D68F] transition"
                              onClick={() => { setSelectedProduct(p); setCheckoutStep('checkout'); }}>
                            {p.title}
                          </h4>
                        </div>
                        
                        <div className="pt-1 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <div className="text-sm font-black text-[#00D68F] tracking-tight">
                              ৳{(p.priceBDT ?? 0).toLocaleString()}
                            </div>
                            {p.compareAtPriceBDT && (
                              <div className="text-[10px] text-slate-400 line-through">
                                ৳{(p.compareAtPriceBDT ?? 0).toLocaleString()}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                            className="bg-slate-100 hover:bg-[#00D68F] hover:text-white text-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Store Benefits Section (Mobile Grid) */}
              <section className="bg-white rounded-2xl border border-slate-200 p-3.5 grid grid-cols-2 gap-3 text-center shadow-sm">
                <div className="space-y-1 p-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 text-[#00D68F] rounded-lg flex items-center justify-center mx-auto">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">Cash On Delivery</h4>
                  <p className="text-[10px] text-slate-500">Everywhere BD</p>
                </div>
                <div className="space-y-1 p-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 text-[#00D68F] rounded-lg flex items-center justify-center mx-auto">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">bKash Payment</h4>
                  <p className="text-[10px] text-slate-500">Instant gateway</p>
                </div>
                <div className="space-y-1 p-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 text-[#00D68F] rounded-lg flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">Authentic Items</h4>
                  <p className="text-[10px] text-slate-500">100% Genuine</p>
                </div>
                <div className="space-y-1 p-2 bg-slate-50 rounded-xl">
                  <div className="w-8 h-8 bg-emerald-100 text-[#00D68F] rounded-lg flex items-center justify-center mx-auto">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-900">Fast Shipping</h4>
                  <p className="text-[10px] text-slate-500">Within 48 hours</p>
                </div>
              </section>
            </div>
            </div>
            )}

            {/* ---------------- ORDERS TAB ---------------- */}
            {mobileTab === 'orders' && (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
                {!customerSession ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-900">{t('sf_sign_in_required')}</h3>
                    <p className="text-sm text-slate-500 mt-2 mb-6">{t('sf_sign_in_to_view_orders')}</p>
                    <button
                      onClick={() => { setIsAuthOpen(true); setAuthMode('signin'); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#00D68F] px-6 py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition cursor-pointer"
                    >
                      <User className="w-4 h-4" /> {t('sf_customer_sign_in')}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Automatic Delivered banner */}
                    {customerOrders.some((o) => o.fulfillmentStatus === 'Delivered') && (
                      <div className="rounded-3xl border border-emerald-300/70 bg-gradient-to-r from-emerald-50 to-[#00D68F]/10 p-5 shadow-sm flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-black text-emerald-800 text-sm">{t('sf_delivered_banner_title')}</h4>
                          <p className="text-sm text-emerald-900/90 leading-relaxed mt-1">{t('sf_delivered_banner')}</p>
                        </div>
                      </div>
                    )}

                    {/* Order List */}
                    <section className="space-y-3">
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-[#00D68F]" />
                        {t('sf_my_orders')}
                      </h2>
                      {customerOrders.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                          {t('sf_no_orders')}
                        </div>
                      ) : (
                        customerOrders.map((order) => (
                          <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{order.orderNumber}</div>
                                <div className="mt-1 text-base font-black text-slate-900">{order.paymentMethod}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-base font-black text-[#00D68F]">৳{order.totalBDT.toLocaleString()}</div>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${order.fulfillmentStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {order.fulfillmentStatus}
                                </span>
                              </div>
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-xs">
                                    {item.image ? (
                                      <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <ShoppingBag className="w-4 h-4 text-slate-300" />
                                      </div>
                                    )}
                                    <span className="font-semibold text-slate-700 flex-1">{item.productName} × {item.quantity}</span>
                                    <span className="font-bold text-slate-900">৳{(item.unitPriceBDT * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>{order.createdAt}</span>
                              <span className="font-mono">{order.trackingCode || order.courierName || '—'}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </section>
                    {/*_CONT_RETURN_*/}

                    {/* Token / Return system */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-black text-slate-900">{t('sf_token_return')}</h2>
                      </div>
                      <form onSubmit={handleSubmitReturn} className="space-y-3">
                        <select
                          value={returnOrderId}
                          onChange={(e) => setReturnOrderId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F] cursor-pointer"
                        >
                          <option value="">{t('sf_select_order')}</option>
                          {customerOrders.map((o) => (
                            <option key={o.id} value={o.id}>{o.orderNumber} — {o.fulfillmentStatus}</option>
                          ))}
                        </select>
                        <textarea
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder={t('sf_return_reason_placeholder')}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F]"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                        >
                          {t('sf_submit_return')}
                        </button>
                      </form>
                      {returnNotice && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{returnNotice}</div>
                      )}
                      {customerReturns.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('sf_return_history')}</h4>
                          {customerReturns.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                              <div>
                                <div className="font-black text-slate-900">{r.orderNumber}</div>
                                <div className="text-slate-500">{t('sf_token')}: <span className="font-mono font-bold text-amber-600">{r.token}</span></div>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                    {/* Product Reviews */}
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#00D68F]" />
                        <h2 className="text-lg font-black text-slate-900">{t('sf_reviews')}</h2>
                      </div>

                      {customerReviews.length === 0 ? (
                        <p className="text-sm text-slate-500">{t('sf_no_reviews')}</p>
                      ) : (
                        <div className="space-y-4">
                          {customerReviews.map((rev) => (
                            <div key={rev.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star key={n} className={`w-4 h-4 ${n <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                  ))}
                                </div>
                                <span className="text-[11px] text-slate-400">{rev.createdAt}</span>
                              </div>
                              <p className="mt-2 text-sm font-semibold text-slate-800">{rev.productTitle}</p>
                              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleShareReview(rev)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" /> {t('sf_share_facebook')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New review form */}
                      <form onSubmit={handleSubmitReview} className="space-y-3 border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-black text-slate-900">{t('sf_write_review')}</h4>
                        <select
                          value={reviewOrderId}
                          onChange={(e) => setReviewOrderId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F] cursor-pointer"
                        >
                          <option value="">{t('sf_select_order')}</option>
                          {customerOrders.filter((o) => !customerReviews.some((r) => r.orderId === o.id)).map((o) => (
                            <option key={o.id} value={o.id}>{o.orderNumber} — {o.fulfillmentStatus}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              className="cursor-pointer transition"
                              aria-label={`${n} star`}
                            >
                              <Star className={`w-8 h-8 ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                            </button>
                          ))}
                          <span className="ml-2 text-sm font-bold text-slate-600">{reviewRating > 0 ? `${reviewRating}/5` : ''}</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder={t('sf_review_placeholder')}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F]"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-[#00D68F] py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition cursor-pointer"
                        >
                          {t('sf_submit_review')}
                        </button>
                        {reviewNotice && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{reviewNotice}</div>
                        )}
                      </form>
                    </section>
                  </>
                )}
              </div>
            )}
            {/* ---------------- PROFILE TAB ------------- */}
            {mobileTab === 'profile' && (
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 space-y-8">
                {!customerSession ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-900">{t('sf_sign_in_required')}</h3>
                    <p className="text-sm text-slate-500 mt-2 mb-6">{t('sf_sign_in_to_profile')}</p>
                    <button
                      onClick={() => { setIsAuthOpen(true); setAuthMode('signin'); }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#00D68F] px-6 py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition cursor-pointer"
                    >
                      <User className="w-4 h-4" /> {t('sf_customer_sign_in')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-[#00D68F] text-slate-950 font-black text-2xl flex items-center justify-center">
                        {customerSession.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-black text-slate-900 truncate">{customerSession.name}</h2>
                        <p className="text-sm text-slate-500 truncate">{customerSession.email} • {customerSession.phone}</p>
                      </div>
                                        </div>

                    {/* Automatic Delivered banner */ }
                    {customerOrders.some((o) => o.fulfillmentStatus === 'Delivered') && (
                      <div className="rounded-3xl border border-emerald-300/70 bg-gradient-to-r from-emerald-50 to-[#00D68F]/10 p-5 shadow-sm flex items-start gap-3">
                        <Sparkles className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-black text-emerald-800 text-sm">{t('sf_delivered_banner_title')}</h4>
                          <p className="text-sm text-emerald-900/90 leading-relaxed mt-1">{t('sf_delivered_banner')}</p>
                        </div>
                      </div>
                    )}

                    {/* Order List */ }
                    <section className="space-y-3">
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-[#00D68F]" />
                        {t('sf_my_orders')}
                      </h2>
                      {customerOrders.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                          {t('sf_no_orders')}
                        </div>
                      ) : (
                        customerOrders.map((order) => (
                          <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{order.orderNumber}</div>
                                <div className="mt-1 text-base font-black text-slate-900">{order.paymentMethod}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-base font-black text-[#00D68F]">৳{order.totalBDT.toLocaleString()}</div>
                                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${order.fulfillmentStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {order.fulfillmentStatus}
                                </span>
                              </div>
                            </div>
                            {order.items && order.items.length > 0 && (
                              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                {order.items.slice(0, 3).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-3 text-xs">
                                    {item.image ? (
                                      <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                        <ShoppingBag className="w-4 h-4 text-slate-300" />
                                      </div>
                                    )}
                                    <span className="font-semibold text-slate-700 flex-1">{item.productName} × {item.quantity}</span>
                                    <span className="font-bold text-slate-900">৳{(item.unitPriceBDT * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                              <span>{order.createdAt}</span>
                              <span className="font-mono">{order.trackingCode || order.courierName || '—'}</span>
                            </div>
                          </div>
                        ))
                      )}
                                        </section>

                    {/* Token / Return system */ }
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-black text-slate-900">{t('sf_token_return')}</h2>
                      </div>
                      <form onSubmit={handleSubmitReturn} className="space-y-3">
                        <select
                          value={returnOrderId}
                          onChange={(e) => setReturnOrderId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F] cursor-pointer"
                        >
                          <option value="">{t('sf_select_order')}</option>
                          {customerOrders.map((o) => (
                            <option key={o.id} value={o.id}>{o.orderNumber} — {o.fulfillmentStatus}</option>
                          ))}
                        </select>
                        <textarea
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder={t('sf_return_reason_placeholder')}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F]"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer"
                        >
                          {t('sf_submit_return')}
                        </button>
                      </form>
                      {returnNotice && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{returnNotice}</div>
                      )}
                      {customerReturns.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('sf_return_history')}</h4>
                          {customerReturns.map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                              <div>
                                <div className="font-black text-slate-900">{r.orderNumber}</div>
                                <div className="text-slate-500">{t('sf_token')}: <span className="font-mono font-bold text-amber-600">{r.token}</span></div>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${r.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{r.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                                        </section>

                    {/* Product Reviews */ }
                    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#00D68F]" />
                        <h2 className="text-lg font-black text-slate-900">{t('sf_reviews')}</h2>
                      </div>

                      {customerReviews.length === 0 ? (
                        <p className="text-sm text-slate-500">{t('sf_no_reviews')}</p>
                      ) : (
                        <div className="space-y-4">
                          {customerReviews.map((rev) => (
                            <div key={rev.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <Star key={n} className={`w-4 h-4 ${n <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                                  ))}
                                </div>
                                <span className="text-[11px] text-slate-400">{rev.createdAt}</span>
                              </div>
                              <p className="mt-2 text-sm font-semibold text-slate-800">{rev.productTitle}</p>
                              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleShareReview(rev)}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-[#1877F2] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition cursor-pointer"
                                >
                                  <Share2 className="w-3.5 h-3.5" /> {t('sf_share_facebook')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* New review form */ }
                      <form onSubmit={handleSubmitReview} className="space-y-3 border-t border-slate-100 pt-4">
                        <h4 className="text-sm font-black text-slate-900">{t('sf_write_review')}</h4>
                        <select
                          value={reviewOrderId}
                          onChange={(e) => setReviewOrderId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F] cursor-pointer"
                        >
                          <option value="">{t('sf_select_order')}</option>
                          {customerOrders.filter((o) => !customerReviews.some((r) => r.orderId === o.id)).map((o) => (
                            <option key={o.id} value={o.id}>{o.orderNumber} — {o.fulfillmentStatus}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              className="cursor-pointer transition"
                              aria-label={`${n} star`}
                            >
                              <Star className={`w-8 h-8 ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                            </button>
                          ))}
                          <span className="ml-2 text-sm font-bold text-slate-600">{reviewRating > 0 ? `${reviewRating}/5` : ''}</span>
                        </div>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder={t('sf_review_placeholder')}
                          rows={3}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-[#00D68F]"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-[#00D68F] py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition cursor-pointer"
                        >
                          {t('sf_submit_review')}
                        </button>
                        {reviewNotice && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{reviewNotice}</div>
                        )}
                      </form>
                    </section>

                    <div className="rounded-3xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-sm overflow-hidden">
                      <div className="flex items-center justify-between p-4">
                        <span className="text-sm font-bold text-slate-700">{t('sf_language')}</span>
                        <LanguageToggle />
                      </div>
                      <button
                        onClick={handleCustomerSignOut}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-red-50 transition cursor-pointer"
                      >
                        <LogOut className="w-5 h-5 text-red-500" />
                        <span className="flex-1 font-bold text-red-600">{t('sf_sign_out')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Checkout Flow */}
        {checkoutStep === 'checkout' && (
           <div className="w-full px-3.5 py-6 space-y-6">
            <button
              onClick={() => { setCheckoutStep('catalog'); setMobileTab('home'); }}
              className="text-xs flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-900 font-bold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Catalog
            </button>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-6">
              
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Checkout</h3>
                <p className="text-xs mt-0.5 text-slate-500">Provide your delivery details below.</p>
              </div>

              {/* Order Summary Items */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Order Summary</h4>
                
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1">
                      <img src={item.product.image} alt={item.product.title} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-slate-900 truncate">{item.product.title}</h4>
                        <div className="text-[10px] text-slate-500">Qty: {item.quantity} | Variant: {item.variant}</div>
                      </div>
                      <div className="text-xs font-black text-[#00D68F] shrink-0">৳{((item.product.priceBDT ?? 0) * item.quantity).toLocaleString()}</div>
                    </div>
                  ))
                ) : selectedProduct ? (
                  <div className="flex items-center gap-3 py-1">
                    <img src={selectedProduct.image} alt={selectedProduct.title} className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-xs text-slate-900 truncate">{selectedProduct.title}</h4>
                    </div>
                    <div className="text-xs font-black text-[#00D68F] shrink-0">৳{(selectedProduct.priceBDT ?? 0).toLocaleString()}</div>
                  </div>
                ) : null}
                
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-600">Total Payable:</span>
                  <span className="text-base font-black text-[#00D68F]">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 font-bold text-xs text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold text-xs text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full font-mono rounded-xl px-3.5 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F]"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 font-bold text-xs text-slate-700">City / District</label>
                    <select
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F] font-medium"
                    >
                      <option value="Dhaka">Dhaka (Inside Dhaka - ৳80)</option>
                      <option value="Chittagong">Chittagong (Outside Dhaka - ৳150)</option>
                      <option value="Sylhet">Sylhet (Outside Dhaka - ৳150)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold text-xs text-slate-700">Detailed Address</label>
                    <input
                      type="text"
                      required
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D68F]"
                    />
                  </div>
                </div>

                {/* Payment Options */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="block mb-2 font-bold text-xs text-slate-900">Select Payment Method</label>
                  <div className="grid grid-cols-1 gap-2">
                    {enabledMobileMethods.map((method) => {
                      const isSelected = payMethod === method.provider;
                      const chgPercent = method.chargePercentage || 0;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPayMethod(method.provider as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? method.provider === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-700' : method.provider === 'nagad' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Smartphone className={`w-4 h-4 shrink-0 ${method.provider === 'bkash' ? 'text-pink-500' : method.provider === 'nagad' ? 'text-orange-500' : 'text-purple-500'}`} />
                            <span>{method.displayName} ({method.accountType})</span>
                          </div>
                          {chgPercent > 0 && (
                            <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              +{chgPercent}% cash-out fee
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {visibleBankAccount && (
                      <button
                        type="button"
                        onClick={() => setPayMethod('bank')}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center gap-2.5 cursor-pointer ${
                          payMethod === 'bank' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4 shrink-0 text-indigo-500" />
                        <span>Bank Transfer ({visibleBankAccount.bankName})</span>
                      </button>
                    )}

                    {storefrontMerchant.paymentMethods?.cod && (
                      <button
                        type="button"
                        onClick={() => setPayMethod('cod')}
                        className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                          payMethod === 'cod' ? 'border-[#00D68F] bg-emerald-50 text-[#00A16B]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Building2 className={`w-4 h-4 shrink-0 ${payMethod === 'cod' ? 'text-[#00D68F]' : 'text-slate-400'}`} />
                          <span>Cash on Delivery (COD)</span>
                        </div>
                        {requiresAdvanceFee && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300/50">
                            Advance Delivery Fee Required
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Mobile Payment Details (bKash, Nagad, Rocket) */}
                {['bkash', 'nagad', 'rocket'].includes(payMethod) && selectedMobileMethod && (
                  <div className={`border p-3.5 rounded-xl space-y-3 ${
                    payMethod === 'bkash' ? 'border-pink-200 bg-pink-50/50' : payMethod === 'nagad' ? 'border-orange-200 bg-orange-50/50' : 'border-purple-200 bg-purple-50/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        payMethod === 'bkash' ? 'text-pink-600' : payMethod === 'nagad' ? 'text-orange-600' : 'text-purple-600'
                      }`}>
                        <Smartphone className="w-4 h-4" /> {selectedMobileMethod.displayName} Payment Instructions
                      </div>
                      <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                        {selectedMobileMethod.accountType}
                      </span>
                    </div>

                    {/* Merchant Number Display */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Merchant {selectedMobileMethod.provider.toUpperCase()} Number</div>
                        <div className="font-mono text-base font-black text-slate-900">{selectedMobileMethod.number || '01844990011'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(selectedMobileMethod.number || '01844990011')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedNum ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNum ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Price Breakdown including Cash-out Fee */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Items Subtotal:</span>
                        <span className="font-semibold text-slate-900">৳{itemsSubtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Shipping Fee ({custCity || 'Dhaka'}):</span>
                        <span className="font-semibold text-slate-900">৳{shippingFee}</span>
                      </div>
                      {mobileChargePercent > 0 && (
                        <div className="flex justify-between text-pink-600 font-medium">
                          <span>Cash-out / Charge Fee ({mobileChargePercent}%):</span>
                          <span className="font-bold">+৳{mobileCashOutFee}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-sm">
                        <span>Total Payable to Merchant:</span>
                        <span className="text-pink-600 font-mono">৳{finalPayableMobile.toLocaleString()} BDT</span>
                      </div>
                    </div>

                    {selectedMobileMethod.instructions && (
                      <p className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                        <strong className="text-slate-900">Note:</strong> {selectedMobileMethod.instructions}
                      </p>
                    )}

                    <div>
                      <label className="block mb-1 font-bold text-xs text-slate-800">
                        Enter {selectedMobileMethod.provider.toUpperCase()} Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. ${payMethod === 'bkash' ? 'BK' : payMethod === 'nagad' ? 'NG' : 'RO'}9X2810L9`}
                        value={custTxId}
                        onChange={(e) => setCustTxId(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs uppercase bg-white focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* Cash on Delivery with Mandatory Advance Delivery Charge */}
                {payMethod === 'cod' && requiresAdvanceFee && (
                  <div className="border border-amber-200 bg-amber-50/50 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Upfront Advance Delivery Charge Mandatory</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      To confirm your Cash on Delivery (COD) order, please pay the <strong className="text-slate-900">৳{advanceDeliveryFeeAmount} Delivery Fee</strong> upfront via Mobile Banking. The remaining order balance will be collected upon courier delivery.
                    </p>

                    {/* Provider Selector for Advance Delivery Payment */}
                    {advanceMethodsAvailable.length > 0 && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase">Select Advance Payment Method:</label>
                        <div className="flex gap-2">
                          {advanceMethodsAvailable.map((adv) => (
                            <button
                              key={adv.id}
                              type="button"
                              onClick={() => setCodAdvanceProvider(adv.provider as any)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition ${
                                selectedAdvConfig?.provider === adv.provider
                                  ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-sm'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {adv.displayName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Merchant Number & Instructions */}
                    {selectedAdvConfig && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">Send Money to {selectedAdvConfig.displayName}</div>
                            <div className="font-mono text-base font-black text-slate-900">{selectedAdvConfig.number}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyNumber(selectedAdvConfig.number)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            {copiedNum ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        {/* Breakdown for Advance Delivery */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Advance Delivery Charge:</span>
                            <span className="font-bold text-slate-900">৳{advanceDeliveryFeeAmount}</span>
                          </div>
                          {advChargePercent > 0 && (
                            <div className="flex justify-between text-amber-700 font-medium">
                              <span>Cash-out Charge ({advChargePercent}%):</span>
                              <span className="font-bold">+৳{advCashOutFee}</span>
                            </div>
                          )}
                          <div className="border-t border-slate-200 pt-1 flex justify-between font-black text-slate-900">
                            <span>Total Upfront Payable:</span>
                            <span className="text-amber-800 font-mono">৳{totalAdvancePayable} BDT</span>
                          </div>
                          <div className="flex justify-between text-[#00D68F] font-bold text-[11px] pt-1 border-t border-slate-200">
                            <span>Remaining COD Balance Due on Delivery:</span>
                            <span>৳{remainingCodBalance.toLocaleString()} BDT</span>
                          </div>
                        </div>

                        {selectedAdvConfig.instructions && (
                          <p className="text-[11px] text-slate-600 italic">
                            Note: {selectedAdvConfig.instructions}
                          </p>
                        )}
                      </div>
                    )}

                    {/* TrxID Input for Advance Delivery Payment */}
                    <div>
                      <label className="block mb-1 font-bold text-xs text-slate-800">
                        Enter Advance Payment Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. BK8X991029"
                        value={custTxId}
                        onChange={(e) => setCustTxId(e.target.value)}
                        className="w-full border border-amber-300 rounded-xl px-3.5 py-2.5 font-mono text-xs uppercase bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#00D68F] text-slate-950 font-black rounded-xl text-sm hover:bg-[#00E699] transition cursor-pointer shadow-lg"
                  >
                    Confirm Order • ৳{
                      ['bkash', 'nagad', 'rocket'].includes(payMethod)
                        ? finalPayableMobile.toLocaleString()
                        : payMethod === 'cod' && requiresAdvanceFee
                        ? `${totalAdvancePayable} Upfront (৳${remainingCodBalance.toLocaleString()} COD)`
                        : baseTotalAmount.toLocaleString()
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success View */}
        {checkoutStep === 'success' && (
          <div className="w-full px-4 py-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <Check className="w-8 h-8 text-[#00D68F]" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Order Placed Successfully!</h3>
            
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 mb-6">
              <p className="text-xs text-slate-600">
                Thank you <strong className="text-slate-900">{custName}</strong>. Your order has been placed.
              </p>
              <div className="flex justify-center items-center gap-1.5 text-xs font-mono">
                <span className="text-slate-500">ORDER:</span>
                <span className="bg-[#00D68F] text-white px-2 py-0.5 rounded font-bold">{confirmedOrderNum}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCheckoutStep('catalog');
                setSelectedProduct(null);
                setMobileTab('home');
              }}
              className="px-6 py-3 bg-[#00D68F] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-md hover:bg-[#00E699]"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>

      {/* Mobile App Bottom Navigation (Fixed inside standard frame) */}
      {checkoutStep === 'catalog' && (
        <nav className="absolute bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-3 h-14">
            {([
              { id: 'home', label: t('sf_tab_home'), icon: Home },
              { id: 'orders', label: t('sf_tab_orders'), icon: ShoppingBag },
              { id: 'profile', label: t('sf_tab_profile'), icon: User },
            ] as const).map((tabItem) => {
              const TabIcon = tabItem.icon;
              const active = mobileTab === tabItem.id;
              const count = tabItem.id === 'orders' && customerSession ? customerOrders.length : 0;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setMobileTab(tabItem.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-black transition cursor-pointer ${active ? 'text-[#00D68F]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <span className="relative">
                    <TabIcon className={`w-4 h-4 ${active ? 'text-[#00D68F]' : 'text-slate-400'}`} />
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-[#00D68F] text-slate-950 text-[9px] font-black min-w-[14px] h-3.5 px-1 rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </span>
                  {tabItem.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-[#111827] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#00D68F]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#00D68F] border border-[#00D68F]/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('sf_customer_account')}
                </div>
                <h3 className="mt-3 text-2xl font-black text-white">{authMode === 'signin' ? t('sign_in') : t('sign_up')}</h3>
                <p className="mt-1 text-xs text-slate-400">{t('sf_auth_subtitle')}</p>
              </div>
              <button onClick={() => setIsAuthOpen(false)} className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-1">
              <button
                onClick={() => setAuthMode('signin')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${authMode === 'signin' ? 'bg-[#00D68F] text-slate-950' : 'text-slate-400'}`}
              >
                {t('sign_in')}
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${authMode === 'signup' ? 'bg-[#00D68F] text-slate-950' : 'text-slate-400'}`}
              >
                {t('sf_auth_create_account')}
              </button>
            </div>

            <form onSubmit={handleCustomerAuthSubmit} className="mt-5 space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-300">{t('sf_auth_full_name')}</label>
                  <input
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder={t('sf_auth_name_placeholder')}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">{t('sf_auth_email')}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <PhoneVerificationInput
                  id="customer-auth-phone-verification"
                  value={authPhone}
                  onChange={(fullPhone) => {
                    setAuthPhone(fullPhone);
                    if (isCustomerPhoneVerified && fullPhone !== verifiedCustomerPhone) {
                      setIsCustomerPhoneVerified(false);
                    }
                  }}
                  isVerified={isCustomerPhoneVerified}
                  onVerifiedChange={(verified) => {
                    setIsCustomerPhoneVerified(verified);
                    if (verified) {
                      setVerifiedCustomerPhone(authPhone);
                      setAuthNotice('Phone number successfully verified via WhatsApp OTP ✓');
                    }
                  }}
                  userType="customer"
                  label={t('sf_auth_phone')}
                  required={true}
                  defaultCountryCode="+880"
                  darkMode={true}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-300">{t('sf_auth_password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-[#00D68F]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {authNotice && (
                <div className="rounded-xl border border-[#00D68F]/30 bg-[#00D68F]/10 px-3 py-2 text-xs text-[#8CFFDA]">{authNotice}</div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#00D68F] py-3 text-sm font-black text-slate-950 hover:bg-[#00E699] transition"
              >
                {authMode === 'signin' ? 'Continue to Order Dashboard' : 'Create Customer Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showOrderDashboard && customerSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#00D68F]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-[#00D68F] border border-[#00D68F]/30">
                  <PackageCheck className="w-3.5 h-3.5" />
                  Order Dashboard
                </div>
                <h3 className="mt-3 text-2xl font-black text-slate-900">Welcome, {customerSession.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{customerSession.email} • {customerSession.phone}</p>
              </div>
              <button onClick={() => setShowOrderDashboard(false)} className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {customerOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No orders are linked to this account yet. Place your first order from the storefront catalog.</div>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{order.orderNumber}</div>
                        <div className="mt-1 text-lg font-black text-slate-900">{order.paymentMethod}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#00D68F]">৳{order.totalBDT.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{order.fulfillmentStatus}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">{order.createdAt}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#00D68F]" />
                Your Cart
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 border border-slate-100 rounded-2xl bg-slate-50">
                    <img src={item.product.image} alt={item.product.title} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.product.title}</h4>
                        <div className="text-sm font-black text-[#00D68F] mt-1">৳{(item.product.priceBDT ?? 0).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-slate-200 w-fit rounded-lg px-2 py-1 mt-2">
                        <button onClick={() => handleUpdateCartQty(item.product.id, -1)} className="font-bold px-1 text-slate-400 hover:text-slate-900">-</button>
                        <span className="text-xs font-bold text-slate-900 min-w-[16px] text-center">{item.quantity}</span>
                        <button onClick={() => handleUpdateCartQty(item.product.id, 1)} className="font-bold px-1 text-slate-400 hover:text-slate-900">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-slate-500">Subtotal</span>
                  <span className="text-xl font-black text-[#00D68F]">৳{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('checkout');
                  }}
                  className="w-full py-4 bg-[#00D68F] text-slate-950 font-black rounded-xl text-base hover:bg-[#00E699] transition cursor-pointer shadow-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 text-xs mt-6 border-t border-slate-800 space-y-6">
        <div className="space-y-3 text-center">
          <h4 className="text-white text-base font-black">{storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}</h4>
          <p className="text-[11px] leading-relaxed text-slate-400 max-w-xs mx-auto">
            Bangladesh’s Premier Online Fashion & Lifestyle Destination. Powered by ZID SAAS BD Engine.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-300 pt-1">
            <ShieldCheck className="w-4 h-4 text-[#00D68F]" />
            <span>Secure 256-bit SSL Checkout</span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
          © {new Date().getFullYear()} {storefrontMerchant.storeName === 'My Zid Store' ? 'SlateBD' : storefrontMerchant.storeName || 'SlateBD'}. All rights reserved.
        </div>
      </footer>
      </div>
    </div>
  );
};
