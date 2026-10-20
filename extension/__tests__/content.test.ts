import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const CONTENT = path.join(ROOT, 'extension', 'content.js');
const MANIFEST = path.join(ROOT, 'extension', 'manifest.json');

const content = readFileSync(CONTENT, 'utf8');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
  web_accessible_resources?: unknown;
  icons?: Record<string, string>;
};

// Toglie i commenti: le URL chrome-extension:// citate nella documentazione
// del fix non devono falsare il rilevamento.
const codeOnly = content
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');

describe('estensione: nessuna risorsa chrome-extension:// caricata nella pagina', () => {
  it('non usa chrome.runtime.getURL per costruire URL di icone', () => {
    expect(codeOnly).not.toContain('chrome.runtime.getURL');
    expect(codeOnly).not.toContain('chrome-extension://');
  });

  it('non assegna mai un src a un elemento <img> iniettato', () => {
    // Ogni <img> iniettata con src= verrebbe caricata dal contesto di
    // YouTube e fallirebbe con "Unsafe attempt to load URL".
    expect(codeOnly).not.toMatch(/\.src\s*=/);
  });

  it('costruisce l\'icona come SVG inline', () => {
    expect(codeOnly).toContain('function createResumariIcon(');
    expect(codeOnly).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    // La creazione avviene tramite DOMParser + importNode: l'SVG risulta è
    // ben formato, nel namespace giusto e immune alla Trusted Types policy
    // di YouTube (che bloccherebbe innerHTML).
    expect(codeOnly).toContain("new DOMParser().parseFromString(markup, 'image/svg+xml')");
    expect(codeOnly).toContain('document.importNode(root, true)');
    expect(codeOnly).not.toContain('innerHTML =');
  });

  it('usa l\'SVG in tutti i punti di iniezione (thumbnail, watch, canale, overlay)', () => {
    expect(codeOnly).toContain("createResumariIcon('resumari-thumb-icon')");
    expect(codeOnly).toContain("createResumariIcon('resumari-watch-icon')");
    expect(codeOnly).toContain("createResumariIcon('resumari-channel-icon')");
    expect(codeOnly).toContain("createResumariIcon('resumari-progress-logo')");
  });

  it('non espone più risorse web_accessible_resources', () => {
    // Non servono: la pagina non carica più risorse dell\'estensione.
    expect(manifest.web_accessible_resources).toBeUndefined();
  });
});

describe('estensione: icone del pacchetto', () => {
  it('le icone hanno le dimensioni dichiarate nel manifest e non sono file enormi', () => {
    const icons = manifest.icons ?? {};
    expect(Object.keys(icons).sort()).toEqual(['128', '16', '48']);

    for (const [size, file] of Object.entries(icons)) {
      const full = path.join(ROOT, 'extension', file);
      // Un PNG 1024x1024 pesava ~1 MB: il pacchetto dell'estensione
      // diventava 3 MB per tre icone identiche.
      expect(statSync(full).size).toBeLessThan(64 * 1024);
      expect(Number(size)).toBeGreaterThan(0);
    }
  });
});
