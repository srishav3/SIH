import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import { 
  ArrowRight, 
  Mail, 
  Phone as PhoneIcon, 
  User as UserIcon, 
  Shield, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkEmailExists, saveUserProfile, checkUserIdExists } from '../lib/supabase';
import { generateUniqueUserId } from '../lib/idGenerator';

export default function SignUpPage() {
  const { setCurrentUser } = useAuth();
  const navigate = useNavigate();

  const { isLoaded: isClerkLoaded, signUp, setActive } = useSignUp();

  // Form inputs
  const [role, setRole] = useState('traveller'); // 'traveller' | 'officer'
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Steps: 'details' -> 'email_otp' -> 'phone_otp' -> 'complete'
  const [step, setStep] = useState('details');

  // OTP inputs
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  
  // Feedback states
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Result state
  const [allocatedId, setAllocatedId] = useState('');

  // Helper to generate a valid Clerk username (alphanumeric + underscore, 4-20 chars)
  const generateClerkUsername = (first, last) => {
    const raw = `${first || ''}${last || ''}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean = raw.length >= 3 ? raw : 'user';
    return `${clean.slice(0, 12)}_${Math.floor(1000 + Math.random() * 9000)}`;
  };

  // Validate initial form fields
  const validateForm = async () => {
    const errs = {};

    if (!firstName.trim()) {
      errs.firstName = 'First name is required';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^\d{7,15}$/.test(phone.trim().replace(/[-\s]/g, ''))) {
      errs.phone = 'Please enter a valid phone number (digits only)';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
    }

    if (!errs.email) {
      const alreadyExists = await checkEmailExists(email.trim().toLowerCase());
      if (alreadyExists) {
        errs.email = 'This email is already registered in the database. Please sign in instead.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 1: Submit Form & Trigger Real Clerk Email Verification
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setErrors({});
    setApiError('');

    const isValid = await validateForm();
    if (!isValid) return;

    setIsSubmitting(true);
    const cleanPhoneDigits = phone.trim().replace(/\D/g, '');
    const formattedPhone = `${countryCode} ${cleanPhoneDigits}`;

    try {
      if (!isClerkLoaded || !signUp) {
        setApiError('Clerk authentication service is loading. Please wait a moment and try again.');
        setIsSubmitting(false);
        return;
      }

      // Pre-generate candidate User ID
      const candidateId = await generateUniqueUserId(role, checkUserIdExists);
      setAllocatedId(candidateId);

      const generatedUsername = generateClerkUsername(firstName, lastName);

      const clerkPayload = {
        emailAddress: email.trim().toLowerCase(),
        password: password,
        firstName: firstName.trim(),
        lastName: (lastName || '').trim(),
        username: generatedUsername,
        unsafeMetadata: {
          userId: candidateId,
          role: role,
          phone: formattedPhone,
          firstName: firstName.trim(),
          lastName: (lastName || '').trim()
        }
      };

      // Create sign-up in Clerk with username & metadata
      try {
        await signUp.create({
          ...clerkPayload,
          ...(cleanPhoneDigits ? { phoneNumber: `${countryCode}${cleanPhoneDigits}` } : {})
        });
      } catch (createErr) {
        console.warn('Initial signUp.create notice:', createErr);
        // If phone number is not configured in Clerk dashboard, retry without phone
        if (
          createErr.errors?.[0]?.code?.includes('phone') || 
          createErr.message?.toLowerCase().includes('phone') ||
          createErr.errors?.[0]?.message?.toLowerCase().includes('phone')
        ) {
          try {
            await signUp.create(clerkPayload);
          } catch (createWithoutPhoneErr) {
            // If username is rejected by instance, retry without username
            if (createWithoutPhoneErr.errors?.[0]?.code?.includes('username')) {
              const { username: _unused, ...payloadWithoutUsername } = clerkPayload;
              await signUp.create(payloadWithoutUsername);
            } else {
              throw createWithoutPhoneErr;
            }
          }
        } else if (createErr.errors?.[0]?.code?.includes('username')) {
          // If username is not allowed by this instance, retry without username
          const { username: _unused, ...payloadWithoutUsername } = clerkPayload;
          await signUp.create(payloadWithoutUsername);
        } else {
          throw createErr;
        }
      }

      // Dispatch real email OTP from Clerk
      console.log('Dispatching real Clerk OTP email to:', email.trim().toLowerCase());
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep('email_otp');
    } catch (err) {
      console.error('Clerk Signup Error:', err);
      if (err.errors?.[0]?.code === 'form_identifier_exists' || err.errors?.[0]?.message?.toLowerCase().includes('taken')) {
        setApiError('This email is already registered in Clerk. If you deleted your database to test again, please also delete this user from your Clerk Dashboard (Users tab) or use an alias like yourname+1@gmail.com.');
      } else {
        const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || 'Registration failed. Please check your inputs.';
        setApiError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify Email Code & Finalize Clerk & Supabase Creation
  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setApiError('');

    const cleanOtp = emailOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setApiError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isClerkLoaded || !signUp) {
        setApiError('Clerk is initializing. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Verify code with Clerk
      let completeSignUp = await signUp.attemptEmailAddressVerification({
        code: cleanOtp
      });

      console.log('Clerk verification status:', completeSignUp.status);

      // If Clerk still requires a username, supply one automatically
      if (completeSignUp.status !== 'complete' && completeSignUp.missingFields?.includes('username')) {
        try {
          const freshUsername = generateClerkUsername(firstName, lastName);
          completeSignUp = await signUp.update({
            username: freshUsername
          });
          console.log('Clerk username supplied, new status:', completeSignUp.status);
        } catch (unameErr) {
          console.warn('Username update notice:', unameErr);
        }
      }

      if (completeSignUp.status === 'complete') {
        // Save to Supabase and activate session
        await finalizeAccount(completeSignUp.createdUserId, completeSignUp.createdSessionId);
      } else {
        // Handle phone verification if unverified
        const needsPhone = completeSignUp.unverifiedFields?.includes('phone_number');
        if (needsPhone) {
          try {
            await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
            setStep('phone_otp');
            setIsSubmitting(false);
            return;
          } catch (phoneErr) {
            console.warn('Phone verification bypassed:', phoneErr);
          }
        }

        if (completeSignUp.missingFields && completeSignUp.missingFields.length > 0) {
          setApiError(`Clerk required field missing: ${completeSignUp.missingFields.join(', ')}`);
          setIsSubmitting(false);
          return;
        }

        await finalizeAccount(completeSignUp.createdUserId, completeSignUp.createdSessionId);
      }
    } catch (err) {
      console.error('Email Verification Error:', err);
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 
        (err.message?.includes('fetch') ? 'Network connection issue with Clerk authentication. Please try again in a few seconds.' : err.message) || 
        'Invalid or expired verification code. Please check your email and try again.';
      setApiError(message);
      setIsSubmitting(false);
    }
  };

  // Step 3: Verify Phone SMS Code (if prepared)
  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!phoneOtp.trim()) {
      setApiError('Please enter the SMS verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isClerkLoaded && signUp) {
        const completeSignUp = await signUp.attemptPhoneNumberVerification({
          code: phoneOtp.trim()
        });

        await finalizeAccount(completeSignUp.createdUserId, completeSignUp.createdSessionId);
      } else {
        await finalizeAccount(null, null);
      }
    } catch (err) {
      console.error('Phone Verification Error:', err);
      const message = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid SMS verification code. Please try again.';
      setApiError(message);
      setIsSubmitting(false);
    }
  };

  // Finalize: Store in Supabase, activate Clerk session, sync context, and display User ID Copy Message Box
  const finalizeAccount = async (clerkUserId = null, sessionId = null) => {
    try {
      const finalUserId = allocatedId || (await generateUniqueUserId(role, checkUserIdExists));

      const profileData = {
        user_id: finalUserId,
        first_name: firstName.trim(),
        last_name: (lastName || '').trim(),
        email: email.trim().toLowerCase(),
        phone: `${countryCode} ${phone.trim()}`,
        role: role,
        password: password,
        clerk_id: clerkUserId,
        is_verified: true
      };

      // 1. Save directly into Supabase profiles database
      const result = await saveUserProfile(profileData);
      if (result.error) {
        console.warn('Supabase save warning:', result.error);
      }

      // 2. Activate Clerk session
      if (sessionId && setActive) {
        try {
          await setActive({ session: sessionId });
        } catch (actErr) {
          console.warn('Session activation notice:', actErr);
        }
      }

      // 3. Set current session in Context (sanitized)
      const rawUser = result.data || profileData;
      const { password_hash: _unusedHash, password: _unusedPwd, ...safeSavedUser } = rawUser;
      setCurrentUser(safeSavedUser);
      setAllocatedId(finalUserId);
      
      // 4. Trigger celebration & present the mandatory User ID Copy Modal
      try {
        if (window.confetti) {
          window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      } catch {
        // Ignore
      }
      
      setStep('complete');
      setIsSubmitting(false);
    } catch (err) {
      console.error('Finalize account error:', err);
      setApiError('Account verified, but encountered an issue loading your profile. Please sign in with your credentials.');
      setIsSubmitting(false);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (!isClerkLoaded || !signUp) {
      setResendStatus('Clerk is initializing.');
      return;
    }
    try {
      setResendLoading(true);
      setResendStatus('Sending code to your email...');
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendStatus('New code sent to your inbox!');
      setTimeout(() => setResendStatus(''), 5000);
    } catch (err) {
      console.error('Resend error:', err);
      const msg = err.errors?.[0]?.message || 'Failed to resend code. Please wait a minute before retrying.';
      setResendStatus(msg);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div className="minimal-card" style={{ width: '100%', maxWidth: '460px', padding: '36px 32px' }}>
        
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className={`step-item ${step === 'details' ? 'active' : 'completed'}`}>
            <span className="step-dot">1</span>
            <span>Details</span>
          </div>
          <span style={{ color: 'var(--border)', fontSize: '0.8rem' }}>—</span>
          <div className={`step-item ${step === 'email_otp' || step === 'phone_otp' ? 'active' : step === 'complete' ? 'completed' : ''}`}>
            <span className="step-dot">2</span>
            <span>Verify</span>
          </div>
          <span style={{ color: 'var(--border)', fontSize: '0.8rem' }}>—</span>
          <div className={`step-item ${step === 'complete' ? 'active' : ''}`}>
            <span className="step-dot">3</span>
            <span>Complete</span>
          </div>
        </div>

        {/* API Error Box */}
        {apiError && (
          <div className="alert-box alert-danger" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{apiError}</div>
          </div>
        )}

        {/* STEP 1: Registration Form */}
        {step === 'details' && (
          <form onSubmit={handleInitiateSignup}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: '700', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                Create Account
              </h1>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Select your role and enter your details
              </p>
            </div>

            {/* Role Switcher */}
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Account Role</label>
              <div className="role-switch">
                <button
                  type="button"
                  className={`role-switch-btn ${role === 'traveller' ? 'active' : ''}`}
                  onClick={() => setRole('traveller')}>
                  <UserIcon size={15} />
                  <span>Traveller</span>
                </button>
                <button
                  type="button"
                  className={`role-switch-btn ${role === 'officer' ? 'active' : ''}`}
                  onClick={() => setRole('officer')}>
                  <Shield size={15} />
                  <span>Officer</span>
                </button>
              </div>
            </div>

            {/* Names */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label className="input-label">First Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`input-field ${errors.firstName ? 'input-field-error' : ''}`}
                />
                {errors.firstName && <div className="field-error-text">{errors.firstName}</div>}
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Morgan"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Email Address *</label>
              <input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`input-field ${errors.email ? 'input-field-error' : ''}`}
              />
              {errors.email && <div className="field-error-text">{errors.email}</div>}
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Phone Number *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="input-field"
                  style={{ width: '92px', padding: '10px 8px' }}>
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+65">+65 (SG)</option>
                  <option value="+61">+61 (AU)</option>
                </select>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`input-field ${errors.phone ? 'input-field-error' : ''}`}
                  style={{ flex: 1 }}
                />
              </div>
              {errors.phone && <div className="field-error-text">{errors.phone}</div>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '14px' }}>
              <label className="input-label">Password *</label>
              <input
                type="password"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`input-field ${errors.password ? 'input-field-error' : ''}`}
              />
              {errors.password && <div className="field-error-text">{errors.password}</div>}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '24px' }}>
              <label className="input-label">Confirm Password *</label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-field ${errors.confirmPassword ? 'input-field-error' : ''}`}
              />
              {errors.confirmPassword && <div className="field-error-text">{errors.confirmPassword}</div>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Sending verification code...</span>
                </>
              ) : (
                <>
                  <span>Continue to Verification</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Already registered?{' '}
              <Link to="/login" style={{ color: 'var(--text)', textDecoration: 'underline', fontWeight: '500' }}>
                Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: Email OTP Verification */}
        {step === 'email_otp' && (
          <form onSubmit={handleVerifyEmail}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                color: 'var(--text)'
              }}>
                <Mail size={22} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                Check Your Email
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                We sent a 6-digit verification code to <br />
                <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </p>
            </div>

            {resendStatus && (
              <div className="alert-box alert-info" style={{ marginBottom: '16px', fontSize: '0.78rem' }}>
                {resendStatus}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={emailOtp}
                maxLength={8}
                onChange={(e) => setEmailOtp(e.target.value)}
                autoFocus
                className="input-field"
                style={{
                  textAlign: 'center',
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                  padding: '12px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !emailOtp.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', marginBottom: '12px' }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying & creating user...</span>
                </>
              ) : (
                <span>Verify Email & Complete</span>
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="btn-subtle">
                ← Change details
              </button>
              <button
                type="button"
                onClick={handleResendEmailOtp}
                disabled={resendLoading}
                className="btn-subtle"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <RefreshCw size={12} className={resendLoading ? 'animate-spin' : ''} />
                <span>{resendLoading ? 'Sending...' : 'Resend code'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Phone OTP Verification (if required) */}
        {step === 'phone_otp' && (
          <form onSubmit={handleVerifyPhone}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                color: 'var(--text)'
              }}>
                <PhoneIcon size={22} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
                Verify Phone Number
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                We sent a verification SMS to <br />
                <strong style={{ color: 'var(--text)' }}>{countryCode} {phone}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">SMS Verification Code</label>
              <input
                type="text"
                placeholder="Enter SMS code"
                value={phoneOtp}
                maxLength={8}
                onChange={(e) => setPhoneOtp(e.target.value)}
                autoFocus
                className="input-field"
                style={{
                  textAlign: 'center',
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.2em',
                  padding: '12px'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phoneOtp.trim()}
              className="btn-primary"
              style={{ width: '100%', padding: '11px' }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying SMS...</span>
                </>
              ) : (
                <span>Verify Phone & Complete</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 4: SUCCESS - Dedicated User ID Safety Message Box */}
        {step === 'complete' && (
          <div>
            {/* Celebration Icon Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px'
              }}>
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px 0' }}>
                Account Successfully Created!
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Welcome, <strong>{firstName} {lastName}</strong> ({role.toUpperCase()})
              </p>
            </div>

            {/* MANDATORY WARNING / NOTICE BOX */}
            <div style={{
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 18px',
              marginBottom: '22px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <KeyRound size={22} style={{ color: '#eab308', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>
                  Copy & Store This User ID Safely
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                  Please <strong style={{ color: 'var(--text)' }}>copy this User ID somewhere</strong>. You will need it in the future for logging into your account.
                </div>
              </div>
            </div>

            {/* USER ID DISPLAY CARD WITH 1-CLICK COPY */}
            <div style={{
              background: 'var(--surface-subtle)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              textAlign: 'center',
              marginBottom: '20px',
              position: 'relative'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '6px' }}>
                YOUR OFFICIAL USER ID
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.75rem',
                fontWeight: '800',
                letterSpacing: '0.1em',
                color: 'var(--text)',
                marginBottom: '14px'
              }}>
                {allocatedId || 'TXXXXX1234'}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (allocatedId) {
                    navigator.clipboard.writeText(allocatedId);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2500);
                  }
                }}
                className={copiedId ? 'btn-primary' : 'btn-secondary'}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontWeight: '600',
                  fontSize: '0.86rem',
                  gap: '8px'
                }}>
                {copiedId ? (
                  <>
                    <Check size={16} />
                    <span>User ID Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy User ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Registered Metadata Overview */}
            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Registered Email:</span>
                <span style={{ color: 'var(--text)', fontWeight: '500' }}>{email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Assigned Role:</span>
                <span className={`badge ${role === 'officer' ? 'badge-officer' : 'badge-traveller'}`}>
                  {role}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status:</span>
                <span style={{ color: 'var(--success)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} /> Active & Verified
                </span>
              </div>
            </div>

            {/* Proceed to Dashboard Button */}
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('authentiq_just_signed_up', 'true');
                navigate('/', { replace: true, state: { fromSignUp: true } });
              }}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.95rem',
                fontWeight: '700',
                gap: '8px'
              }}>
              <span>Proceed to {role === 'officer' ? 'Officer Dashboard' : 'Traveller Dashboard'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
