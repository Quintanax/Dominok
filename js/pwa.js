// ============================================================
//  DominoStats Pro — PWA Manager (pwa.js)
//  - Registra el Service Worker
//  - Muestra banner de instalación personalizado
//  - Indica cuando la app está offline
// ============================================================

(function () {
  'use strict';

  // ── 1. REGISTRAR SERVICE WORKER ────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado:', registration.scope);

          // Escuchar actualizaciones del SW
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // Hay una versión nueva disponible
                _showUpdateBanner();
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[PWA] Error al registrar SW:', err);
        });
    });
  }

  // ── 2. BANNER DE INSTALACIÓN ────────────────────────────────
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Evitar el banner nativo del navegador
    _deferredPrompt = e;
    console.log('[PWA] Evento beforeinstallprompt capturado');

    // Mostrar nuestro banner personalizado después de 3 seg
    // (no lo mostramos inmediatamente para no ser intrusivos)
    setTimeout(_showInstallBanner, 3000);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App instalada correctamente');
    _deferredPrompt = null;
    _removeInstallBanner();
    _showToast('✅ DominoStats instalada correctamente en tu dispositivo');
  });

  function _showInstallBanner() {
    if (!_deferredPrompt) return;
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.innerHTML = `
      <div class="pwa-banner-inner">
        <div class="pwa-banner-icon">🁣</div>
        <div class="pwa-banner-text">
          <strong>Instalar DominoStats</strong>
          <span>Accede más rápido desde tu pantalla de inicio</span>
        </div>
        <div class="pwa-banner-actions">
          <button id="pwa-install-btn" class="pwa-btn-install">Instalar</button>
          <button id="pwa-dismiss-btn" class="pwa-btn-dismiss">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Animar entrada
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.classList.add('pwa-banner-visible');
      });
    });

    document.getElementById('pwa-install-btn').addEventListener('click', _triggerInstall);
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      _removeInstallBanner();
      // No volver a mostrar en esta sesión
      sessionStorage.setItem('pwa-dismissed', '1');
    });
  }

  async function _triggerInstall() {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    console.log('[PWA] Resultado instalación:', outcome);
    _deferredPrompt = null;
    _removeInstallBanner();
  }

  function _removeInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (banner) {
      banner.classList.remove('pwa-banner-visible');
      setTimeout(() => banner.remove(), 400);
    }
  }

  // ── 3. BANNER DE ACTUALIZACIÓN ─────────────────────────────
  function _showUpdateBanner() {
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.innerHTML = `
      <div class="pwa-banner-inner">
        <div class="pwa-banner-icon">🔄</div>
        <div class="pwa-banner-text">
          <strong>Nueva versión disponible</strong>
          <span>Recarga para obtener las últimas mejoras</span>
        </div>
        <div class="pwa-banner-actions">
          <button id="pwa-reload-btn" class="pwa-btn-install">Recargar</button>
          <button id="pwa-update-dismiss-btn" class="pwa-btn-dismiss">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => banner.classList.add('pwa-banner-visible'));
    });

    document.getElementById('pwa-reload-btn').addEventListener('click', () => {
      window.location.reload();
    });
    document.getElementById('pwa-update-dismiss-btn').addEventListener('click', () => {
      banner.remove();
    });
  }

  // ── 4. INDICADOR OFFLINE / ONLINE ──────────────────────────
  function _updateOnlineStatus() {
    const isOnline = navigator.onLine;
    let indicator = document.getElementById('pwa-offline-indicator');

    if (!isOnline) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'pwa-offline-indicator';
        indicator.innerHTML = '📡 Sin conexión — Modo offline';
        document.body.appendChild(indicator);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => indicator.classList.add('pwa-offline-visible'));
      });
    } else {
      if (indicator) {
        indicator.classList.remove('pwa-offline-visible');
        setTimeout(() => indicator.remove(), 400);
      }
    }
  }

  window.addEventListener('online', _updateOnlineStatus);
  window.addEventListener('offline', _updateOnlineStatus);
  // Verificar estado inicial
  document.addEventListener('DOMContentLoaded', _updateOnlineStatus);

  // ── 5. TOAST HELPER ────────────────────────────────────────
  function _showToast(msg) {
    // Usa el sistema de toast de la app si está disponible
    if (typeof App !== 'undefined' && App.showToast) {
      App.showToast(msg, 'success');
      return;
    }
    // Fallback básico
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
      background:#7c3aed;color:#fff;padding:12px 20px;border-radius:8px;
      z-index:9999;font-size:14px;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── EXPONER API PÚBLICA ────────────────────────────────────
  window.PWA = {
    install: _triggerInstall,
    isInstalled: () => window.matchMedia('(display-mode: standalone)').matches,
  };
})();
