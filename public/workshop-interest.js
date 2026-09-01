(function () {
  'use strict';

  var message = document.getElementById('contactMessageInput');
  if (!message) return;

  document.querySelectorAll('[data-attraction]').forEach(function (card) {
    card.addEventListener('click', function () {
      var attraction = card.getAttribute('data-attraction');
      message.value = 'Hello Hanford, please add me to the notice list for ' + attraction + ' when it becomes operational.';
      message.dispatchEvent(new Event('keyup', {bubbles: true}));
      window.setTimeout(function () { message.focus(); }, 350);
    });
  });
}());
