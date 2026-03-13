/**
 * Template catalog — parses index.xml from the draw.io templates directory.
 * Templates are static files in public/draw_io/templates/ with PNG thumbnails.
 */

export interface TemplateItem {
  id: string;
  url: string;       // relative path e.g. "basic/flowchart.xml"
  name: string;
  category: string;
  tags: string[];
  thumbnail: string;  // absolute path to PNG e.g. "/draw_io/templates/basic/flowchart.png"
}

const CATEGORY_MAP: Record<string, string> = {
  basic: 'Basic',
  business: 'Business',
  charts: 'Charts',
  cloud: 'Cloud',
  engineering: 'Engineering',
  flowcharts: 'Flowcharts',
  layout: 'Layout',
  maps: 'Mind Maps',
  network: 'Network',
  other: 'Other',
  software: 'Software',
  tables: 'Tables',
  uml: 'UML',
  venn: 'Venn & Spider',
  wireframes: 'Wireframes',
};

let cache: { templates: TemplateItem[]; categories: string[] } | null = null;

export async function fetchTemplates(): Promise<{ templates: TemplateItem[]; categories: string[] }> {
  if (cache) return cache;

  const res = await fetch('/draw_io/templates/index.xml');
  const text = await res.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const templates: TemplateItem[] = [];
  doc.querySelectorAll('template').forEach((el) => {
    const url = el.getAttribute('url') || '';
    if (!url) return;

    const rawName = el.getAttribute('name') || el.getAttribute('title') || '';
    const tags = (el.getAttribute('tags') || '').split(';').filter(Boolean);

    // Derive category from URL folder path
    const parts = url.split('/');
    const folder = parts[0];
    let category = CATEGORY_MAP[folder] || folder;
    if (folder === 'cloud' && parts.length > 2) {
      category = `Cloud (${parts[1].toUpperCase()})`;
    }

    const thumbnail = `/draw_io/templates/${url.replace('.xml', '.png')}`;
    const id = url.replace(/\.xml$/, '').replace(/\//g, '__');

    // Clean up display name
    const name = rawName
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || id;

    templates.push({ id, url, name, category, tags, thumbnail });
  });

  const catSet = new Set(templates.map((t) => t.category));
  const categories = ['All', ...Array.from(catSet).sort()];

  cache = { templates, categories };
  return cache;
}

export async function fetchTemplateXml(url: string): Promise<string> {
  const res = await fetch(`/draw_io/templates/${url}`);
  if (!res.ok) throw new Error(`Failed to fetch template: ${res.statusText}`);
  return res.text();
}
