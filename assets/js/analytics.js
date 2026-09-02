(() => {
  const allowedEvents = new Map([
    ['hero_cta_click', new Set(['cta_location'])],
    ['qualifier_open', new Set(['cta_location'])],
    ['qualifier_start', new Set(['cta_location'])],
    ['qualifier_complete', new Set(['cta_location', 'has_optional_scale', 'has_optional_deadline', 'has_utm'])],
    ['max_continue_click', new Set(['prefill_mode', 'copy_status', 'cta_location'])],
    ['email_click', new Set(['location', 'qualifier_completed'])]
  ]);

  window.siteAnalytics = Object.freeze({
    track(eventName, params = {}) {
      const analyticsConfig = window.SITE_CONFIG?.analytics;
      if (!analyticsConfig || analyticsConfig.mode === 'disabled') return;

      const allowedParams = allowedEvents.get(eventName);
      if (!allowedParams) return;
      if (Object.keys(params).some((key) => !allowedParams.has(key))) return;
      // Поставщик намеренно не подключён до отдельного решения Ксении.
    }
  });
})();
