/* Keep the section when comparing static pages; do not transfer form data. */
(() => {
  const comparisonLinks = document.querySelectorAll('[data-variant-link]');
  if (!comparisonLinks.length) return;

  comparisonLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (link.dataset.compareFromTop === 'true') return;
      const reviewBar = document.querySelector('.concept-review-bar');
      const header = document.querySelector('.site-header');
      const readingLine = (reviewBar?.offsetHeight || 0) + (header?.offsetHeight || 0) + 24;
      const sections = [...document.querySelectorAll('main > section[id]')];
      let currentSection = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= readingLine) currentSection = section;
      });
      const openSituation = [...document.querySelectorAll('.situation-card[open]')]
        .find((detail) => {
          const rect = detail.getBoundingClientRect();
          return rect.top <= readingLine && rect.bottom > readingLine;
        });
      const target = openSituation || currentSection;
      if (!target) return;
      const url = new URL(link.href, window.location.href);
      url.hash = target.id === 'top' ? '' : target.id;
      link.href = url.toString();
    });
  });
})();
