import matter from 'gray-matter';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export function parseDate(input) {
  const text = String(input ?? '').trim();
  let year, month = 1, day = 1, precision;
  let match;
  if ((match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(text))) {
    year = +match[1]; month = +(match[2] || 1); day = +(match[3] || 1);
    precision = match[3] ? 'day' : match[2] ? 'month' : 'year';
  } else if ((match = /^(?:(\d{2})\/)?(\d{2})\/(\d{4})$/.exec(text))) {
    year = +match[3]; month = +match[2]; day = +(match[1] || 1);
    precision = match[1] ? 'day' : 'month';
  } else throw new Error(`Invalid date "${text}"; use YYYY, YYYY-MM, YYYY-MM-DD, MM/YYYY, or DD/MM/YYYY.`);
  const value = Date.UTC(year, month - 1, day);
  const date = new Date(value);
  if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Invalid calendar date "${text}".`);
  return { value, precision, text };
}

export function parseIdea(source, filename) {
  try {
    const { data, content } = matter(source);
    for (const field of ['title', 'track', 'category', 'starting_date']) if (!data[field] || !String(data[field]).trim()) throw new Error(`Missing required field: ${field}.`);
    if (!['Model architecture', 'Training methods', 'Agent systems'].includes(data.track)) throw new Error(`Unknown track "${data.track}".`);
    if (!['Mechanism', 'Practice', 'Capability landmark'].includes(data.category)) throw new Error(`Unknown category "${data.category}".`);
    const normalize = value => value instanceof Date ? value.toISOString().slice(0, 10) : value;
    const start = parseDate(normalize(data.starting_date));
    const end = data.ending_date ? parseDate(normalize(data.ending_date)) : null;
    if (end && data.category !== 'Practice') throw new Error('ending_date is only allowed for Practice ideas.');
    if (end && end.value < start.value) throw new Error('ending_date must not precede starting_date.');
    return { id: filename.replace(/\.md$/i, '').replaceAll('\\', '/'), title: String(data.title), track: data.track, category: data.category, start, end, body: content.trim() };
  } catch (error) { throw new Error(`${filename}: ${error.message}`); }
}

export async function loadIdeas(directory) {
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const file = join(path, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
    }
  }
  await walk(directory);
  const ideas = await Promise.all(files.sort().map(async file => parseIdea(await readFile(file, 'utf8'), relative(directory, file))));
  return ideas.sort((a, b) => a.start.value - b.start.value || a.id.localeCompare(b.id));
}

export function ideasPlugin(directory) {
  const id = '\0virtual:ideas';
  return {
    name: 'local-markdown-ideas',
    resolveId(source) { if (source === 'virtual:ideas') return id; },
    async load(source) { if (source === id) return `export default ${JSON.stringify(await loadIdeas(directory))};`; },
    configureServer(server) {
      server.watcher.add(directory);
      const refresh = file => {
        if (!relative(directory, file).startsWith('..') && file.endsWith('.md')) {
          const mod = server.moduleGraph.getModuleById(id);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
    },
  };
}
