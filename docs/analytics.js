(function () {
  'use strict';

  // GA4 の測定 ID（例: G-XXXXXXXXXX）
  // https://analytics.google.com/ でプロパティを作成し、データストリームから取得してください。
  var MEASUREMENT_ID = 'G-29LX0ETF3P';

  function isEnabled() {
    return typeof MEASUREMENT_ID === 'string' && /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);
  }

  function loadGtag(id) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });
  }

  var pageTitles = {
    home: 'Home',
    research: 'Research',
    business: 'Business',
    art: 'Art',
    message: 'Message'
  };

  function trackPageView(page) {
    if (!isEnabled() || typeof window.gtag !== 'function') return;
    var path = page === 'home' ? '/' : '/' + page;
    var hash = page === 'message' ? '#message' : '';
    window.gtag('event', 'page_view', {
      page_title: pageTitles[page] || page,
      page_location: window.location.origin + window.location.pathname + hash,
      page_path: path + hash
    });
  }

  if (isEnabled()) loadGtag(MEASUREMENT_ID);

  window.siteAnalytics = { trackPageView: trackPageView, isEnabled: isEnabled };
})();