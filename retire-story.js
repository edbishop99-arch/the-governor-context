(function () {
  'use strict';

  function normalizedText(el) {
    return String((el && el.textContent) || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function isStoryLabel(el) {
    var text = normalizedText(el);
    return text.indexOf('READERS') !== -1 && text.indexOf('STORY') !== -1;
  }

  function forceVoiceRoute() {
    try {
      localStorage.setItem('governor-reading-mode', 'voice');
    } catch (_) {}

    var href = String(window.location.href || '');
    if (/view=(?:readers|story)\b/i.test(href)) {
      window.location.replace(href.replace(/view=(?:readers|story)\b/ig, 'view=voice'));
      return true;
    }
    return false;
  }

  function removeStoryControls(root) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll(
      '.toolbar-button--readers,' +
      '.governor-story-download,' +
      '[data-view="readers"],[data-view="story"],' +
      '[data-edition="readers"],[data-edition="story"],' +
      '[data-mode="readers"],[data-mode="story"],' +
      'a[href*="view=readers"],a[href*="view=story"],' +
      'a[href*="governor_story_download"]'
    ).forEach(function (el) {
      el.remove();
    });

    root.querySelectorAll('button, a, [role="tab"], [role="button"]').forEach(function (el) {
      if (isStoryLabel(el)) {
        el.remove();
      }
    });

    root.querySelectorAll('.draft-notice--reader').forEach(function (el) {
      if (isStoryLabel(el)) {
        el.remove();
      }
    });
  }

  function run() {
    if (forceVoiceRoute()) return;
    removeStoryControls(document);
  }

  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest ? event.target.closest('button, a, [role="tab"], [role="button"]') : null;
    if (!target) return;

    var href = String(target.getAttribute('href') || '');
    if (isStoryLabel(target) || /view=(?:readers|story)\b/i.test(href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.hash = '#/read?view=voice';
      try { localStorage.setItem('governor-reading-mode', 'voice'); } catch (_) {}
      setTimeout(run, 0);
    }
  }, true);

  window.addEventListener('hashchange', run);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();