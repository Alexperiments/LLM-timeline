import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDate, parseIdea, loadIdeas, ideasPlugin } from './ideas.mjs';
const document = (fields = '', body = 'A **short** lesson.') => `---\ntitle: Example\ntrack: Model architecture\ncategory: Mechanism\nstarting_date: "2023-06"\n${fields}---\n${body}`;

test('preserves approximate dates and accepts both ISO and slash notation', () => {
  assert.equal(parseDate('2023').precision, 'year');
  assert.equal(parseDate('06/2023').precision, 'month');
  assert.equal(parseDate('2023-06').value, parseDate('06/2023').value);
  assert.equal(parseDate('29/02/2024').value, Date.UTC(2024, 1, 29));
  assert.throws(() => parseDate('2023-02-29'), /Invalid calendar/);
  assert.throws(() => parseDate('2023-13'), /Invalid calendar/);
});

test('extracts lessons and gives actionable file-specific errors', () => {
  const idea = parseIdea(document(), 'test.md');
  assert.equal(idea.id, 'test');
  assert.equal(idea.start.precision, 'month');
  assert.equal(idea.body, 'A **short** lesson.');
  assert.throws(() => parseIdea(document().replace('Model architecture', 'Unknown'), 'bad.md'), /bad.md: Unknown track/);
  assert.throws(() => parseIdea(document().replace('title: Example\n', ''), 'bad.md'), /bad.md: Missing required field: title/);
  assert.throws(() => parseIdea(document('ending_date: "2024"\n'), 'bad.md'), /only allowed for Practice/);
});

test('validates practice intervals and supports ongoing practices', () => {
  const practice = document().replace('Mechanism', 'Practice');
  assert.equal(parseIdea(practice, 'practice.md').end, null);
  assert.throws(() => parseIdea(practice.replace('---\nA', 'ending_date: "2020"\n---\nA'), 'bad.md'), /must not precede/);
});

test('fresh builds discover additions and removals, sort dates, and emit lesson content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-ideas-'));
  try {
    await writeFile(join(directory, 'one.md'), document());
    assert.equal((await loadIdeas(directory)).length, 1);
    await writeFile(join(directory, 'two.md'), document().replace('2023-06', '2020'));
    assert.deepEqual((await loadIdeas(directory)).map(idea => idea.id), ['two', 'one']);
    const plugin = ideasPlugin(directory);
    const output = await plugin.load(plugin.resolveId('virtual:ideas'));
    assert.match(output, /A \*\*short\*\* lesson/);
    await unlink(join(directory, 'one.md'));
    assert.deepEqual((await loadIdeas(directory)).map(idea => idea.id), ['two']);
    await writeFile(join(directory, 'bad.md'), document().replace('Mechanism', 'Invalid'));
    await assert.rejects(plugin.load(plugin.resolveId('virtual:ideas')), /bad.md: Unknown category/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
