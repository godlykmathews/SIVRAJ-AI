/**
 * DEFINITELYNOTCHROME BROWSER - Incognito View (sivraj://incognito or about:incognito)
 * Authentic Chromium Incognito layout.
 */

export function renderIncognitoView(onNavigate) {
  const container = document.createElement('div');
  container.className = 'chrome-incognito-view';

  container.innerHTML = `
    <div class="incognito-icon-wrapper">🕶️</div>
    <h1 class="incognito-header-title">You’ve gone incognito</h1>
    <p class="incognito-summary-text">
      Now you can browse privately, and other users of this device won’t see your activity. However, downloads and bookmarks will be saved.
    </p>

    <div class="incognito-details-grid">
      <div class="incognito-column">
        <h3>DefinitelyNotChrome Browser won’t save:</h3>
        <ul>
          <li>Your browsing history across the AI Internet</li>
          <li>Cookies and site data</li>
          <li>Information entered in forms</li>
        </ul>
      </div>

      <div class="incognito-column">
        <h3>Your activity might still be visible to:</h3>
        <ul>
          <li>Websites you visit (RoboBook, RoboForum, etc.)</li>
          <li>Your network administrator</li>
          <li>Underlying system telemetry</li>
        </ul>
      </div>
    </div>
  `;

  return container;
}
