(() => {
  'use strict';
  const dialog = document.querySelector('#qualifier-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const form = dialog.querySelector('#qualifier-form');
  const formView = dialog.querySelector('[data-qualifier-form-view]');
  const extrasView = dialog.querySelector('[data-qualifier-extras-view]');
  const confirmationView = dialog.querySelector('[data-qualifier-confirmation]');
  const title = dialog.querySelector('#qualifier-title');
  const extrasTitle = dialog.querySelector('#qualifier-extras-title');
  const confirmationTitle = dialog.querySelector('#qualifier-confirmation-title');
  const selectedTopic = dialog.querySelector('[data-selected-topic]');
  const preview = dialog.querySelector('[data-message-preview]');
  const status = dialog.querySelector('[data-form-status]');
  const copyStatus = dialog.querySelector('[data-copy-status]');
  const copyButton = dialog.querySelector('[data-copy-again]');
  const maxLink = dialog.querySelector('[data-open-max]');
  const emailLink = dialog.querySelector('[data-send-email]');
  const warning = dialog.querySelector('[data-config-warning]');
  const businessField = dialog.querySelector('[data-business-field]');
  const questionField = dialog.querySelector('[data-question-field]');
  const questionProgress = dialog.querySelector('[data-question-progress]');
  const nextQuestion = dialog.querySelector('[data-next-question]');
  const previousQuestion = dialog.querySelector('[data-previous-question]');
  const prepareButton = dialog.querySelector('[data-prepare-message]');
  const extrasButton = dialog.querySelector('[data-open-extras]');
  const compactLayout = window.matchMedia('(max-width: 600px)');
  const requiredFields = [
    { name: 'business', limit: 250, error: 'business-error' },
    { name: 'question', limit: 700, error: 'question-error' }
  ];
  const optionalFields = [
    { name: 'dataSources', limit: 300, label: 'Где сейчас ведётся учёт' },
    { name: 'scale', limit: 180, label: 'Количество компаний / направлений / каналов' },
    { name: 'deadline', limit: 120, label: 'Когда требуется принять решение' }
  ];
  let opener = null;
  let selectedFormat = '';
  let currentMessage = '';
  let pressedBackdrop = false;
  let questionIndex = 0;

  const normalize = (value, limit) => String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\t/g, ' ')
    .trim()
    .slice(0, limit);

  const setError = (rule, invalid) => {
    form.elements.namedItem(rule.name).setAttribute('aria-invalid', String(invalid));
    dialog.querySelector('#' + rule.error).hidden = !invalid;
    dialog.querySelector('#' + rule.error.replace('-error', '-hint')).hidden = invalid;
  };
  const syncQuestions = () => {
    const compact = compactLayout.matches;
    businessField.hidden = compact && questionIndex === 1;
    questionField.hidden = compact && questionIndex === 0;
    questionProgress.hidden = !compact;
    questionProgress.textContent = 'Вопрос ' + (questionIndex + 1) + ' из 2';
    nextQuestion.hidden = !compact || questionIndex === 1;
    previousQuestion.hidden = !compact || questionIndex === 0;
    prepareButton.hidden = compact && questionIndex === 0;
    selectedTopic.hidden = !selectedFormat || (compact && questionIndex === 1);
  };
  const showForm = () => {
    form.hidden = false;
    formView.hidden = false;
    extrasView.hidden = true;
    confirmationView.hidden = true;
    syncQuestions();
    dialog.setAttribute('aria-labelledby', 'qualifier-title');
    dialog.setAttribute('aria-describedby', 'qualifier-description qualifier-warning');
    dialog.scrollTop = 0;
  };
  compactLayout.addEventListener('change', () => {
    syncQuestions();
    if (dialog.open && !formView.hidden) title.focus({ preventScroll: true });
  });
  const advanceQuestion = () => {
    const field = form.elements.namedItem('business');
    const invalid = !normalize(field.value, 250);
    setError(requiredFields[0], invalid);
    if (invalid) {
      status.textContent = 'Опишите сферу и модель бизнеса.';
      field.focus({ preventScroll: true });
      return;
    }
    questionIndex = 1;
    status.textContent = '';
    syncQuestions();
    form.elements.namedItem('question').focus({ preventScroll: true });
  };
  nextQuestion.addEventListener('click', advanceQuestion);
  previousQuestion.addEventListener('click', () => {
    questionIndex = 0;
    syncQuestions();
    form.elements.namedItem('business').focus({ preventScroll: true });
  });
  extrasButton.addEventListener('click', () => {
    formView.hidden = true;
    extrasView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'qualifier-extras-title');
    dialog.setAttribute('aria-describedby', 'qualifier-extras-description');
    extrasTitle.focus({ preventScroll: true });
  });
  dialog.querySelector('[data-save-extras]').addEventListener('click', () => {
    showForm();
    extrasButton.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-open-qualifier]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      selectedFormat = link.hasAttribute('data-cooperation')
        ? link.closest('article').querySelector('h3').textContent.trim()
        : '';
      selectedTopic.textContent = selectedFormat ? 'Выбранный формат: ' + selectedFormat : '';
      selectedTopic.hidden = !selectedFormat;
      currentMessage = '';
      preview.value = '';
      copyStatus.textContent = '';
      status.textContent = '';
      questionIndex = 0;
      requiredFields.forEach((rule) => setError(rule, false));
      showForm();
      dialog.showModal();
      document.documentElement.classList.add('feedback-open');
      title.focus({ preventScroll: true });
      dialog.scrollTop = 0;
    });
  });

  dialog.querySelectorAll('[data-close-qualifier]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  const isBackdrop = (event) => {
    const bounds = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  };
  dialog.addEventListener('pointerdown', (event) => { pressedBackdrop = isBackdrop(event); });
  dialog.addEventListener('click', (event) => {
    if (pressedBackdrop && isBackdrop(event)) dialog.close();
    pressedBackdrop = false;
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('feedback-open');
    pressedBackdrop = false;
    opener?.focus({ preventScroll: true });
    opener = null;
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), summary')]
      .filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title || document.activeElement === extrasTitle || document.activeElement === confirmationTitle)) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  form.addEventListener('input', (event) => {
    const field = event.target;
    if (field.maxLength > 0 && field.value.length > field.maxLength) field.value = field.value.slice(0, field.maxLength);
    const rule = requiredFields.find((item) => item.name === field.name);
    if (rule && normalize(field.value, rule.limit)) setError(rule, false);
    if (requiredFields.every((item) => normalize(form.elements.namedItem(item.name).value, item.limit))) status.textContent = '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (compactLayout.matches && questionIndex === 0 && !formView.hidden) {
      advanceQuestion();
      return;
    }
    const values = {};
    let firstInvalid = null;
    requiredFields.forEach((rule) => {
      const field = form.elements.namedItem(rule.name);
      const value = normalize(field.value, rule.limit);
      values[rule.name] = value;
      setError(rule, !value);
      if (!value && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      status.textContent = 'Проверьте обязательные поля.';
      questionIndex = firstInvalid === form.elements.namedItem('business') ? 0 : 1;
      showForm();
      firstInvalid.focus({ preventScroll: true });
      return;
    }
    const lines = ['Здравствуйте, Ксения. Хочу разобрать финансовую ситуацию.', ''];
    if (selectedFormat) lines.push('Интересующий формат: ' + selectedFormat, '');
    lines.push('Сфера и модель бизнеса: ' + values.business, 'Вопрос, который нужно решить: ' + values.question);
    optionalFields.forEach((rule) => {
      const value = normalize(form.elements.namedItem(rule.name).value, rule.limit);
      if (value) lines.push(rule.label + ': ' + value);
    });
    currentMessage = lines.join('\n');
    preview.value = currentMessage;

    // site.js has already validated and populated these direct contact links.
    const maxHref = document.querySelector('[data-contact-max][href]')?.getAttribute('href');
    const emailHref = document.querySelector('[data-contact-email][href]')?.getAttribute('href');
    maxLink.hidden = !maxHref;
    dialog.querySelector('[data-max-unavailable]').hidden = Boolean(maxHref);
    if (maxHref) maxLink.href = maxHref;
    else maxLink.removeAttribute('href');
    emailLink.hidden = !emailHref;
    dialog.querySelector('[data-email-unavailable]').hidden = Boolean(emailHref);
    if (emailHref) emailLink.href = emailHref + '?subject=' + encodeURIComponent('Разбор финансовой ситуации') + '&body=' + encodeURIComponent(currentMessage);
    else emailLink.removeAttribute('href');
    warning.hidden = Boolean(maxHref && emailHref);
    warning.textContent = !maxHref && !emailHref
      ? 'MAX и e-mail пока не подключены. Подготовленное сообщение можно скопировать.'
      : (!maxHref ? 'MAX пока не подключён. Можно скопировать сообщение или написать по e-mail.' : 'E-mail пока не подключён. Можно скопировать сообщение и открыть MAX.');
    copyStatus.textContent = 'Сообщение ещё не отправлено. Проверьте текст перед отправкой.';
    form.hidden = true;
    formView.hidden = true;
    extrasView.hidden = true;
    confirmationView.hidden = false;
    dialog.setAttribute('aria-labelledby', 'qualifier-confirmation-title');
    dialog.setAttribute('aria-describedby', 'copy-status');
    confirmationTitle.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  });

  copyButton.addEventListener('click', async () => {
    if (!currentMessage) return;
    copyButton.disabled = true;
    let copied = false;
    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentMessage);
        copied = true;
      }
    } catch { /* The selectable preview also works when clipboard access is denied. */ }
    if (!dialog.open || confirmationView.hidden) {
      copyButton.disabled = false;
      return;
    }
    if (!copied) {
      preview.focus();
      preview.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; }
    }
    copyStatus.textContent = copied
      ? 'Сообщение скопировано. Его можно вставить в переписку.'
      : 'Копирование недоступно. Текст выделен — скопируйте его вручную.';
    copyButton.disabled = false;
    if (copied && dialog.open) copyButton.focus({ preventScroll: true });
  });
  dialog.querySelector('[data-edit-qualifier]').addEventListener('click', () => {
    questionIndex = 0;
    showForm();
    form.elements.namedItem('business').focus({ preventScroll: true });
  });
})();
