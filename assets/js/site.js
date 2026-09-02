document.documentElement.classList.replace('no-js', 'js');

(() => {
  const dialog = document.querySelector('#meeting-dialog');
  const closeButton = dialog ? dialog.querySelector('.dialog-close') : null;
  const cta = document.querySelector('.cta-link');
  let returnFocusTo = null;

  if (!dialog || !closeButton || !cta || typeof dialog.showModal !== 'function') return;

  cta.addEventListener('click', (event) => {
    event.preventDefault();
    returnFocusTo = cta;
    dialog.showModal();
    closeButton.focus();
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (returnFocusTo) returnFocusTo.focus();
    returnFocusTo = null;
  });
})();
