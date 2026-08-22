import React, { useState, useEffect, useMemo } from 'react';
import { MerchantProfile, Product, BankAccount, MobileBankingConfig, Order, OrderItem, ThemeConfig } from '../types';
import { ShoppingBag, ShoppingCart, X, Check, CreditCard, Building2, Smartphone, ShieldCheck, Search, Globe, Phone, MapPin, ArrowRight, ArrowLeft, ExternalLink, Clock, Menu, Video, Play, Loader2, User, History, Home, MoreVertical, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface TenantStorefrontViewProps {
  storeSlug: string;
  merchant: MerchantProfile;
  products: Product[];
  bankAccounts: BankAccount[];
  mobileBanking: MobileBankingConfig[];
  themes: ThemeConfig[];
  onPlaceOrder: (order: Order) => void;
  previewThemeId?: string;
  isMobile?: boolean;
}

export const TenantStorefrontView: React.FC<TenantStorefrontViewProps> = ({
  storeSlug,
  merchant,
  products,
  bankAccounts,
  mobileBanking,
  themes,
  onPlaceOrder,
  previewThemeId,
  isMobile,
}) => {
  const effectiveThemeId = previewThemeId || merchant?.activeThemeId || 'growth-1';
  
  // Apply mobile-specific scaling or class overrides if isMobile is true
  const mobileContainerClass = isMobile ? 'scale-[0.9] origin-top' : '';

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'catalog' | 'checkout' | 'success'>('catalog');
  const [cart, setCart] = useState<{product: Product, quantity: number, variant: string}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loggedInUser, setLoggedInUser] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
  } | null>(null);

  const [profileFirstName, setProfileFirstName] = useState('');
  const [profileLastName, setProfileLastName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [localMerchant, setLocalMerchant] = useState<MerchantProfile>(merchant);
  const [localCategories, setLocalCategories] = useState<any[]>([]);

  // Sync localMerchant with merchant prop when it changes (critical for Theme Customizer preview)
  useEffect(() => {
    setLocalMerchant(merchant);
  }, [merchant]);

  const merchantId = merchant?.id;

  // Dynamically load real products, categories and merchant settings from Supabase database by storeSlug on mount and poll
  useEffect(() => {
    let isMounted = true;

    const loadStoreData = async () => {
      console.log(`[TenantStorefrontView] 🚀 [${new Date().toLocaleTimeString()}] Initiating store data fetch for storeSlug: "${storeSlug}" (merchantId: "${merchantId}")`);
      console.log('[TenantStorefrontView DB] Supabase client available:', Boolean(supabase));

      let merchantDbId: string | null = merchantId || null;
      let categoriesFromDb: any[] = [];
      let productsFromDb: any[] = [];
      let merchantUpdated = false;

      // 1. Supabase Direct Database Queries
      if (supabase) {
        // A. Merchant lookup by store_slug (with variations)
        try {
          console.log('[TenantStorefrontView DB] 🔍 Querying merchants table for slug:', storeSlug);
          const { data: dbMerchant, error: merchantErr } = await supabase
            .from('merchants')
            .select('*')
            .or(`store_slug.eq.${storeSlug},storeSlug.eq.${storeSlug},slug.eq.${storeSlug},id.eq.${storeSlug}`)
            .maybeSingle();

          console.log('[TenantStorefrontView DB] 🏢 Supabase merchant response:', { data: dbMerchant, error: merchantErr });

          if (merchantErr) {
            console.error('[TenantStorefrontView DB] ❌ Error fetching merchant profile from Supabase:', merchantErr);
          } else if (dbMerchant && isMounted) {
            merchantUpdated = true;
            merchantDbId = dbMerchant.id || dbMerchant.store_id || dbMerchant.merchant_id || merchantDbId;
            console.log('[TenantStorefrontView DB] ✅ Matched merchant from Supabase. Resolved merchant ID:', merchantDbId);
            setLocalMerchant(prev => ({
              ...prev,
              ...dbMerchant,
              id: dbMerchant.id || prev.id,
              storeName: dbMerchant.store_name || dbMerchant.storeName || prev.storeName,
              storeSlug: dbMerchant.store_slug || dbMerchant.storeSlug || storeSlug,
              logoUrl: dbMerchant.logo_url || dbMerchant.logoUrl || prev.logoUrl,
              themeConfig: dbMerchant.theme_config || dbMerchant.themeConfig || prev.themeConfig,
            }));
          }
        } catch (mEx) {
          console.error('[TenantStorefrontView DB] ❌ Exception during merchant lookup:', mEx);
        }

        // B. Fetch Categories matching store_slug or merchantId/store_id
        try {
          const categoryOrFilters = [
            `store_slug.eq.${storeSlug}`,
            `storeSlug.eq.${storeSlug}`,
            `store_id.eq.${storeSlug}`,
            `merchant_id.eq.${storeSlug}`,
            `merchantId.eq.${storeSlug}`,
          ];
          if (merchantDbId) {
            categoryOrFilters.push(`merchant_id.eq.${merchantDbId}`);
            categoryOrFilters.push(`merchantId.eq.${merchantDbId}`);
            categoryOrFilters.push(`store_id.eq.${merchantDbId}`);
          }
          if (merchantId && merchantId !== merchantDbId && merchantId !== storeSlug) {
            categoryOrFilters.push(`merchant_id.eq.${merchantId}`);
            categoryOrFilters.push(`merchantId.eq.${merchantId}`);
            categoryOrFilters.push(`store_id.eq.${merchantId}`);
          }

          const filterQuery = categoryOrFilters.join(',');
          console.log('[TenantStorefrontView DB] 🔍 Querying categories table with filters:', filterQuery);

          const { data: sbCategories, error: catErr } = await supabase
            .from('categories')
            .select('*')
            .or(filterQuery);

          console.log('[TenantStorefrontView DB] 📦 Supabase categories response:', { 
            count: sbCategories?.length ?? 0, 
            data: sbCategories, 
            error: catErr 
          });

          if (catErr) {
            console.error('[TenantStorefrontView DB] ❌ Supabase categories query error:', catErr);
          } else if (Array.isArray(sbCategories) && sbCategories.length > 0) {
            categoriesFromDb = sbCategories;
          } else {
            console.log('[TenantStorefrontView DB] ⚠️ Supabase returned 0 categories for slug:', storeSlug);
          }
        } catch (catEx) {
          console.error('[TenantStorefrontView DB] ❌ Exception querying categories:', catEx);
        }

        // C. Fetch Products matching store_slug or merchantId/store_id
        try {
          const productOrFilters = [
            `store_slug.eq.${storeSlug}`,
            `storeSlug.eq.${storeSlug}`,
            `store_id.eq.${storeSlug}`,
            `merchant_id.eq.${storeSlug}`,
            `merchantId.eq.${storeSlug}`,
          ];
          if (merchantDbId) {
            productOrFilters.push(`merchant_id.eq.${merchantDbId}`);
            productOrFilters.push(`merchantId.eq.${merchantDbId}`);
            productOrFilters.push(`store_id.eq.${merchantDbId}`);
          }
          if (merchantId && merchantId !== merchantDbId && merchantId !== storeSlug) {
            productOrFilters.push(`merchant_id.eq.${merchantId}`);
            productOrFilters.push(`merchantId.eq.${merchantId}`);
            productOrFilters.push(`store_id.eq.${merchantId}`);
          }

          const filterQuery = productOrFilters.join(',');
          console.log('[TenantStorefrontView DB] 🔍 Querying products table with filters:', filterQuery);

          const { data: sbProducts, error: prodErr } = await supabase
            .from('products')
            .select('*')
            .or(filterQuery);

          console.log('[TenantStorefrontView DB] 🛍️ Supabase products response:', { 
            count: sbProducts?.length ?? 0, 
            data: sbProducts, 
            error: prodErr 
          });

          if (prodErr) {
            console.error('[TenantStorefrontView DB] ❌ Supabase products query error:', prodErr);
          } else if (Array.isArray(sbProducts) && sbProducts.length > 0) {
            productsFromDb = sbProducts;
          } else {
            console.log('[TenantStorefrontView DB] ⚠️ Supabase returned 0 products for slug:', storeSlug);
          }
        } catch (prodEx) {
          console.error('[TenantStorefrontView DB] ❌ Exception querying products:', prodEx);
        }
      }

      // 2. Fallback to Direct Fetching via REST Endpoints (if Supabase empty or RLS blocks)
      if (categoriesFromDb.length === 0) {
        console.log(`[TenantStorefrontView API] 🔄 Categories empty from Supabase. Attempting REST API fallback for slug: "${storeSlug}"...`);
        try {
          const catRes = await fetch(`/api/categories-by-slug/${encodeURIComponent(storeSlug)}`);
          if (catRes.ok) {
            const restCats = await catRes.json();
            console.log('[TenantStorefrontView API] 📥 REST /api/categories-by-slug response:', restCats);
            if (Array.isArray(restCats) && restCats.length > 0) {
              categoriesFromDb = restCats;
            }
          } else {
            console.warn(`[TenantStorefrontView API] REST /api/categories-by-slug returned status ${catRes.status}`);
          }
        } catch (apiCatEx) {
          console.error('[TenantStorefrontView API] ❌ Exception fetching /api/categories-by-slug:', apiCatEx);
        }

        // Secondary REST endpoint with merchant ID if still empty
        if (categoriesFromDb.length === 0 && merchantDbId) {
          try {
            const catRes2 = await fetch(`/api/categories/${encodeURIComponent(merchantDbId)}`);
            if (catRes2.ok) {
              const restCats2 = await catRes2.json();
              console.log(`[TenantStorefrontView API] 📥 REST /api/categories/${merchantDbId} response:`, restCats2);
              if (Array.isArray(restCats2) && restCats2.length > 0) {
                categoriesFromDb = restCats2;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      if (productsFromDb.length === 0) {
        console.log(`[TenantStorefrontView API] 🔄 Products empty from Supabase. Attempting REST API fallback for slug: "${storeSlug}"...`);
        try {
          const prodRes = await fetch(`/api/products-by-slug/${encodeURIComponent(storeSlug)}`);
          if (prodRes.ok) {
            const restProds = await prodRes.json();
            console.log('[TenantStorefrontView API] 📥 REST /api/products-by-slug response:', restProds);
            if (Array.isArray(restProds) && restProds.length > 0) {
              productsFromDb = restProds;
            }
          } else {
            console.warn(`[TenantStorefrontView API] REST /api/products-by-slug returned status ${prodRes.status}`);
          }
        } catch (apiProdEx) {
          console.error('[TenantStorefrontView API] ❌ Exception fetching /api/products-by-slug:', apiProdEx);
        }

        // Secondary REST endpoint with merchant ID if still empty
        if (productsFromDb.length === 0 && merchantDbId) {
          try {
            const prodRes2 = await fetch(`/api/products/${encodeURIComponent(merchantDbId)}`);
            if (prodRes2.ok) {
              const restProds2 = await prodRes2.json();
              console.log(`[TenantStorefrontView API] 📥 REST /api/products/${merchantDbId} response:`, restProds2);
              if (Array.isArray(restProds2) && restProds2.length > 0) {
                productsFromDb = restProds2;
              }
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      if (!merchantUpdated) {
        try {
          const mRes = await fetch(`/api/merchants/slug/${encodeURIComponent(storeSlug)}`);
          if (mRes.ok) {
            const restMerchant = await mRes.json();
            if (restMerchant && isMounted) {
              console.log('[TenantStorefrontView API] 📥 REST /api/merchants/slug response:', restMerchant);
              setLocalMerchant(prev => ({
                ...prev,
                ...restMerchant,
                storeName: restMerchant.storeName || restMerchant.store_name || prev.storeName,
                logoUrl: restMerchant.logoUrl || restMerchant.logo_url || prev.logoUrl,
                themeConfig: restMerchant.themeConfig || restMerchant.theme_config || prev.themeConfig,
              }));
            }
          }
        } catch (e) {
          // Ignore
        }
      }

      // 3. Fallback to Local Storage or Prop Data (if both Supabase and REST returned empty)
      if (categoriesFromDb.length === 0) {
        try {
          const localSavedCats = localStorage.getItem('zid_merchant_categories_v2');
          if (localSavedCats) {
            const parsed = JSON.parse(localSavedCats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[TenantStorefrontView Local] 💾 Using categories from localStorage (zid_merchant_categories_v2):', parsed);
              categoriesFromDb = parsed;
            }
          }
        } catch (e) {
          // Ignore
        }

        if (categoriesFromDb.length === 0 && merchant?.categories && merchant.categories.length > 0) {
          console.log('[TenantStorefrontView Prop] 📦 Using categories from merchant prop:', merchant.categories);
          categoriesFromDb = merchant.categories;
        }
      }

      if (productsFromDb.length === 0) {
        try {
          const localSavedProds = localStorage.getItem('zid_merchant_products');
          if (localSavedProds) {
            const parsed = JSON.parse(localSavedProds);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log('[TenantStorefrontView Local] 💾 Using products from localStorage (zid_merchant_products):', parsed);
              productsFromDb = parsed;
            }
          }
        } catch (e) {
          // Ignore
        }

        if (productsFromDb.length === 0 && Array.isArray(products) && products.length > 0) {
          console.log('[TenantStorefrontView Prop] 🛍️ Using products from products prop:', products);
          productsFromDb = products;
        }
      }

      // 4. Map and Synchronize State
      if (!isMounted) return;

      if (categoriesFromDb.length > 0) {
        const mappedCategories = categoriesFromDb.map((c: any, index: number) => ({
          ...c,
          id: c.id || c._id || `cat-${index}`,
          name: c.name || c.title || 'Category',
          slug: c.slug || c.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          image: c.image || c.imageUrl || c.image_url || '',
          coverImage: c.coverImage || c.cover_image || '',
          status: c.status || 'Active',
          productCount: Number(c.productCount ?? c.product_count ?? 0),
        }));
        setLocalCategories(mappedCategories);
      }

      if (productsFromDb.length > 0) {
        const mappedProducts: Product[] = productsFromDb.map((p: any, index: number) => ({
          ...p,
          id: p.id || p._id || `p-${index}`,
          title: p.title || p.name || 'Untitled Product',
          titleBn: p.titleBn || p.title_bn,
          priceBDT: Number(p.priceBDT ?? p.price ?? 0),
          compareAtPriceBDT: p.compareAtPriceBDT ? Number(p.compareAtPriceBDT) : (p.compare_at_price ? Number(p.compare_at_price) : undefined),
          status: p.status || 'Active',
          category: p.category || p.category_name || '',
          categoryId: p.categoryId || p.category_id,
          image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
          stock: Number(p.stock ?? 10),
          merchantId: p.merchantId || p.merchant_id || merchantDbId || storeSlug,
        }));
        setLocalProducts(mappedProducts);
      }

      console.log(`[TenantStorefrontView] 🏁 Data load complete for "${storeSlug}":`, {
        categoriesRendered: categoriesFromDb.length,
        productsRendered: productsFromDb.length,
        merchantName: localMerchant?.storeName || merchant?.storeName
      });
    };

    loadStoreData();

    // Poll to synchronize in real-time
    const interval = setInterval(loadStoreData, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [storeSlug, merchantId, products, merchant]);

  // Load orders and logged in user details
  useEffect(() => {

    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setLoggedInUser(parsedUser);
        setProfileFirstName(parsedUser.firstName || '');
        setProfileLastName(parsedUser.lastName || '');
        setProfilePhone(parsedUser.phone || '');
        setProfileEmail(parsedUser.email || '');
        setProfileAddress(parsedUser.address || '');
        if (parsedUser.firstName) {
          setCustName(`${parsedUser.firstName} ${parsedUser.lastName || ''}`.trim());
        }
        if (parsedUser.phone) {
          setCustPhone(parsedUser.phone);
        }
        if (parsedUser.address) {
          setCustAddress(parsedUser.address);
        }
      }
    } catch (e) {
      console.error('Error loading user profile:', e);
    }
  }, [storeSlug]);

  // Dynamic favicon and splash timeout
  useEffect(() => {
    const faviconUrl = themes?.[0]?.logoImageUrl || merchant?.logoUrl;
    if (faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }

    // Set page title to the store name
    if (merchant?.storeName) {
      document.title = `${merchant.storeName} | Zid Storefront`;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [merchant?.logoUrl, merchant?.storeName, themes]);

  // Loaded dynamically from the stored merchant config for the store
  const [storeCodConfig] = useState<any>(() => {
    try {
      const key = `ZID_MERCHANT_STORE_DATA_${storeSlug}`;
      const customStoreDataStr = localStorage.getItem(key);
      if (customStoreDataStr) {
        const parsed = JSON.parse(customStoreDataStr);
        if (parsed.codConfig) return parsed.codConfig;
      }
      const activeStoreStr = localStorage.getItem('ZID_MERCHANT_STORE_DATA');
      if (activeStoreStr) {
        const parsed = JSON.parse(activeStoreStr);
        if (parsed.codConfig) return parsed.codConfig;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const storeCity = (() => {
    const address = (merchant?.themeConfig?.dhakaAddress || '').toLowerCase();
    if (address.includes('chittagong')) return 'Chittagong';
    if (address.includes('sylhet')) return 'Sylhet';
    return 'Dhaka';
  })();

  const insideFee = storeCodConfig && storeCodConfig.insideDhakaFee !== '' && storeCodConfig.insideDhakaFee !== undefined
    ? Number(storeCodConfig.insideDhakaFee)
    : 80;

  const outsideFee = storeCodConfig && storeCodConfig.outsideDhakaFee !== '' && storeCodConfig.outsideDhakaFee !== undefined
    ? Number(storeCodConfig.outsideDhakaFee)
    : 150;

  // Checkout Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [payMethod, setPayMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cod'>('bkash');
  const [custCity, setCustCity] = useState(storeCity);
  const [custAddress, setCustAddress] = useState('');
  const [custTxId, setCustTxId] = useState('');
  const [confirmedOrderNum, setConfirmedOrderNum] = useState('');
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.priceBDT * item.quantity), 0);
  const selectedIsInside = custCity ? custCity.toLowerCase() === storeCity.toLowerCase() : true;

  // Get product-specific or global delivery rates
  const currentProductForShipping = selectedProduct || (cart.length > 0 ? cart[0].product : null);
  const currentProductDeliveryRates = currentProductForShipping?.deliveryRates;

  const activeDeliveryOptions = useMemo(() => {
    if (currentProductDeliveryRates && currentProductDeliveryRates.length > 0) {
      return currentProductDeliveryRates.map((r: any) => ({
        label: `${r.zoneName} - ৳${r.fee}`,
        value: r.zoneName,
        fee: Number(r.fee)
      }));
    }
    // Fallback to merchant global settings
    return [
      {
        label: `Inside ${storeCity} - ৳${insideFee}`,
        value: `Inside ${storeCity}`,
        fee: insideFee
      },
      {
        label: `Outside ${storeCity} - ৳${outsideFee}`,
        value: `Outside ${storeCity}`,
        fee: outsideFee
      }
    ];
  }, [currentProductDeliveryRates, storeCity, insideFee, outsideFee]);

  const shippingFee = useMemo(() => {
    // Find the selected option in activeDeliveryOptions to get its fee
    const selectedOption = activeDeliveryOptions.find(opt => opt.value === custCity);
    if (selectedOption) return selectedOption.fee;
    
    // If no option is selected or found, default to inside fee
    return insideFee;
  }, [custCity, activeDeliveryOptions, insideFee]);

  const totalAmount = (cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0)) + shippingFee;

  const handleAddToCart = (product: Product, variant = 'Default') => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.variant === variant);
      if (existing) {
        return prev.map(item => item.product.id === product.id && item.variant === variant
          ? { ...item, quantity: item.quantity + 1 }
          : item
        );
      }
      return [...prev, { product, quantity: 1, variant }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as any);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = '#' + Math.floor(100000 + Math.random() * 900000);
    setConfirmedOrderNum(orderNum);

    const items: OrderItem[] = cart.length > 0 ? cart.map((c, i) => ({
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

    const subtotal = cart.length > 0 ? cartTotal : (selectedProduct?.priceBDT || 0);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      source: 'Store',
      customerName: custName,
      customerPhone: custPhone,
      customerCity: custCity,
      deliveryZone: selectedIsInside ? 'Inside Dhaka' : 'Outside Dhaka',
      address: custAddress,
      platform: 'Mobile web',
      subtotalBDT: subtotal,
      deliveryCharge: shippingFee,
      totalBDT: subtotal + shippingFee,
      paymentMethod: payMethod === 'bkash' ? 'bKash' : payMethod === 'nagad' ? 'Nagad' : payMethod === 'rocket' ? 'Rocket' : payMethod === 'bank' ? 'Bank Transfer' : 'COD',
      paymentStatus: payMethod === 'cod' ? 'Unpaid' : 'Pending Verification',
      transactionId: custTxId || undefined,
      fulfillmentStatus: 'Unfulfilled',
      status: 'New',
      courierName: 'Steadfast Courier',
      trackingCode: 'SF-PENDING-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toLocaleString(),
      items,
      merchantId: merchant?.id,
      storeSlug: storeSlug,
    };

    onPlaceOrder(newOrder);

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
    } catch (e) {
      console.warn('Error saving order to Supabase:', e);
    }

    setOrders(prev => [newOrder, ...prev]);
    setCheckoutStep('success');
    setCart([]);
  };

  // Vector Placeholder Component for minimalist cartoon/vector illustrations
  const VectorPlaceholder: React.FC<{ type?: string; className?: string }> = ({ type = 'tshirt', className = '' }) => (
    <div className={`w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-amber-50/20 flex items-center justify-center p-6 ${className}`}>
      <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform duration-300">
        {type === 'tshirt' && (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H5v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10h1.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
          </svg>
        )}
        {type === 'bag' && (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
        )}
        {type === 'box' && (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          </svg>
        )}
        {type === 'gadget' && (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
        )}
        {type !== 'tshirt' && type !== 'bag' && type !== 'box' && type !== 'gadget' && (
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
        )}
      </div>
    </div>
  );

  const hasMerchantProducts = localProducts && localProducts.length > 0;


  // Dynamic product inventory for storefront homepage
  const displayProducts = (localProducts && localProducts.length > 0) ? localProducts : (products && products.length > 0 ? products : []);
  const themeConfig = localMerchant.themeConfig || {};
  const { 
    headerBgColor = '#ffffff', 
    announcementBg = '#D4AF37', 
    headerSticky = true, 
    showAnnouncement = true, 
    showHeroBanner = true, 
    showCategories = true, 
    showFeaturedGrid = true, 
    categoriesHeading = 'Popular Categories', 
    categoriesSubtitle = 'Shop by category', 
    categoriesMoreButtonText = 'View All', 
    featuredHeading = 'Featured Products', 
    heroCtaText = 'Shop Now', 
    footerAboutText = 'A simple store powered by Zid Multi-Tenant SaaS Engine.', 
    footerLinksTitle = 'Quick Links', 
    footerLinks = ['About Us', 'Shipping Policy', 'Return Policy', 'Track Order'], 
    contactPhone = '', 
    dhakaAddress = '',
    announcementText = '',
    announcementItems = [],
    isMarquee = true,
    marqueeSpeed = 20,
    announcementLink = '',
    slides = [],
    heroTitle = '',
    heroSubtitle = '',
    heroImage = '',
    categoriesLayout = 'Grid',
    categoriesSelection = 'All categories',
    categoriesItemsPerRow = 4,
    categoriesShowItemCount = true,
    categoriesShowMoreButton = true,
    categoriesBgImage = '',
    categoriesOverlayOpacity = 40,
    categoriesList = [],
    menuItems = [],
    productColumns = 4,
    showCountdown = true,
    countdownTitle = '⚡ Flash Sale Ends In:',
    countdownEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    countdownBgImage = '',
    countdownOverlayOpacity = 60,
    countdownHours = 14,
    countdownDiscount = 'Extra 15% OFF!',
    showGallery = true,
    galleryHeading = 'Gallery',
    galleryImages = [],
    showSocialBlock = true,
    socialTagline = '',
    facebookHandle = '',
    instagramHandle = '',
    whatsappNumber = '',
    tiktokHandle = '',
    youtubeHandle = '',
    showFacebook = true,
    showInstagram = true,
    showWhatsapp = true,
    showTikTok = true,
    showYouTube = true,
    socialButtonStyle = 'Modern Pill Buttons',
    showVideo = true,
    videoTitle = '',
    videoUrl = '',
    videoCoverImage = '',
    videoFileUrl = '',
    videoAutoplay = false,
    videoMuted = true,
    footerLogoText = 'Store',
    footerTagline = '',
    showPaymentBadges = true,
    aiRecommendationsEnabled = false,
    desktopCarouselHeight = 450,
    mobileCarouselHeight = 320,
    contentSectionsOrder = [
      { id: 'carousel', key: 'carousel', name: 'Image Carousel' },
      { id: 'categories', key: 'categories', name: 'Categories' },
      { id: 'products', key: 'products', name: 'Products' },
      { id: 'countdown', key: 'countdown', name: 'Countdown Timer' },
      { id: 'gallery', key: 'gallery', name: 'Gallery' },
      { id: 'brand_social', key: 'brand_social', name: 'Logo & Social Media' },
      { id: 'video', key: 'video', name: 'Video' }
    ]
  } = themeConfig;

  const validAnnouncements = useMemo(() => {
    if (announcementItems && announcementItems.some((i: string) => i.trim() !== '')) {
      return announcementItems.filter((i: string) => i.trim() !== '');
    }
    if (announcementText && announcementText.trim() !== '') {
      return [announcementText.trim()];
    }
    if (merchant?.announcementText && merchant.announcementText.trim() !== '') {
      return [merchant.announcementText.trim()];
    }
    return [];
  }, [announcementItems, announcementText, merchant?.announcementText]);

  const isModernGold = effectiveThemeId === 'modern-gold-luxury';
  const isSupermarket = effectiveThemeId === 'supermarket-tech';
  const isElegantFashion = effectiveThemeId === 'elegant-fashion';

  const rootBgClass = isModernGold ? 'bg-zinc-950 text-zinc-50' : isSupermarket ? 'bg-[#F2F4F8] text-slate-900' : 'bg-slate-50 text-slate-900';
  const headerClass = isModernGold ? 'bg-zinc-900 border-zinc-800' : isSupermarket ? 'bg-white border-slate-200' : 'bg-white border-slate-200';
  const textClass = isModernGold ? 'text-zinc-50' : 'text-slate-900';
  const accentColor = isModernGold ? '#D4AF37' : '#00D68F';

  return (
    <div className={`relative min-h-screen pb-20 md:pb-0 font-sans selection:bg-[#D4AF37] selection:text-white ${rootBgClass} ${mobileContainerClass}`}>
      {/* Branded Loading Splash Screen with Zid BD Logo & Merchant Identity */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.5, ease: 'easeInOut' } }}
            className="fixed inset-0 bg-[#12141C] text-white z-50 flex flex-col items-center justify-center p-6 overflow-hidden select-none"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, type: 'spring', bounce: 0.3 }}
              className="flex flex-col items-center gap-6 relative z-10 text-center"
            >
              {/* Zid BD Primary Logo Emblem */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-[#BF953F] via-[#FCF6BA] to-[#B38728] shadow-2xl shadow-[#D4AF37]/30 flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-[#181B26] flex items-center justify-center relative overflow-hidden">
                    {/* Golden Z Mark */}
                    <svg viewBox="0 0 40 40" className="w-10 h-10 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M10 11 H30 L15 29 H30"
                        stroke="#D4AF37"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Sparkling BD Badge */}
                <span className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#BF953F] to-[#B38728] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg border border-[#FCF6BA]/50">
                  BD
                </span>
              </div>

              {/* Brand Typography */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-black tracking-wider text-white">
                    ZID <span className="text-[#E6C587]">SAAS BD</span>
                  </h1>
                </div>
                <p className="text-xs text-slate-400 font-medium tracking-wide">
                  পাওয়ার্ড বাই জিৎ বিডি ক্লাউড ই-কমার্স
                </p>
              </div>

              {/* Merchant Store Connection Node */}
              {merchant?.storeName && (
                <div className="mt-2 bg-[#1D2232] border border-[#2E3548] px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-lg">
                  {merchant.logoUrl ? (
                    <img src={merchant.logoUrl} alt={merchant.storeName} className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]/40" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-bold flex items-center justify-center">
                      {merchant.storeName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-bold text-slate-200">{merchant.storeName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
              )}

              {/* Progress Indicator */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <div className="flex items-center gap-2 text-[#E6C587]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[11px] font-bold tracking-widest uppercase">
                    Entering Customer Storefront...
                  </span>
                </div>
                <div className="w-48 h-1 bg-[#252B3B] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.4, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-[#BF953F] to-[#FCF6BA]"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className={`${headerSticky ? 'sticky top-0' : ''} z-40 border-b shadow-sm ${headerClass}`} style={{ backgroundColor: isModernGold ? '#18181B' : headerBgColor }}>
        {/* Top Announcement Bar */}
        {showAnnouncement && validAnnouncements.length > 0 && (
          <div 
            style={{ backgroundColor: isModernGold ? accentColor : announcementBg }} 
            className="text-slate-950 py-2.5 px-4 text-center text-xs font-extrabold tracking-wide overflow-hidden relative shadow-inner"
          >
            <style>{`
              @keyframes marqueeScroll {
                0% { transform: translateX(0%); }
                100% { transform: translateX(-50%); }
              }
              .animate-marquee-custom {
                display: inline-flex;
                white-space: nowrap;
              }
            `}</style>
            {isMarquee ? (
              <div className="overflow-hidden whitespace-nowrap w-full">
                <a 
                  href={announcementLink || '#'} 
                  onClick={(e) => { if (!announcementLink) e.preventDefault(); }}
                  className="block hover:underline"
                >
                  <div 
                    className="inline-flex items-center gap-8 animate-marquee-custom"
                    style={{
                      animation: `marqueeScroll ${marqueeSpeed}s linear infinite`
                    }}
                  >
                    {validAnnouncements.map((item: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-3 shrink-0">
                        <span>{item}</span>
                        <span className="text-slate-950/40">✦</span>
                      </span>
                    ))}
                    {validAnnouncements.map((item: string, idx: number) => (
                      <span key={`dup-${idx}`} className="inline-flex items-center gap-3 shrink-0">
                        <span>{item}</span>
                        <span className="text-slate-950/40">✦</span>
                      </span>
                    ))}
                  </div>
                </a>
              </div>
            ) : (
              <a 
                href={announcementLink || '#'} 
                onClick={(e) => { if (!announcementLink) e.preventDefault(); }}
                className="hover:underline text-center font-extrabold block"
              >
                {validAnnouncements[0]}
              </a>
            )}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 transition-transform active:scale-95" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <MoreVertical className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCheckoutStep('catalog')}>
              {(themeConfig.logoImageUrl || merchant?.logoUrl) ? (
                <img 
                  src={themeConfig.logoImageUrl || merchant?.logoUrl} 
                  alt={merchant?.storeName || 'Logo'} 
                  style={{ height: themeConfig.logoHeight ? `${themeConfig.logoHeight}px` : '32px' }} 
                  className="max-w-[150px] object-contain"
                />
              ) : (
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  {merchant?.storeName || 'Store'}
                </h1>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {(menuItems && menuItems.length > 0 ? menuItems : [
              { id: 'm1', title: 'Home', url: '/' },
              { id: 'm2', title: 'Shop All', url: '/catalog' },
              { id: 'm3', title: 'Flash Sale', url: '/sale' },
              { id: 'm4', title: 'Track Order', url: '/track' },
            ]).map((item: any) => (
              <a 
                key={item.id}
                href={item.url} 
                onClick={(e) => {
                  e.preventDefault();
                  if (item.url === '/track') setIsOrdersModalOpen(true);
                  else if (item.url === '/') setCheckoutStep('catalog');
                }} 
                className={`text-sm font-semibold transition flex items-center gap-1 ${item.title.toLowerCase().includes('sale') ? 'text-red-500 hover:text-red-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {item.title.toLowerCase().includes('sale') && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                {item.title}
              </a>
            ))}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsProfileModalOpen(true); }} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer">
              <User className="w-4 h-4 text-[#accentColor]" style={{ color: accentColor }} />
              <span>{loggedInUser?.firstName ? `প্রোফাইল (${loggedInUser.firstName})` : 'সাইন-ইন (Sign-In)'}</span>
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-48 lg:w-64 rounded-full pl-9 pr-4 py-2 text-sm bg-slate-100 border-transparent focus:bg-white focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition outline-none"
              />
            </div>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 text-slate-600 hover:text-[#D4AF37] transition cursor-pointer"
              title="Customer Profile / Sign In"
            >
              <User className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-[#D4AF37] transition"
            >
              <ShoppingBag className="w-6 h-6" />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center bg-[#D4AF37] shadow">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Overlay Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              {/* Dropdown Card */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="md:hidden border-b border-slate-200/60 bg-white absolute w-full left-0 shadow-xl z-50 rounded-b-2xl overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categories & Navigation</div>
                  <nav className="flex flex-col gap-3.5">
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setCheckoutStep('catalog'); setIsMobileMenuOpen(false); }} 
                      className="text-sm font-extrabold text-[#D4AF37] flex items-center gap-2 py-1"
                    >
                      Home
                    </a>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }} 
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition py-1"
                    >
                      Shop All
                    </a>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }} 
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition py-1"
                    >
                      Sarees & Ethnic
                    </a>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); }} 
                      className="text-sm font-semibold text-red-500 hover:text-red-600 transition flex items-center gap-2 py-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      Flash Sale
                    </a>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); setIsOrdersModalOpen(true); }} 
                      className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition py-1"
                    >
                      Track Order
                    </a>
                  </nav>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Area */}
      <main className="w-full">
        
        {/* Catalog View */}
        {checkoutStep === 'catalog' && (
          <div className={`space-y-0 ${isSupermarket ? 'max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6 p-4 md:p-6' : ''}`}>
            
            {/* Supermarket Sidebar */}
            {isSupermarket && (
              <aside className="hidden lg:block w-72 shrink-0 bg-white rounded-3xl border border-slate-200/60 p-6 h-fit sticky top-24 shadow-sm">
                <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Menu className="w-5 h-5 text-[#00D68F]" />
                  All Categories
                </h3>
                <nav className="space-y-1">
                  {['Groceries & Essentials', 'Fresh Produce', 'Electronics', 'Home Appliances', 'Baby Care', 'Personal Care', 'Snacks & Beverages', 'Household Items'].map((cat, i) => (
                    <a key={i} href="#" onClick={e => e.preventDefault()} className="block py-2.5 px-3 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">
                      {cat}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 p-4 bg-gradient-to-br from-[#00D68F]/10 to-[#00D68F]/5 rounded-2xl border border-[#00D68F]/20">
                  <h4 className="font-bold text-slate-900 text-sm">Need Help?</h4>
                  <p className="text-xs text-slate-500 mt-1">Call us 24/7 at 16xxx</p>
                </div>
              </aside>
            )}

            <div className={`flex-1 min-w-0 ${isSupermarket ? 'space-y-8' : ''}`}>
              {contentSectionsOrder.map((sec: any) => {
              if (sec.id === 'carousel' && showHeroBanner) {
                const hasSlides = slides && slides.length > 0;
                const activeSlide = hasSlides ? slides[0] : null;
                
                return (
                  <div key="sec-carousel" className="w-full relative overflow-hidden bg-slate-900 group" style={{ height: `${mobileCarouselHeight}px` }}>
                    <style>{`
                      @media (min-width: 768px) {
                        .carousel-height-responsive {
                          height: ${desktopCarouselHeight}px !important;
                        }
                      }
                    `}</style>
                    <div className="w-full h-full carousel-height-responsive relative">
                      <img 
                        src={activeSlide?.image || heroImage || merchant?.heroImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80'} 
                        alt="Hero Banner" 
                        className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent flex items-center">
                        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                          <div className="max-w-xl space-y-4">
                            <span className="inline-block bg-[#D4AF37] text-slate-950 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full" style={{ backgroundColor: accentColor }}>
                              New Arrivals
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                              {activeSlide?.title || heroTitle || merchant?.heroTitle || `Welcome to ${merchant?.storeName || 'Store'}`}
                            </h2>
                            <p className="text-sm md:text-base text-slate-300">
                              {activeSlide?.subtitle || heroSubtitle || merchant?.heroSubtitle || 'Discover our new collections.'}
                            </p>
                            <button className="bg-[#D4AF37] hover:bg-[#FCF6BA] text-slate-950 font-black px-6 py-3 rounded-xl transition shadow-lg mt-2 inline-flex items-center gap-2" style={{ backgroundColor: accentColor }}>
                              {activeSlide?.ctaText || heroCtaText} <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'countdown' && showCountdown) {
                return (
                  <div 
                    key="sec-countdown"
                    style={{
                      backgroundImage: countdownBgImage ? `url(${countdownBgImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className="relative text-white px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md overflow-hidden bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 my-12 max-w-7xl mx-auto rounded-3xl"
                  >
                    <div 
                      className="absolute inset-0 bg-slate-950 pointer-events-none rounded-3xl" 
                      style={{ opacity: countdownBgImage ? countdownOverlayOpacity / 100 : 0.15 }}
                    />

                    <div className="relative z-10 flex items-center gap-2 font-black text-base md:text-lg">
                      <Clock className="w-6 h-6 animate-pulse text-yellow-300" />
                      <span>{countdownTitle}</span>
                    </div>
                    
                    <div className="relative z-10 flex items-center gap-3 flex-wrap justify-center">
                      <div className="flex items-center gap-1 font-mono text-sm font-bold bg-slate-950/60 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 shadow-xs">
                        <span>{countdownHours} Hours</span>
                        <span className="text-amber-400">:</span>
                        <span>42 Mins</span>
                        <span className="text-amber-400">:</span>
                        <span>18 Secs</span>
                      </div>
                      {countdownEndDate && (
                        <span className="text-xs font-mono text-amber-200 hidden md:inline">
                          Ends: {countdownEndDate.replace('T', ' ')}
                        </span>
                      )}
                      <span className="bg-white text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs">
                        {countdownDiscount}
                      </span>
                    </div>
                  </div>
                );
              }

              if (sec.id === 'categories' && showCategories) {
                const effectiveCategories = (localCategories && localCategories.length > 0) 
                  ? localCategories 
                  : (categoriesList && categoriesList.length > 0 
                      ? categoriesList 
                      : (merchant?.categories && merchant.categories.length > 0 ? merchant.categories : []));
                const hasCustomCategories = effectiveCategories && effectiveCategories.length > 0;
                return (
                  <section 
                    key="sec-categories"
                    style={{
                      backgroundImage: categoriesBgImage ? `url(${categoriesBgImage})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className={`relative p-6 sm:p-12 space-y-6 my-12 max-w-7xl mx-auto rounded-3xl border shadow-xs ${isModernGold ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200/60'}`}
                  >
                    {categoriesBgImage && (
                      <div 
                        className="absolute inset-0 bg-slate-950 pointer-events-none rounded-3xl" 
                        style={{ opacity: categoriesOverlayOpacity / 100 }}
                      />
                    )}

                    <div className={`relative z-10 flex justify-between items-end border-b pb-4 ${isModernGold ? 'border-zinc-800' : 'border-slate-200/60'}`}>
                      <div>
                        <h2 className={`text-2xl font-extrabold tracking-tight ${categoriesBgImage ? 'text-white' : textClass}`}>{categoriesHeading}</h2>
                        <p className={`text-sm mt-1 ${categoriesBgImage ? 'text-slate-300' : isModernGold ? 'text-zinc-400' : 'text-slate-500'}`}>{categoriesSubtitle}</p>
                      </div>
                      {categoriesShowMoreButton && (
                        <button className="text-sm font-bold text-[#D4AF37] hover:underline cursor-pointer">{categoriesMoreButtonText}</button>
                      )}
                    </div>
                    
                    <div className={`relative z-10 grid gap-6 ${isElegantFashion ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
                      {effectiveCategories
                        .filter((c: any) => !c.status || c.status === 'Active' || c.status === 'published' || c.status === 'Published' || (c.status !== 'hidden' && c.status !== 'draft'))
                        .map((cat: any, idx: number) => (
                          <div key={cat.id || idx} className="group flex flex-col items-center gap-3 cursor-pointer">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-xs group-hover:shadow-md border border-slate-200/80 bg-slate-100/80 transition-all flex items-center justify-center">
                              {cat.image ? (
                                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-100">
                                  <Sparkles className="w-6 h-6 text-slate-400 mb-1" />
                                  <span className="text-[10px] font-bold text-slate-500 line-clamp-1">{cat.name}</span>
                                </div>
                              )}
                            </div>
                            <h3 className={`font-bold text-sm text-center ${categoriesBgImage ? 'text-white' : textClass}`}>{cat.name}</h3>
                          </div>
                        ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'products' && showFeaturedGrid) {
                return (
                  <section key="sec-products" className={`space-y-6 max-w-7xl mx-auto my-12 p-6 sm:p-12 rounded-3xl border shadow-xs ${isModernGold ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200/60'}`}>
                    <div className={`flex justify-between items-end border-b pb-4 ${isModernGold ? 'border-zinc-800' : 'border-slate-200'}`}>
                      <div>
                        <h2 className={`text-2xl font-extrabold tracking-tight ${textClass}`}>{featuredHeading}</h2>
                        <p className={`text-sm mt-1 ${isModernGold ? 'text-zinc-400' : 'text-slate-500'}`}>Best selling items this week</p>
                      </div>
                      <button className="text-sm font-bold text-[#D4AF37] hover:underline cursor-pointer">See More</button>
                    </div>

                    <div className={`grid grid-cols-2 ${productColumns === 3 ? 'lg:grid-cols-3' : productColumns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4 md:gap-6`}>
                      {displayProducts.map(p => (
                        <div 
                          key={p.id}
                          className={`group flex flex-col justify-between rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300 relative ${isModernGold ? 'bg-zinc-950 border-zinc-800 hover:shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:border-[#D4AF37]/30' : 'bg-white border-slate-200'}`}
                        >
                          {p.status === 'Active' && (
                            <div className="absolute top-3 left-3 z-10 bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                              Hot Sale
                            </div>
                          )}

                          <div className={`relative aspect-[4/5] overflow-hidden cursor-pointer ${isModernGold ? 'bg-zinc-900' : 'bg-slate-100'}`} onClick={() => {
                            setSelectedProduct(p);
                            setCheckoutStep('checkout');
                          }}>
                            {p.image ? (
                              <img 
                                src={p.image} 
                                alt={p.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                              />
                            ) : (
                              <VectorPlaceholder type={(p as any).vectorType || 'tshirt'} />
                            )}
                          </div>

                          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isModernGold ? 'text-zinc-500' : 'text-slate-400'}`}>{p.category}</p>
                              <h4 className={`font-semibold text-sm md:text-base line-clamp-2 leading-snug cursor-pointer hover:text-[#D4AF37] transition ${textClass}`}
                                  onClick={() => { setSelectedProduct(p); setCheckoutStep('checkout'); }}>
                                {p.title}
                              </h4>
                              {p.titleBn && <p className={`text-xs mt-1 ${isModernGold ? 'text-zinc-500' : 'text-slate-500'}`}>{p.titleBn}</p>}
                            </div>
                            
                            <div className="pt-2 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <div className="text-lg font-black text-[#D4AF37] tracking-tight">
                                    ৳{p.priceBDT.toLocaleString()}
                                  </div>
                                  {p.compareAtPriceBDT && (
                                    <div className={`text-xs line-through ${isModernGold ? 'text-zinc-600 decoration-zinc-700' : 'text-slate-400 decoration-slate-300'}`}>
                                      ৳{p.compareAtPriceBDT.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Two Action Buttons */}
                              <div className="flex flex-col gap-2 pt-1 w-full" id={`p-actions-${p.id}`}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                                  className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] shadow-xs ${isModernGold ? 'bg-zinc-800 text-zinc-300 hover:bg-[#D4AF37] hover:text-zinc-950' : 'bg-slate-100 text-slate-700 hover:bg-[#D4AF37] hover:text-white'}`}
                                  id={`btn-cart-${p.id}`}
                                >
                                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                                  <span>কার্টে যোগ করুন</span>
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setSelectedProduct(p);
                                    const exists = cart.some(item => item.product.id === p.id);
                                    if (!exists) {
                                      setCart(prev => [...prev, { product: p, quantity: 1, variant: 'Default' }]);
                                    }
                                    setCheckoutStep('checkout'); 
                                  }}
                                  className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] shadow-sm ${isModernGold ? 'bg-[#D4AF37] text-zinc-950 hover:bg-[#C5A059]' : 'bg-[#D4AF37] text-white hover:bg-[#C5A059]'}`}
                                  id={`btn-buy-${p.id}`}
                                >
                                  <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                                  <span>এখনই কিনুন</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'gallery' && showGallery) {
                const hasGalleryImages = galleryImages && galleryImages.length > 0;
                return (
                  <section key="sec-gallery" className="p-6 md:p-12 bg-white border border-slate-200/60 rounded-3xl shadow-xs space-y-6 max-w-7xl mx-auto my-12">
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{galleryHeading}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {hasGalleryImages ? (
                        galleryImages.map((img: any, i: number) => (
                          <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between bg-slate-50">
                            <div className="h-40 overflow-hidden relative group">
                              <img src={img.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600'} alt={img.caption || `Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            </div>
                            {img.caption && <p className="p-3 text-xs font-bold text-slate-700 text-center leading-tight">{img.caption}</p>}
                          </div>
                        ))
                      ) : (
                        [1, 2, 3, 4].map((i) => (
                          <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                              Image Placeholder {i}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'brand_social' && showSocialBlock) {
                return (
                  <section key="sec-brand_social" className="bg-indigo-900 text-white p-8 md:p-12 text-center space-y-6 max-w-7xl mx-auto my-12 rounded-3xl shadow-md">
                    {socialTagline && <p className="text-base font-extrabold text-indigo-100">{socialTagline}</p>}
                    <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold">
                      {showFacebook && facebookHandle && (
                        <a href={`https://facebook.com/${facebookHandle}`} target="_blank" rel="noopener noreferrer" className="bg-indigo-800 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition flex items-center gap-2">
                          <span>Facebook: @{facebookHandle}</span>
                        </a>
                      )}
                      {showInstagram && instagramHandle && (
                        <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noopener noreferrer" className="bg-indigo-800 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition flex items-center gap-2">
                          <span>Instagram: @{instagramHandle}</span>
                        </a>
                      )}
                      {showWhatsapp && whatsappNumber && (
                        <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl transition flex items-center gap-2 font-bold">
                          <span>WhatsApp: {whatsappNumber}</span>
                        </a>
                      )}
                      {showTikTok && tiktokHandle && (
                        <span className="bg-indigo-800 px-4 py-2.5 rounded-xl">TikTok: @{tiktokHandle}</span>
                      )}
                      {showYouTube && youtubeHandle && (
                        <span className="bg-indigo-800 px-4 py-2.5 rounded-xl">YouTube: {youtubeHandle}</span>
                      )}
                    </div>
                  </section>
                );
              }

              if (sec.id === 'video' && showVideo) {
                return (
                  <section key="sec-video" className="p-6 md:p-10 bg-slate-900 text-white rounded-3xl shadow-sm space-y-4 max-w-7xl mx-auto my-12">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                        <Video className="w-5 h-5 text-pink-400" />
                        <span>{videoTitle || 'Featured Video'}</span>
                      </h3>
                      {videoAutoplay && (
                        <span className="bg-pink-500/20 text-pink-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                          <span>Autoplay Active</span>
                        </span>
                      )}
                    </div>

                    <div className="relative bg-slate-800 rounded-2xl h-[300px] md:h-[450px] border border-slate-700 flex items-center justify-center overflow-hidden group cursor-pointer shadow-lg">
                      {videoFileUrl && videoFileUrl.startsWith('data:video') ? (
                        <video 
                          src={videoFileUrl} 
                          autoPlay={videoAutoplay} 
                          muted={videoAutoplay || videoMuted} 
                          loop={videoAutoplay}
                          playsInline={videoAutoplay}
                          controls={!videoAutoplay}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <>
                          <img 
                            src={videoCoverImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80'} 
                            alt="Video cover" 
                            className="w-full h-full object-cover opacity-60 group-hover:scale-102 transition duration-500" 
                          />
                          <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/20 transition" />
                          <div className="absolute w-16 h-16 bg-pink-600 hover:bg-pink-500 text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition duration-300">
                            <Play className="w-8 h-8 fill-white ml-1" />
                          </div>
                        </>
                      )}
                    </div>
                  </section>
                );
              }

              if (sec.isCustom) {
                if (sec.name === 'Partners') {
                  return (
                    <div key={sec.id} className="p-8 bg-slate-900 text-white border-t border-slate-800 space-y-4 max-w-7xl mx-auto my-12 rounded-3xl shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Trusted Payment & Shipping Partners</h3>
                      <div className="flex flex-wrap items-center justify-center gap-6 opacity-80 text-xs font-mono font-bold">
                        <span className="bg-pink-600/20 text-pink-400 px-3 py-1.5 rounded-lg border border-pink-500/30">bKash</span>
                        <span className="bg-orange-600/20 text-orange-400 px-3 py-1.5 rounded-lg border border-orange-500/30">Nagad</span>
                        <span className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30">VISA / MasterCard</span>
                        <span className="bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">Pathao Courier</span>
                        <span className="bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/30">Steadfast Express</span>
                      </div>
                    </div>
                  );
                }
                if (sec.name === 'Hero Banner') {
                  return (
                    <div key={sec.id} className="relative bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-8 sm:p-16 space-y-4 text-center overflow-hidden max-w-7xl mx-auto my-12 rounded-3xl shadow-sm">
                      <span className="inline-block bg-purple-500/20 text-purple-300 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border border-purple-500/30">
                        Seasonal Spotlight
                      </span>
                      <h2 className="text-3xl font-black">Crafted with Heritage, Styled for Today</h2>
                      <p className="text-sm text-slate-300 max-w-lg mx-auto">Explore exclusive handloom sarees and designer panjabis delivered directly to your doorstep.</p>
                      <button className="bg-[#D4AF37] hover:bg-[#FCF6BA] text-slate-950 font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer shadow-lg shadow-[#D4AF37]/20">
                        Shop Campaign Now
                      </button>
                    </div>
                  );
                }
                if (sec.name === 'Call To Action') {
                  return (
                    <div key={sec.id} className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-12 text-center space-y-4 max-w-7xl mx-auto my-12 rounded-3xl shadow-sm">
                      <h2 className="text-2xl font-black">Get 10% OFF Your First Order</h2>
                      <p className="text-sm text-emerald-100 max-w-md mx-auto font-medium">Subscribe to My Store VIP club for early access to Eid sales & new collection drops.</p>
                      <div className="flex max-w-md mx-auto gap-2">
                        <input type="email" placeholder="Enter your email address..." className="flex-1 bg-white/10 border border-white/20 text-white placeholder-emerald-200 px-3.5 py-2 rounded-xl text-xs outline-none" />
                        <button className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2 rounded-xl shrink-0 transition cursor-pointer">
                          Subscribe
                        </button>
                      </div>
                    </div>
                  );
                }
              }

              return null;
            })}
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
              {/* Store Benefits Section */}
              <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center shadow-sm">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Cash On Delivery</h4>
                    <p className="text-xs text-slate-500 mt-1">Available everywhere</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">bKash Payment</h4>
                    <p className="text-xs text-slate-500 mt-1">Fast & secure gateway</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Authentic Products</h4>
                    <p className="text-xs text-slate-500 mt-1">100% genuine quality</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-emerald-50 text-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">Fast Shipping</h4>
                    <p className="text-xs text-slate-500 mt-1">Within 48 hours</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Checkout Flow */}
        {checkoutStep === 'checkout' && (
           <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
            <button
              onClick={() => setCheckoutStep('catalog')}
              className="text-sm flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-900 font-bold transition"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Catalog
            </button>
            
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Checkout</h3>
                <p className="text-sm mt-1 text-slate-500">Please provide your delivery details below.</p>
              </div>

              {/* Order Summary Items */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-6 border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Order Summary</h4>
                
                {cart.length > 0 ? (
                  cart.map((item, idx) => {
                    const mappedColor = selectedColors[item.product.id];
                    const displayImg = mappedColor && item.product.colorImages?.[mappedColor] 
                      ? item.product.colorImages[mappedColor] 
                      : (item.product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200');
                    const colorOptions = Object.keys(item.product.colorImages || {});
                    
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 py-3 border-b border-slate-100 last:border-none">
                        <img src={displayImg} alt={item.product.title} className="w-16 h-16 object-cover rounded-xl border border-slate-200 transition-all duration-300" />
                        <div className="flex-1 space-y-1">
                          <h4 className="font-semibold text-sm text-slate-900">{item.product.title}</h4>
                          <div className="text-xs text-slate-500">Qty: {item.quantity} | Variant: {item.variant}</div>
                          
                          {/* Color Variant selector with interactive image mapping */}
                          {colorOptions.length > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-bold text-slate-400">Color Variant:</span>
                              <div className="flex gap-1.5">
                                {colorOptions.map(color => {
                                  const active = selectedColors[item.product.id] === color;
                                  return (
                                    <button
                                      key={color}
                                      type="button"
                                      onClick={() => setSelectedColors(prev => ({ ...prev, [item.product.id]: color }))}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                        active 
                                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' 
                                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      {color}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-black text-[#D4AF37]">৳{(item.product.priceBDT * item.quantity).toLocaleString()}</div>
                      </div>
                    );
                  })
                ) : selectedProduct ? (() => {
                  const mappedColor = selectedColors[selectedProduct.id];
                  const displayImg = mappedColor && selectedProduct.colorImages?.[mappedColor] 
                    ? selectedProduct.colorImages[mappedColor] 
                    : (selectedProduct.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200');
                  const colorOptions = Object.keys(selectedProduct.colorImages || {});
                  
                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3">
                      <img src={displayImg} alt={selectedProduct.title} className="w-16 h-16 object-cover rounded-xl border border-slate-200 transition-all duration-300" />
                      <div className="flex-1 space-y-1">
                        <h4 className="font-semibold text-sm text-slate-900">{selectedProduct.title}</h4>
                        
                        {/* Color Variant selector with interactive image mapping */}
                        {colorOptions.length > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">Color:</span>
                            <div className="flex gap-1.5">
                              {colorOptions.map(color => {
                                const active = selectedColors[selectedProduct.id] === color;
                                return (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColors(prev => ({ ...prev, [selectedProduct.id]: color }))}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                      active 
                                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' 
                                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    {color}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-black text-[#D4AF37]">৳{selectedProduct.priceBDT.toLocaleString()}</div>
                    </div>
                  );
                })() : null}
                
                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                  <span className="font-bold text-slate-600">Total Payable:</span>
                  <span className="text-xl font-black text-[#D4AF37]">৳{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* AI Recommendations Section */}
              {aiRecommendationsEnabled && (selectedProduct || cart.length > 0) && (
                <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Frequently Bought Together</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {displayProducts
                      .filter(p => {
                        const currentId = selectedProduct?.id || (cart.length > 0 ? cart[0].product.id : '');
                        return p.id !== currentId;
                      })
                      .slice(0, 2)
                      .map(p => (
                        <div 
                          key={p.id} 
                          className="bg-white border border-slate-200 rounded-xl p-2 flex flex-col gap-2 group cursor-pointer hover:border-[#D4AF37] transition"
                          onClick={() => {
                            setSelectedProduct(p);
                            setCart([]);
                          }}
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-slate-50">
                            {p.image ? (
                              <img src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                            ) : (
                              <VectorPlaceholder type={(p as any).vectorType || 'tshirt'} />
                            )}
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-[10px] font-bold text-slate-800 line-clamp-1">{p.title}</h5>
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-[#D4AF37]">৳{p.priceBDT.toLocaleString()}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(p);
                                }}
                                className="w-6 h-6 rounded-lg bg-[#D4AF37] text-white flex items-center justify-center hover:bg-slate-900 transition"
                              >
                                <ShoppingCart className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full font-mono rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">City / District / Delivery Rate</label>
                    <select
                      value={custCity}
                      onChange={(e) => {
                        setCustCity(e.target.value);
                      }}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition font-medium"
                    >
                      {activeDeliveryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1.5 font-bold text-sm text-slate-700">Detailed Address</label>
                    <input
                      type="text"
                      required
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition"
                    />
                  </div>
                </div>

                 {/* Payment Options */}
                 <div className="pt-6 border-t border-slate-100">
                   <label className="block mb-3 font-bold text-sm text-slate-900">Select Payment Method</label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {/* Render active mobile banking configs */}
                     {mobileBanking.filter(mb => mb.isEnabled).map(mb => {
                       const isBk = mb.provider === 'bkash';
                       const isNg = mb.provider === 'nagad';
                       const isRo = mb.provider === 'rocket';
                       const active = payMethod === mb.provider;
                       const activeClass = isBk 
                         ? 'border-pink-500 bg-pink-50 text-pink-700' 
                         : isNg 
                         ? 'border-orange-500 bg-orange-50 text-orange-700' 
                         : 'border-purple-500 bg-purple-50 text-purple-700';
                         
                       return (
                         <button
                           key={mb.id}
                           type="button"
                           onClick={() => setPayMethod(mb.provider)}
                           className={`p-4 rounded-xl border text-sm font-bold transition flex items-center justify-between cursor-pointer ${
                             active ? activeClass : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                           }`}
                         >
                           <div className="flex items-center gap-3">
                             <Smartphone className={`w-5 h-5 ${isBk ? 'text-pink-500' : isNg ? 'text-orange-500' : 'text-purple-500'}`} />
                             <span>{isBk ? 'bKash Payment' : isNg ? 'Nagad Payment' : 'Rocket Payment'}</span>
                           </div>
                           {mb.chargePercentage > 0 && (
                             <span className="text-[10px] font-medium opacity-85">+{mb.chargePercentage}%</span>
                           )}
                         </button>
                       );
                     })}

                     {/* Render Bank Transfer if visible bank accounts exist */}
                     {bankAccounts.some(b => b.isVisibleAtCheckout) && (
                       <button
                         type="button"
                         onClick={() => setPayMethod('bank')}
                         className={`p-4 rounded-xl border text-sm font-bold transition flex items-center gap-3 cursor-pointer ${
                           payMethod === 'bank' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                         }`}
                       >
                         <Building2 className={`w-5 h-5 ${payMethod === 'bank' ? 'text-blue-500' : 'text-slate-400'}`} />
                         <span>Bank Transfer</span>
                       </button>
                     )}

                     {/* Cash on Delivery */}
                     <button
                       type="button"
                       onClick={() => setPayMethod('cod')}
                       className={`p-4 rounded-xl border text-sm font-bold transition flex items-center gap-3 cursor-pointer ${
                         payMethod === 'cod' ? 'border-[#D4AF37] bg-emerald-50 text-[#00A16B]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                       }`}
                     >
                       <Building2 className={`w-5 h-5 ${payMethod === 'cod' ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                       <span>Cash on Delivery</span>
                     </button>
                   </div>
                 </div>

                 {['bkash', 'nagad', 'rocket'].includes(payMethod) && (() => {
                   const activeConfig = mobileBanking.find(m => m.provider === payMethod);
                   if (!activeConfig) return null;
                   const isBk = payMethod === 'bkash';
                   const isNg = payMethod === 'nagad';
                   const isRo = payMethod === 'rocket';
                   const brandColor = isBk ? 'pink' : isNg ? 'orange' : 'purple';
                   
                   // Calculate dynamic amount with charge percentage if applicable
                   const dynamicAmount = activeConfig.chargePercentage > 0 
                     ? Math.round(totalAmount * (1 + activeConfig.chargePercentage / 100)) 
                     : totalAmount;

                   return (
                     <div className={`border border-${brandColor}-200 p-5 rounded-2xl bg-${brandColor}-50/30 space-y-3`}>
                       <div className={`text-xs font-bold text-${brandColor}-600 uppercase tracking-wider flex items-center gap-2`}>
                         <Smartphone className="w-4 h-4" /> Send Money Instructions
                       </div>
                       <p className="text-sm text-slate-700">
                         Send exactly <strong className="text-slate-900">৳{dynamicAmount.toLocaleString()}</strong> (including charge fee) to merchant {payMethod.toUpperCase()} {activeConfig.accountType} number: <strong className={`text-${brandColor}-600 font-bold font-mono text-base`}>{activeConfig.number}</strong>.
                       </p>
                       
                       {activeConfig.instructions && (
                         <div className="bg-white/80 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                           {activeConfig.instructions}
                         </div>
                       )}

                       {activeConfig.requireTrxId && (
                         <div className="space-y-1">
                           <label className="block text-xs font-bold text-slate-500 uppercase">Enter {payMethod.toUpperCase()} Transaction ID (TrxID) *</label>
                           <input
                             type="text"
                             required
                             placeholder={`e.g. ${isBk ? 'BK' : isNg ? 'NG' : 'RO'}9X2810L9`}
                             value={custTxId}
                             onChange={(e) => setCustTxId(e.target.value)}
                             className={`w-full border border-${brandColor}-300 rounded-xl px-4 py-3 font-mono text-sm uppercase bg-white focus:outline-none focus:border-${brandColor}-500 focus:ring-2 focus:ring-${brandColor}-200 transition`}
                           />
                         </div>
                       )}
                     </div>
                   );
                 })()}

                 {payMethod === 'bank' && (
                   <div className="border border-blue-200 p-5 rounded-2xl bg-blue-50/30 space-y-3">
                     <div className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                       <Building2 className="w-4 h-4" /> Bank Account Details
                     </div>
                     <p className="text-xs text-slate-700">Please deposit exactly <strong className="text-slate-950">৳{totalAmount.toLocaleString()}</strong> to one of the bank accounts below:</p>
                     <div className="space-y-2">
                       {bankAccounts.filter(b => b.isVisibleAtCheckout).map(b => (
                         <div key={b.id} className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1 shadow-sm">
                           <div className="font-bold text-slate-900">{b.bankName}</div>
                           <div className="text-slate-600">Account Name: <strong className="text-slate-900">{b.accountHolder}</strong></div>
                           <div className="text-slate-600">Account Number: <strong className="font-mono text-blue-600 text-sm">{b.accountNumber}</strong></div>
                           {b.routingNumber && <div className="text-slate-500 text-[11px]">Routing Number: {b.routingNumber}</div>}
                         </div>
                       ))}
                     </div>
                     <div className="space-y-1">
                       <label className="block text-xs font-bold text-slate-500 uppercase">Enter Bank Reference or Sender Name *</label>
                       <input
                         type="text"
                         required
                         placeholder="Enter Deposit Reference..."
                         value={custTxId}
                         onChange={(e) => setCustTxId(e.target.value)}
                         className="w-full border border-blue-300 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                       />
                     </div>
                   </div>
                 )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 bg-[#D4AF37] text-slate-950 font-black rounded-xl text-base hover:bg-[#FCF6BA] transition cursor-pointer shadow-lg hover:shadow-xl"
                  >
                    Confirm Order • ৳{totalAmount.toLocaleString()}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success View */}
        {checkoutStep === 'success' && (
          <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
              <Check className="w-12 h-12 text-[#D4AF37]" />
            </div>
            
            <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Order Placed Successfully!</h3>
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 mb-8">
              <p className="text-sm text-slate-600">
                Thank you <strong className="text-slate-900">{custName}</strong>. Your order has been placed.
              </p>
              <div className="flex justify-center items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">ORDER NUMBER:</span>
                <span className="bg-[#D4AF37] text-white px-2 py-1 rounded font-bold">{confirmedOrderNum}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCheckoutStep('catalog');
                setSelectedProduct(null);
              }}
              className="px-8 py-3 bg-[#D4AF37] text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer shadow-lg hover:bg-[#FCF6BA]"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </main>

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#D4AF37]" />
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
                    <img src={item.product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} alt={item.product.title} className="w-20 h-20 object-cover rounded-xl border border-slate-200" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.product.title}</h4>
                        <div className="text-sm font-black text-[#D4AF37] mt-1">৳{item.product.priceBDT.toLocaleString()}</div>
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
                  <span className="text-xl font-black text-[#D4AF37]">৳{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutStep('checkout');
                  }}
                  className="w-full py-4 bg-[#D4AF37] text-slate-950 font-black rounded-xl text-base hover:bg-[#FCF6BA] transition cursor-pointer shadow-lg"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-4">
            {(themeConfig.logoImageUrl || merchant?.logoUrl) ? (
              <img 
                src={themeConfig.logoImageUrl || merchant?.logoUrl} 
                alt="Logo" 
                style={{ height: themeConfig.logoHeight ? `${themeConfig.logoHeight}px` : '32px' }} 
                className="brightness-0 invert max-w-[150px] object-contain" 
              />
            ) : (
              <h4 className="text-white text-xl font-black">{merchant?.storeName || 'Store'}</h4>
            )}
            <p className="text-xs leading-relaxed max-w-sm">
              {footerAboutText}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-xs font-bold text-white">Secure 256-bit SSL Checkout</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold">{footerLinksTitle}</h4>
            <ul className="space-y-2 text-xs">
              {footerLinks.map((link: string, idx: number) => (
                <li key={idx}><a href="#" className="hover:text-[#D4AF37] transition">{link}</a></li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-white font-bold">Contact</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> {contactPhone}</li>
              <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {dhakaAddress}</li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
          © {new Date().getFullYear()} {merchant?.storeName || 'Store'}. All rights reserved.
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation (App-style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-6 py-2.5 flex items-center justify-around pb-safe">
        {/* Home Item */}
        <button 
          onClick={() => {
            setCheckoutStep('catalog');
            setIsOrdersModalOpen(false);
            setIsProfileModalOpen(false);
            setIsCartOpen(false);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            checkoutStep === 'catalog' && !isOrdersModalOpen && !isProfileModalOpen && !isCartOpen ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="mobile-nav-home"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-extrabold">হোম</span>
        </button>

        {/* Orders Item */}
        <button 
          onClick={() => {
            setIsOrdersModalOpen(true);
            setIsProfileModalOpen(false);
            setIsCartOpen(false);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            isOrdersModalOpen ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="mobile-nav-orders"
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] font-extrabold">অর্ডার</span>
        </button>

        {/* Profile Item */}
        <button 
          onClick={() => {
            setIsProfileModalOpen(true);
            setIsOrdersModalOpen(false);
            setIsCartOpen(false);
          }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
            isProfileModalOpen ? 'text-[#D4AF37]' : 'text-slate-500 hover:text-slate-800'
          }`}
          id="mobile-nav-profile"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-extrabold">প্রোফাইল</span>
        </button>
      </div>

      {/* Orders Tracking Modal */}
      <AnimatePresence>
        {isOrdersModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsOrdersModalOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-slate-50 shadow-2xl flex flex-col z-50"
            >
              <div className="flex items-center justify-between p-6 bg-white border-b border-slate-100">
                <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-[#D4AF37]" />
                  আমার অর্ডারসমূহ
                </h3>
                <button onClick={() => setIsOrdersModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {orders.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 space-y-3">
                    <History className="w-16 h-16 mx-auto opacity-20" />
                    <p className="font-semibold text-slate-500">কোন অর্ডার পাওয়া যায়নি</p>
                    <p className="text-xs text-slate-400">নতুন পণ্য কিনে আপনার অর্ডার লিস্ট সমৃদ্ধ করুন।</p>
                  </div>
                ) : (
                  orders.map((order, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">
                            {order.orderNumber}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{order.createdAt}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 block">৳{order.totalBDT.toLocaleString()}</span>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-block mt-1 bg-amber-50 text-amber-700 border border-amber-200">
                            {order.paymentStatus === 'Pending Verification' ? 'পেমেন্ট যাচাই করা হচ্ছে' : order.paymentStatus === 'Unpaid' ? 'বাকি' : 'পরিশোধিত'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex gap-3 items-center">
                            {item.image && (
                              <img src={item.image} alt={item.productName} className="w-10 h-10 object-cover rounded-lg border border-slate-100" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-slate-800 truncate">{item.productName}</h5>
                              <p className="text-[10px] text-slate-400">পরিমাণ: {item.quantity} | মূল্য: ৳{item.unitPriceBDT.toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                        <span>ডেলিভারি স্ট্যাটাস:</span>
                        <span className="font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          {order.fulfillmentStatus === 'Unfulfilled' ? 'প্রক্রিয়াধীন রয়েছে' : 'ডেলিভারি হয়েছে'}
                        </span>
                      </div>

                      {order.trackingCode && (
                        <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-[11px] border border-slate-100">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-semibold">কুরিয়ার ট্র্যাকিং কোড</span>
                            <span className="font-mono font-bold text-slate-700">{order.trackingCode}</span>
                          </div>
                          <span className="text-[10px] bg-[#D4AF37]/10 text-[#D4AF37] font-bold px-2 py-0.5 rounded">
                            {order.courierName || 'Steadfast'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsProfileModalOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col z-50"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                <h3 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#D4AF37]" />
                  আমার প্রোফাইল
                </h3>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-full transition cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const updated = {
                    firstName: profileFirstName,
                    lastName: profileLastName,
                    phone: profilePhone,
                    email: profileEmail,
                    address: profileAddress
                  };
                  localStorage.setItem('user', JSON.stringify(updated));
                  setLoggedInUser(updated);

                  // Update form inputs instantly
                  setCustName(`${profileFirstName} ${profileLastName}`.trim());
                  setCustPhone(profilePhone);
                  setCustAddress(profileAddress);

                  setIsProfileModalOpen(false);
                }}
                className="flex-1 flex flex-col justify-between"
              >
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div className="bg-[#D4AF37]/5 border border-[#D4AF37]/10 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-black text-lg">
                      {profileFirstName ? profileFirstName[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{profileFirstName ? `${profileFirstName} ${profileLastName}` : 'নতুন কাস্টমার'}</h4>
                      <p className="text-xs text-slate-500">{profilePhone || 'ফোন নম্বর যুক্ত করুন'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">ফার্স্ট নেম (First Name)</label>
                        <input 
                          type="text" 
                          value={profileFirstName}
                          onChange={(e) => setProfileFirstName(e.target.value)}
                          placeholder="উদা: জাহিদ"
                          required
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">লাস্ট নেম (Last Name)</label>
                        <input 
                          type="text" 
                          value={profileLastName}
                          onChange={(e) => setProfileLastName(e.target.value)}
                          placeholder="উদা: হাসান"
                          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">মোবাইল নম্বর (Phone Number)</label>
                      <input 
                        type="tel" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="উদা: 017XXXXXXXX"
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">ইমেইল এড্রেস (Email Address)</label>
                      <input 
                        type="email" 
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        placeholder="উদা: customer@example.com"
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">ঠিকানা (Delivery Address)</label>
                      <textarea 
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        placeholder="উদা: রোড-১২, হাউজ-৪৫, ধানমন্ডি, ঢাকা"
                        rows={3}
                        required
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-[#D4AF37] text-slate-950 font-black rounded-xl text-base hover:bg-[#FCF6BA] transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    <span>প্রোফাইল সংরক্ষণ করুন</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
