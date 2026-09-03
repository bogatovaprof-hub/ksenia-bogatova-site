document.documentElement.classList.replace('no-js', 'js');

(() => {
  const dialog = document.querySelector('#qualifier-dialog');
  const form = document.querySelector('#qualifier-form');
  const formView = document.querySelector('[data-qualifier-form-view]');
  const confirmationView = document.querySelector('[data-qualifier-confirmation]');
  const dialogTitle = document.querySelector('#qualifier-title');
  const confirmationTitle = document.querySelector('#qualifier-confirmation-title');
  const messagePreview = document.querySelector('[data-message-preview]');
  const copyStatus = document.querySelector('[data-copy-status]');
  const formStatus = document.querySelector('[data-form-status]');
  const maxLink = document.querySelector('[data-open-max]');
  const maxUnavailable = document.querySelector('[data-max-unavailable]');
  const emailLink = document.querySelector('[data-send-email]');
  const emailUnavailable = document.querySelector('[data-email-unavailable]');
  const configWarning = document.querySelector('[data-config-warning]');
  const ctaLinks = document.querySelectorAll('[data-open-qualifier]');
  const closeButtons = document.querySelectorAll('[data-close-qualifier]');
  const copyAgainButton = document.querySelector('[data-copy-again]');
  const editButton = document.querySelector('[data-edit-qualifier]');
  const directMaxLink = document.querySelector('[data-direct-max]');
  const directEmailLink = document.querySelector('[data-direct-email]');
  const contactUnavailable = document.querySelector('[data-contact-unavailable]');

  const allowedCtaLocations = new Set(['header', 'hero', 'questions', 'formats', 'final']);
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utmStorageKey = 'bogatova-cfo-utm';
  const placeholderPattern = /^\{\{[^{}]+\}\}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const fieldRules = [
    { name: 'business', maxLength: 250, errorId: 'business-error' },
    { name: 'question', maxLength: 700, errorId: 'question-error' },
    { name: 'dataSources', maxLength: 300, errorId: 'data-sources-error' }
  ];

  let returnFocusTo = null;
  let activeCtaLocation = 'hero';
  let qualifierStarted = false;
  let qualifierCompleted = false;
  let currentMessage = '';
  let currentMode = 'copy';
  let currentCopyStatus = 'not_attempted';

  const getConfig = () => window.SITE_CONFIG || {};

  const isConfiguredValue = (value) => {
    const normalized = typeof value === 'string' ? value.trim() : '';
    return Boolean(normalized) && !placeholderPattern.test(normalized);
  };

  const getSafeExternalUrl = (value) => {
    if (!isConfiguredValue(value)) return null;

    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  };

  const getSafeEmail = (value) => {
    if (!isConfiguredValue(value)) return null;
    const normalized = value.trim();
    return emailPattern.test(normalized) ? normalized : null;
  };

  const track = (eventName, params = {}) => {
    try {
      window.siteAnalytics?.track(eventName, params);
    } catch {
      // Аналитика не должна блокировать основной сценарий.
    }
  };

  const normalizeUserText = (value, maxLength) => String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\t/g, ' ')
    .trim()
    .slice(0, maxLength);

  const sanitizeUtmValue = (value) => String(value || '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .trim()
    .slice(0, 100);

  const readStoredUtm = () => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(utmStorageKey) || '{}');
      return utmKeys.reduce((result, key) => {
        const value = sanitizeUtmValue(stored[key]);
        if (value) result[key] = value;
        return result;
      }, {});
    } catch {
      return {};
    }
  };

  const readUtm = () => {
    const attribution = readStoredUtm();
    const params = new URLSearchParams(window.location.search);
    let hasQueryUtm = false;

    utmKeys.forEach((key) => {
      if (!params.has(key)) return;
      hasQueryUtm = true;
      const value = sanitizeUtmValue(params.get(key));
      if (value) attribution[key] = value;
      else delete attribution[key];
    });

    if (hasQueryUtm) {
      try {
        sessionStorage.setItem(utmStorageKey, JSON.stringify(attribution));
      } catch {
        return {};
      }
    }

    return attribution;
  };

  const attribution = readUtm();

  const buildMessage = (values) => {
    const lines = [
      'Здравствуйте, Ксения. Хочу разобрать финансовую ситуацию.',
      '',
      `Сфера и модель бизнеса: ${values.business}`,
      `Вопрос, который нужно решить: ${values.question}`,
      `Данные сейчас находятся в: ${values.dataSources}`,
      `Количество компаний / направлений / каналов: ${values.scale || 'не указано'}`,
      `Когда нужен ответ: ${values.deadline || 'не указано'}`,
      '',
      'Источник: сайт bogatova-cfo.ru'
    ];

    const campaign = utmKeys
      .filter((key) => attribution[key])
      .map((key) => `${key}=${attribution[key]}`);

    if (campaign.length) lines.push(`Кампания: ${campaign.join('; ')}`);
    return lines.join('\n');
  };

  const buildMailto = (email, message = '') => {
    const query = new URLSearchParams();
    query.set('subject', 'Разбор финансовой ситуации — сайт');
    if (message) query.set('body', message);
    return `mailto:${email}?${query.toString()}`;
  };

  const buildPrefillUrl = (template, message) => {
    if (!isConfiguredValue(template) || !template.includes('{message}')) return null;
    const encodedMessage = encodeURIComponent(message);
    return getSafeExternalUrl(template.split('{message}').join(encodedMessage));
  };

  const setDirectContacts = () => {
    const config = getConfig();
    const safeMaxUrl = getSafeExternalUrl(config.maxUrl);
    const safeEmail = getSafeEmail(config.email);

    if (safeMaxUrl && directMaxLink) {
      directMaxLink.href = safeMaxUrl;
      directMaxLink.hidden = false;
    }

    if (safeEmail && directEmailLink) {
      directEmailLink.href = buildMailto(safeEmail);
      directEmailLink.hidden = false;
      directEmailLink.addEventListener('click', () => {
        track('email_click', { location: 'contact', qualifier_completed: qualifierCompleted });
      });
    }

    if (contactUnavailable) contactUnavailable.hidden = Boolean(safeMaxUrl || safeEmail);
  };

  const setFieldError = (field, errorId, hasError) => {
    const error = document.querySelector(`#${errorId}`);
    field.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    if (error) error.hidden = !hasError;
  };

  const validateForm = () => {
    const values = {};
    let firstInvalid = null;

    fieldRules.forEach(({ name, maxLength, errorId }) => {
      const field = form.elements.namedItem(name);
      const value = normalizeUserText(field.value, maxLength);
      values[name] = value;
      const hasError = !value;
      setFieldError(field, errorId, hasError);
      if (hasError && !firstInvalid) firstInvalid = field;
    });

    values.scale = normalizeUserText(form.elements.namedItem('scale').value, 180);
    values.deadline = normalizeUserText(form.elements.namedItem('deadline').value, 120);

    if (firstInvalid) {
      formStatus.textContent = 'Проверьте обязательные поля.';
      firstInvalid.focus();
      return null;
    }

    formStatus.textContent = '';
    return values;
  };

  const copyWithFallback = (message) => {
    const temporaryField = document.createElement('textarea');
    temporaryField.value = message;
    temporaryField.setAttribute('readonly', '');
    temporaryField.className = 'clipboard-fallback';
    document.body.append(temporaryField);
    temporaryField.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch {
      copied = false;
    }

    temporaryField.remove();
    return copied ? 'fallback' : 'manual';
  };

  const copyMessage = async (message) => {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(message);
        return 'clipboard';
      } catch {
        return copyWithFallback(message);
      }
    }

    return copyWithFallback(message);
  };

  const configureConfirmationActions = (message) => {
    const config = getConfig();
    const safeMaxUrl = getSafeExternalUrl(config.maxUrl);
    const prefillUrl = buildPrefillUrl(config.maxPrefillUrlTemplate, message);
    const safeEmail = getSafeEmail(config.email);
    const targetMaxUrl = prefillUrl || safeMaxUrl;

    currentMode = prefillUrl ? 'prefill' : 'copy';

    if (targetMaxUrl) {
      maxLink.href = targetMaxUrl;
      maxLink.hidden = false;
      maxUnavailable.hidden = true;
    } else {
      maxLink.hidden = true;
      maxLink.removeAttribute('href');
      maxUnavailable.hidden = false;
    }

    if (safeEmail) {
      emailLink.href = buildMailto(safeEmail, message);
      emailLink.hidden = false;
      emailUnavailable.hidden = true;
    } else {
      emailLink.hidden = true;
      emailLink.removeAttribute('href');
      emailUnavailable.hidden = false;
    }

    configWarning.hidden = Boolean(targetMaxUrl && safeEmail);
    return { prefillUrl, hasUtm: Object.keys(attribution).length > 0 };
  };

  const showConfirmation = async (values) => {
    currentMessage = buildMessage(values);
    messagePreview.value = currentMessage;

    const { prefillUrl, hasUtm } = configureConfirmationActions(currentMessage);
    currentCopyStatus = prefillUrl ? 'not_needed' : await copyMessage(currentMessage);
    confirmationView.dataset.prefillMode = currentMode;
    confirmationView.dataset.copyResult = currentCopyStatus;

    if (prefillUrl) {
      copyStatus.textContent = 'Сообщение подготовлено. Откройте MAX — текст обращения будет добавлен автоматически.';
    } else if (currentCopyStatus === 'clipboard' || currentCopyStatus === 'fallback') {
      copyStatus.textContent = 'Текст сообщения подготовлен и скопирован. Откройте MAX и вставьте его в чат.';
    } else {
      copyStatus.textContent = 'Текст сообщения подготовлен. Скопируйте его из поля ниже, затем откройте MAX и вставьте в чат.';
    }

    formView.hidden = true;
    confirmationView.hidden = false;
    dialog.scrollTop = 0;
    qualifierCompleted = true;
    track('qualifier_complete', {
      cta_location: activeCtaLocation,
      has_optional_scale: Boolean(values.scale),
      has_optional_deadline: Boolean(values.deadline),
      has_utm: hasUtm
    });
    confirmationTitle.focus();

    if (currentCopyStatus === 'manual') {
      messagePreview.focus();
      messagePreview.select();
    }
  };

  setDirectContacts();

  if (!dialog || !form || typeof dialog.showModal !== 'function') return;

  ctaLinks.forEach((cta) => {
    cta.addEventListener('click', (event) => {
      const requestedLocation = cta.dataset.ctaLocation;
      activeCtaLocation = allowedCtaLocations.has(requestedLocation) ? requestedLocation : 'hero';
      if (activeCtaLocation === 'hero') track('hero_cta_click', { cta_location: 'hero' });

      event.preventDefault();
      returnFocusTo = cta;
      dialog.showModal();
      document.body.classList.add('dialog-open');
      dialog.scrollTop = 0;
      track('qualifier_open', { cta_location: activeCtaLocation });
      (confirmationView.hidden ? dialogTitle : confirmationTitle).focus();
    });
  });

  closeButtons.forEach((button) => button.addEventListener('click', () => dialog.close()));

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    dialog.close();
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    dialog.close();
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    if (returnFocusTo) returnFocusTo.focus();
    returnFocusTo = null;
  });

  form.addEventListener('input', (event) => {
    if (typeof event.target.value === 'string' && event.target.maxLength > 0 && event.target.value.length > event.target.maxLength) {
      event.target.value = event.target.value.slice(0, event.target.maxLength);
    }

    if (!qualifierStarted) {
      qualifierStarted = true;
      track('qualifier_start', { cta_location: activeCtaLocation });
    }

    const rule = fieldRules.find(({ name }) => name === event.target.name);
    if (rule && normalizeUserText(event.target.value, rule.maxLength)) {
      setFieldError(event.target, rule.errorId, false);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = validateForm();
    if (!values) return;
    await showConfirmation(values);
  });

  copyAgainButton.addEventListener('click', async () => {
    currentCopyStatus = await copyMessage(currentMessage);
    confirmationView.dataset.copyResult = currentCopyStatus;
    if (currentCopyStatus === 'clipboard' || currentCopyStatus === 'fallback') {
      copyStatus.textContent = 'Текст сообщения скопирован ещё раз.';
    } else {
      copyStatus.textContent = 'Автоматическое копирование недоступно. Скопируйте текст из поля ниже.';
      messagePreview.focus();
      messagePreview.select();
    }
  });

  maxLink.addEventListener('click', () => {
    track('max_continue_click', {
      prefill_mode: currentMode,
      copy_status: currentCopyStatus,
      cta_location: activeCtaLocation
    });
  });

  emailLink.addEventListener('click', () => {
    track('email_click', { location: 'qualifier', qualifier_completed: qualifierCompleted });
  });

  editButton.addEventListener('click', () => {
    confirmationView.hidden = true;
    formView.hidden = false;
    dialog.scrollTop = 0;
    form.elements.namedItem('business').focus();
  });
})();

(() => {
  const questionDetails = [...document.querySelectorAll('.question-detail')];

  questionDetails.forEach((currentDetail) => {
    const summary = currentDetail.querySelector('summary');

    summary.addEventListener('click', (event) => {
      event.preventDefault();
      const shouldOpen = !currentDetail.open;

      questionDetails.forEach((otherDetail) => {
        otherDetail.open = false;
      });

      currentDetail.open = shouldOpen;
    });
  });
})();
