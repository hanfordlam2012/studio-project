(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/service-worker.js').catch(function () {});
  });

  var installPrompt = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (standalone) return;

  function installButton(label) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pwa-install-button';
    button.textContent = label;
    button.setAttribute('aria-label', label + ' on this device');
    document.body.appendChild(button);
    return button;
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    installPrompt = event;
    var button = installButton('Install studio app');
    button.addEventListener('click', function () {
      if (!installPrompt) return;
      installPrompt.prompt();
      installPrompt.userChoice.finally(function () {
        installPrompt = null;
        button.remove();
      });
    });
  });

  var isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  if (isIOS) {
    var iosButton = installButton('Add to Home Screen');
    iosButton.addEventListener('click', function () {
      window.alert('In Safari, tap Share, then choose Add to Home Screen.');
    });
  }
}());
