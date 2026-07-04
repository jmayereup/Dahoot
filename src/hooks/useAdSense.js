import { useEffect } from 'react';

export function useAdSense() {
  useEffect(() => {
    const publisherId = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || 'ca-pub-7358177326858018';
    
    const checkAndManageAds = () => {
      let adsConsent = false;
      const consentRegistered = localStorage.getItem('dahoot_cookie_consent');
      if (consentRegistered) {
        try {
          const parsed = JSON.parse(consentRegistered);
          if (parsed && typeof parsed === 'object') {
            adsConsent = parsed.ads === true;
          }
        } catch (e) {
          console.error('Error parsing cookie consent:', e);
        }
      }

      const shouldShowAds = adsConsent;
      const scriptId = 'google-adsense';
      const existingScript = document.getElementById(scriptId);

      if (!existingScript) {
        // Create the script tag once and initialize it
        const script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      // Manage AdSense pause state dynamically using the standard API
      window.adsbygoogle = window.adsbygoogle || [];
      if (shouldShowAds) {
        window.adsbygoogle.pauseAdRequests = 0;
      } else {
        window.adsbygoogle.pauseAdRequests = 1;
      }
    };

    // Run check initially
    checkAndManageAds();

    window.addEventListener('cookieConsentUpdated', checkAndManageAds);
    return () => {
      window.removeEventListener('cookieConsentUpdated', checkAndManageAds);
    };
  }, []);
}