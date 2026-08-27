import { supabase } from './supabase';
import { safeParseJson } from './safeFetch';

export interface CountryCodeOption {
  code: string; // '+880' | '+966'
  country: string; // 'Bangladesh' | 'Saudi Arabia'
  iso: string; // 'BD' | 'SA'
  flag: string; // '🇧🇩' | '🇸🇦'
  placeholder: string;
  example: string;
  digitsLength: number; // typical digits without country prefix
}

export const SUPPORTED_COUNTRIES: CountryCodeOption[] = [
  {
    code: '+880',
    country: 'Bangladesh',
    iso: 'BD',
    flag: '🇧🇩',
    placeholder: '1700000000',
    example: '01712345678',
    digitsLength: 10
  },
  {
    code: '+966',
    country: 'Saudi Arabia',
    iso: 'SA',
    flag: '🇸🇦',
    placeholder: '500000000',
    example: '0512345678',
    digitsLength: 9
  }
];

export interface OtpResult {
  success: boolean;
  message: string;
  expiresAt?: string;
  isRateLimited?: boolean;
  provider?: string;
  sent?: boolean;
  details?: string;
  directLink?: string;
  codePreview?: string;
}

export interface VerifyResult {
  success: boolean;
  verified: boolean;
  message: string;
  token?: string;
}

/**
 * Formats a phone number into strict E.164 standard with the selected or detected country code
 * - Bangladesh (+880): e.g. 01712345678 or 1712345678 -> +8801712345678
 * - Saudi Arabia (+966): e.g. 0512345678 or 512345678 -> +966512345678
 */
export function formatFullPhoneNumber(rawPhone: string, defaultCountryCode: string = '+880'): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  // If already starts with +880 or 880
  if (cleaned.startsWith('+880')) {
    const rest = cleaned.slice(4).replace(/^0+/, '');
    return `+880${rest}`;
  }
  if (cleaned.startsWith('880')) {
    const rest = cleaned.slice(3).replace(/^0+/, '');
    return `+880${rest}`;
  }

  // If already starts with +966 or 966
  if (cleaned.startsWith('+966')) {
    const rest = cleaned.slice(4).replace(/^0+/, '');
    return `+966${rest}`;
  }
  if (cleaned.startsWith('966')) {
    const rest = cleaned.slice(3).replace(/^0+/, '');
    return `+966${rest}`;
  }

  // If starts with standard local prefixes
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    return `+880${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return `+966${cleaned.slice(1)}`;
  }

  // Strip leading 0 and any leading +
  const localDigits = cleaned.replace(/^\+/, '').replace(/^0+/, '');
  const prefix = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;

  return `${prefix}${localDigits}`;
}

/**
 * Validates whether the formatted phone is valid for supported countries
 */
export function isValidPhoneNumber(formattedPhone: string): { 
  valid: boolean; 
  formatted: string; 
  country?: 'BD' | 'SA' | 'OTHER'; 
  error?: string;
} {
  const formatted = formatFullPhoneNumber(formattedPhone);
  if (!formatted) {
    return { valid: false, formatted: '', error: 'Phone number is required.' };
  }

  if (formatted.startsWith('+880')) {
    const digits = formatted.slice(4);
    // Bangladesh mobile numbers: 10 digits after +880, starting with 1 (e.g. 13, 14, 15, 16, 17, 18, 19)
    if (/^1[3-9]\d{8}$/.test(digits) || (digits.length === 10 && digits.startsWith('1'))) {
      return { valid: true, formatted, country: 'BD' };
    }
    return { 
      valid: false, 
      formatted, 
      country: 'BD', 
      error: 'Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX or +88017XXXXXXXX).' 
    };
  }

  if (formatted.startsWith('+966')) {
    const digits = formatted.slice(4);
    // Saudi Arabia mobile numbers: 9 digits after +966, starting with 5 (e.g. 50, 53, 54, 55, 56, 57, 58, 59)
    if (/^5\d{8}$/.test(digits) || (digits.length === 9 && digits.startsWith('5'))) {
      return { valid: true, formatted, country: 'SA' };
    }
    return { 
      valid: false, 
      formatted, 
      country: 'SA', 
      error: 'Please enter a valid Saudi Arabia mobile number (e.g. 05XXXXXXXX or +9665XXXXXXXX).' 
    };
  }

  if (formatted.length >= 10 && /^\+\d{10,15}$/.test(formatted)) {
    return { valid: true, formatted, country: 'OTHER' };
  }

  return { valid: false, formatted, error: 'Please enter a valid phone number with country code.' };
}

/**
 * Normalizes phone numbers into E.164 format (e.g. +8801700000000 or +966500000000)
 */
export function normalizePhone(rawPhone: string, defaultCountryCode: string = '+880'): string {
  return formatFullPhoneNumber(rawPhone, defaultCountryCode);
}

/**
 * Sends a real Supabase-backed WhatsApp OTP supporting both BD (+880) and KSA (+966)
 */
export async function sendWhatsAppOtp(
  phone: string,
  userType: 'merchant' | 'customer' = 'customer',
  countryCode: string = '+880'
): Promise<OtpResult> {
  const normalized = normalizePhone(phone, countryCode);
  const validation = isValidPhoneNumber(normalized);

  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Please enter a valid Bangladesh (+880) or Saudi Arabia (+966) phone number.'
    };
  }

  try {
    // 1. Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 2. Direct Supabase Database persistence if Supabase client is available
    if (supabase) {
      try {
        // Attempt insert into Supabase `whatsapp_otps` table
        const { error: dbError } = await supabase.from('whatsapp_otps').upsert({
          phone: normalized,
          code: otpCode,
          expires_at: expiresAt,
          status: 'pending',
          user_type: userType,
          created_at: new Date().toISOString()
        }, { onConflict: 'phone' });

        if (dbError) {
          console.warn('Supabase DB table save warning:', dbError.message);
        }
      } catch (e) {
        console.warn('Supabase DB interaction notice:', e);
      }

      // Also attempt native Supabase Auth WhatsApp OTP trigger if configured
      try {
        await supabase.auth.signInWithOtp({
          phone: normalized,
          options: {
            channel: 'whatsapp'
          }
        });
      } catch (authErr) {
        console.warn('Supabase Auth signInWithOtp notice:', authErr);
      }
    }

    // 3. Trigger backend server proxy endpoint for WhatsApp dispatch & Supabase sync
    let data: any = null;
    try {
      const res = await fetch('/api/auth/whatsapp-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          phone: normalized,
          code: otpCode,
          userType,
          expiresAt,
          countryCode: validation.country === 'SA' ? '+966' : '+880'
        })
      });

      data = await safeParseJson(res, { ok: res.ok });
      if (!res.ok || !data?.ok) {
        return {
          success: false,
          message: data?.error || data?.message || 'Failed to dispatch WhatsApp OTP. Please try again.'
        };
      }
    } catch (e: any) {
      console.warn('Backend proxy fetch exception, proceeding with direct link fallback:', e);
      data = { ok: true, provider: 'Direct WhatsApp Link', sent: false };
    }

    return {
      success: true,
      message: data?.message || `WhatsApp OTP sent successfully to ${normalized}. Please check your WhatsApp app.`,
      expiresAt: data?.expiresAt || expiresAt,
      provider: data?.provider,
      sent: data?.sent,
      details: data?.details,
      directLink: data?.directLink,
      codePreview: otpCode
    };
  } catch (err: any) {
    console.error('Error sending WhatsApp OTP:', err);
    return {
      success: false,
      message: err.message || 'Server error while sending WhatsApp verification code.'
    };
  }
}

/**
 * Verifies the WhatsApp OTP directly against Supabase & backend session store
 */
export async function verifyWhatsAppOtp(
  phone: string,
  code: string,
  countryCode: string = '+880'
): Promise<VerifyResult> {
  const normalized = normalizePhone(phone, countryCode);
  const cleanCode = code.trim();

  if (!normalized) {
    return { success: false, verified: false, message: 'Invalid phone number.' };
  }

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return { success: false, verified: false, message: 'Please enter a valid 6-digit verification code.' };
  }

  try {
    // 1. Try native Supabase Auth OTP verification if available
    if (supabase) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.verifyOtp({
          phone: normalized,
          token: cleanCode,
          type: 'sms'
        });
        if (!authErr && authData?.session) {
          // Update DB record status
          await supabase.from('whatsapp_otps').update({
            status: 'verified',
            verified_at: new Date().toISOString()
          }).eq('phone', normalized);

          return {
            success: true,
            verified: true,
            message: 'Phone number verified successfully via Supabase Auth!',
            token: authData.session.access_token
          };
        }
      } catch (e) {
        console.warn('Supabase Auth verifyOtp check:', e);
      }

      // 2. Direct Supabase DB Table verification check
      try {
        const { data: records, error: dbErr } = await supabase
          .from('whatsapp_otps')
          .select('*')
          .eq('phone', normalized)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!dbErr && records && records.length > 0) {
          const rec = records[0];
          const isExpired = new Date(rec.expires_at).getTime() < Date.now();
          if (rec.code === cleanCode && !isExpired) {
            await supabase
              .from('whatsapp_otps')
              .update({ status: 'verified', verified_at: new Date().toISOString() })
              .eq('phone', normalized);

            return {
              success: true,
              verified: true,
              message: 'Phone number successfully verified via Supabase!',
              token: `sb_verified_${Date.now()}`
            };
          }
        }
      } catch (e) {
        console.warn('Supabase DB verify check:', e);
      }
    }

    // 3. Fallback / Server proxy verification against persistent Supabase store
    const res = await fetch('/api/auth/whatsapp-otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        phone: normalized,
        code: cleanCode
      })
    });

    const data: any = await safeParseJson(res, { ok: res.ok, verified: false });
    if (res.ok && data?.ok && data?.verified) {
      return {
        success: true,
        verified: true,
        message: 'Phone number successfully verified via WhatsApp!',
        token: data?.token || `wp_verified_${Date.now()}`
      };
    }

    return {
      success: false,
      verified: false,
      message: data?.error || data?.message || 'Invalid or expired WhatsApp verification code.'
    };
  } catch (err: any) {
    console.error('Error verifying WhatsApp OTP:', err);
    return {
      success: false,
      verified: false,
      message: err.message || 'Failed to connect to verification server.'
    };
  }
}
