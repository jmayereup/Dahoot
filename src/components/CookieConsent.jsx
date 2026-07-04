import { Cookie, Settings, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const [consent, setConsent] = useState({
    essential: true,
    analytics: true,
    ads: true,
  });

  const containerRef = useRef(null);

  useEffect(() => {
    const consentRegistered = localStorage.getItem('dahoot_cookie_consent');
    if (!consentRegistered) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Escape key and focus trap
  useEffect(() => {
    if (!showBanner) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDeclineAll();
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBanner, consent]);

  const handleAcceptAll = () => {
    const preference = {
      essential: true,
      analytics: true,
      ads: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('dahoot_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  const handleDeclineAll = () => {
    const preference = {
      essential: true,
      analytics: false,
      ads: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('dahoot_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  const handleSavePreferences = () => {
    const preference = { ...consent, timestamp: new Date().toISOString() };
    localStorage.setItem('dahoot_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50 p-6 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-slate-800 flex flex-col gap-4 select-text"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
                <Cookie className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold tracking-tight">
                Cookie Consent
              </h4>
            </div>
            <button
              type="button"
              onClick={handleDeclineAll}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              title="Decline non-essential"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!showPreferences ? (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                We use cookies to personalize your quiz experience, remember
                your preferences, analyze platform usage, and serve educational
                ads. By clicking "Accept All", you consent to our use of cookies.
                Read our{' '}
                <a
                  href="https://www.teacherjake.com/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-500 font-bold hover:underline"
                >
                  Privacy Policy
                </a>{' '}
                to learn more.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="py-2 px-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="p-2 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-xl cursor-pointer transition-colors"
                  title="Customize preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 leading-relaxed">
                Customize your cookie settings. Essential cookies cannot be
                disabled.
              </p>

              <div className="flex flex-col gap-2.5 my-1.5">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Essential Cookies
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Required for basic functionality.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-500 px-2 py-0.5 bg-rose-500/10 rounded-md">
                    Always Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Analytics & Performance
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Helps us improve the platform.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) =>
                      setConsent({ ...consent, analytics: e.target.checked })
                    }
                    className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Personalized Ads
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Used to deliver relevant educational ads.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.ads}
                    onChange={(e) =>
                      setConsent({ ...consent, ads: e.target.checked })
                    }
                    className="w-4 h-4 text-rose-500 focus:ring-rose-500 border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="flex-1 py-2 px-4 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="py-2 px-4 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}