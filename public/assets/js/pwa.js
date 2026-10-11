const pwaScript = document.currentScript;
const appBaseUrl = new URL('../../', pwaScript.src);
const installButton = document.querySelector('#install-app');

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register(new URL('sw.js', appBaseUrl), { scope: appBaseUrl.pathname })
    .catch((error) => console.error('Impossible d’activer le mode hors ligne :', error));
}

let installPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  if (!installButton) return;
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (installButton) installButton.hidden = true;
});

installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installButton.disabled = true;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
  installButton.disabled = false;
});
