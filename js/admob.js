/**
 * UNDERSTATE AdMob / Ad Manager
 * 
 * Supports two modes:
 *  1. Web PWA  → Interstitial overlay (AdSense-compatible slot injection)
 *  2. Native   → Capacitor AdMob plugin (injected by Capacitor wrapper)
 *
 * AdMob IDs:
 *  App ID:    ca-app-pub-7362104594733603~3744323984
 *  Ad Unit:   ca-app-pub-7362104594733603/8613507280
 */

(function() {
  'use strict';

  const AD_CONFIG = {
    interstitialId: 'ca-app-pub-7362104594733603/8613507280',
    appId:          'ca-app-pub-7362104594733603~3744323984',
    // Interstitial interval: show at most 1 ad per N minutes
    MIN_INTERVAL_MS:    5 * 60 * 1000, // 5 minutes
    // Delay after app load before first ad
    INITIAL_DELAY_MS:   3 * 60 * 1000, // 3 minutes
  };

  let lastAdShownAt   = 0;
  let nativeAvailable = false;
  let initialized     = false;

  // ── CSS for overlay interstitial ──────────────────────────────────────────
  const OVERLAY_CSS = `
    #us-ad-overlay {
      position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.85);
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; font-family: sans-serif;
      animation: us-ad-in 0.3s ease;
    }
    @keyframes us-ad-in { from { opacity: 0; } to { opacity: 1; } }
    #us-ad-box {
      background: #1a2540; border-radius: 12px;
      padding: 24px; max-width: 360px; width: 90%;
      text-align: center; color: #fff; position: relative;
    }
    #us-ad-label {
      font-size: 11px; color: #aaa; letter-spacing: 1px;
      text-transform: uppercase; margin-bottom: 8px;
    }
    #us-ad-slot {
      width: 300px; height: 250px; background: #0a1628;
      border-radius: 8px; margin: 0 auto 16px;
      display: flex; align-items: center; justify-content: center;
      color: #444; font-size: 13px; overflow: hidden;
    }
    #us-ad-close-btn {
      background: #2ecc71; color: #fff; border: none;
      border-radius: 8px; padding: 12px 28px;
      font-size: 15px; font-weight: bold; cursor: pointer;
      transition: opacity 0.2s;
    }
    #us-ad-close-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #us-ad-timer { font-size: 12px; color: #aaa; margin-top: 8px; }
    #us-ad-skip  { font-size: 12px; color: #4a9eff; cursor: pointer; margin-top: 6px; text-decoration: underline; }
  `;

  function injectStyles() {
    if (document.getElementById('us-ad-styles')) return;
    const s = document.createElement('style');
    s.id = 'us-ad-styles';
    s.textContent = OVERLAY_CSS;
    document.head.appendChild(s);
  }

  // ── Interstitial overlay (web fallback) ───────────────────────────────────
  function showWebInterstitial(onClose) {
    injectStyles();
    if (document.getElementById('us-ad-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'us-ad-overlay';
    overlay.innerHTML = `
      <div id="us-ad-box">
        <div id="us-ad-label">Reklam</div>
        <div id="us-ad-slot">
          <!-- AdSense / Ad Manager slot -->
          <ins class="adsbygoogle"
            style="display:inline-block;width:300px;height:250px"
            data-ad-client="ca-pub-7362104594733603"
            data-ad-slot="8613507280"></ins>
        </div>
        <button id="us-ad-close-btn" disabled>Devam Et</button>
        <div id="us-ad-timer">Lütfen bekleyin: <span id="us-ad-countdown">5</span>s</div>
        <div id="us-ad-skip" style="display:none" onclick="window._UsAd.closeOverlay()">Reklamı Geç ›</div>
      </div>
    `;
    document.body.appendChild(overlay);

    // Push AdSense ad if SDK loaded
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}

    // Countdown timer
    let remaining = 5;
    const countEl = document.getElementById('us-ad-countdown');
    const closeBtn = document.getElementById('us-ad-close-btn');
    const skipEl   = document.getElementById('us-ad-skip');

    const timer = setInterval(() => {
      remaining--;
      if (countEl) countEl.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(timer);
        if (closeBtn) { closeBtn.disabled = false; closeBtn.textContent = 'Devam Et →'; }
        if (skipEl)   { skipEl.style.display = 'block'; }
      }
    }, 1000);

    closeBtn.addEventListener('click', () => {
      clearInterval(timer);
      window._UsAd.closeOverlay();
      if (typeof onClose === 'function') onClose();
    });

    lastAdShownAt = Date.now();
  }

  function closeOverlay() {
    const el = document.getElementById('us-ad-overlay');
    if (el) el.remove();
  }

  // ── Native AdMob (Capacitor) ──────────────────────────────────────────────
  async function showNativeInterstitial(onClose) {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({ adId: AD_CONFIG.interstitialId });
      await AdMob.showInterstitial();
      lastAdShownAt = Date.now();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.warn('[AdMob] Native interstitial failed, falling back to web:', err);
      showWebInterstitial(onClose);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function canShowAd() {
    const now = Date.now();
    return (now - lastAdShownAt) >= AD_CONFIG.MIN_INTERVAL_MS;
  }

  function showInterstitial(onClose, force) {
    if (!force && !canShowAd()) return;
    if (nativeAvailable) {
      showNativeInterstitial(onClose);
    } else {
      showWebInterstitial(onClose);
    }
  }

  // ── Game event hooks ──────────────────────────────────────────────────────
  // Call these from game logic at appropriate moments
  function onLevelUp()       { showInterstitial(); }
  function onJobComplete()   { showInterstitial(); }
  function onCrimeComplete() { showInterstitial(); }
  function onElectionEnd()   { showInterstitial(null, true); }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    if (initialized) return;
    initialized = true;

    // Check if Capacitor + AdMob available
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.initialize({ appId: AD_CONFIG.appId });
        nativeAvailable = true;
        console.log('[AdMob] Native platform initialized');
      } catch {
        nativeAvailable = false;
      }
    }

    // Load AdSense SDK for web (async, non-blocking)
    if (!nativeAvailable && !document.querySelector('script[src*="adsbygoogle"]')) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7362104594733603';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }

    // First interstitial after initial delay
    setTimeout(() => showInterstitial(), AD_CONFIG.INITIAL_DELAY_MS);

    console.log('[AdMob] Initialized — mode:', nativeAvailable ? 'native' : 'web');
  }

  // ── Expose globally ───────────────────────────────────────────────────────
  window._UsAd = {
    init,
    showInterstitial,
    onLevelUp,
    onJobComplete,
    onCrimeComplete,
    onElectionEnd,
    canShowAd,
    closeOverlay,
    config: AD_CONFIG,
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
