import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'node:fs';
const commit = 'b7607aed5df76b9d562ea3264554687c72e9e6d6';
const cloudDisabled = `  async loadCloud() {
    throw new Error("Cloud saves are disabled in this isolated V5 preview.");
  }

  parent() {
    this.ui.modal(\`<div class="eyebrow">ISOLATED V5 PREVIEW</div><h1 id="modal-title">Preview saves stay here</h1><p>Google Sign-In and cloud saves are disabled. Your production profiles and Kingdom progress are not used or changed. Preview progress saves only in this browser on this preview website.</p><button id="export-save" class="v5-btn v5-btn-secondary">Export preview backup</button><button id="back" class="v5-btn v5-btn-secondary">Back</button>\`);
    $("export-save").onclick = () => this.export();
    $("back").onclick = () => this.menu();
  }
  `;
export default defineConfig({
  base: '/',
  build: { outDir: '.cache/v5-preview-dist' },
  plugins: [{
    name: 'isolated-pr17-preview',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/style.css')) return code.replaceAll('/tiny-siege/', '/');
      if (id.endsWith('/src/main.js')) {
        if (!code.includes('new ProfileStore(localStorage)')) throw Error('Preview storage guard did not match');
        return code.replace('new ProfileStore(localStorage)', 'new ProfileStore(localStorage, "tiny-siege-v5-pr17-preview-e121297")');
      }
      if (id.endsWith('/src/progression/KingdomUI.js')) {
        const start = code.indexOf('  async loadCloud() {');
        const end = code.indexOf('  importReview() {', start);
        if (start < 0 || end < 0) throw Error('Preview cloud guard did not match');
        return (code.slice(0, start) + cloudDisabled + code.slice(end))
          .replaceAll('Parent sign-in', 'Preview saves')
          .replaceAll('Guest · saved on this device', 'V5 preview · local saves only')
          .replaceAll('Guest · saved locally', 'V5 preview · local saves only');
      }
    },
    transformIndexHtml(html) {
      return html.replace('<title>Tiny Siege · Defend the little kingdom</title>', '<title>Tiny Siege V5 Preview · Local saves only</title><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src &apos;self&apos;; script-src &apos;self&apos;; connect-src &apos;self&apos;; img-src &apos;self&apos; data: blob:; style-src &apos;self&apos; &apos;unsafe-inline&apos;; font-src &apos;self&apos; data:; object-src &apos;none&apos;; base-uri &apos;self&apos;; frame-src &apos;none&apos;">');
    },
    closeBundle() {
      const path = '.cache/v5-preview-dist/manifest.webmanifest';
      const manifest = JSON.parse(readFileSync(path, 'utf8'));
      Object.assign(manifest, { id: '/', scope: '/', start_url: '/', name: 'Tiny Siege V5 Preview', short_name: 'Siege Preview' });
      writeFileSync(path, JSON.stringify(manifest, null, 2));
      writeFileSync('.cache/v5-preview-dist/preview.json', JSON.stringify({pr:17, branch:'feature/v5-illustrated-ui-integration', commit, cloud:false, storage:'tiny-siege-v5-pr17-preview-e121297', base:'/'}, null, 2));
    }
  }]
});
