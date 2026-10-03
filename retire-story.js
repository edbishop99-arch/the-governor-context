(function () {
  'use strict';

  function normalizedText(el) {
    return String((el && el.textContent) || '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function isStoryLabel(el) {
    var t = normalizedText(el);
    return t.indexOf('READERS') !== -1 && t.indexOf('STORY') !== -1 && t.indexOf('EDITION') !== -1;
  }

  function forceVoiceRoute() {
    var href = String(window.location.href);
    var hash = String(window.location.hash || '');
    if (/view=story\b/i.test(href) || /readers(?:-|%20|\s)*story/i.test(hash)) {
      var next = href.replace(/view=story\b/ig, 'view=voice');
      if (next === href) {
        window.location.hash = '#/read?view=voice';
      } else {
        window.location.replace(next);
      }
      return true;
    }
    return false;
  }

  function removeStoryControls(root) {
    if (!root || !root.querySelectorAll) return;

    root.querySelectorAll(
      '.governor-story-download, [data-view="story"], [data-edition="story"], [data-mode="story"], a[href*="view=story"], a[href*="governor_story_download"]'
    ).forEach(function (el) {
      el.remove();
    });

    root.querySelectorAll('button, a, [role="tab"], [role="button"]').forEach(function (el) {
      if (isStoryLabel(el)) {
        el.remove();
      }
    });

    root.querySelectorAll('p, div, section, aside').forEach(function (el) {
      if (!isStoryLabel(el)) return;
      var controls = el.querySelectorAll && el.querySelectorAll('button, a, [role="tab"], [role="button"]');
      if (controls && controls.length) return;
      var t = normalizedText(el);
      if (t.length < 260) {
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
    if (isStoryLabel(target) || /view=story\b/i.test(String(target.getAttribute('href') || ''))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.hash = '#/read?view=voice';
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
