/**
 * Drives a real round in Chromium: picks a length, plays a losing guess, then the
 * correct word, and checks the definition card. Today's daily answer is computed
 * with the same core functions the app uses, so the test knows what to type.
 *
 *   npx tsx tests/e2e/play.ts [baseUrl]
 */
import { chromium } from 'playwright';
import { dailyAnswer, answersOfLength, isoDate } from '../../src/core/select.js';
import type { Word } from '../../src/core/types.js';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173';
const SHOTS = '/tmp/claude-0/-home-user-Deutsch-wordle/50b1f210-a173-50bf-9767-4cb3334d7fe7/scratchpad/shots';

const read = (n: number) => JSON.parse(readFileSync(`src/data/words.${n}.json`, 'utf8')) as Word[];
const words: Word[] = [3, 4, 5, 6, 7, 8].flatMap(read);

const LENGTH = 5;
const answer = dailyAnswer(answersOfLength(words, LENGTH), isoDate(), LENGTH);

let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

console.log(`\nDeutsch-Wordle e2e — today's ${LENGTH}-letter daily answer is "${answer.display}"\n`);

await page.goto(BASE, { waitUntil: 'networkidle' });

// ── setup screen ──
check('setup screen renders', await page.locator('.setup h2').textContent() === 'Wie viele Buchstaben?');
const poolLabels = await page.locator('.length-option .pool').allTextContents();
check('all six lengths offered with pool sizes', poolLabels.length === 6, poolLabels.join(' '));
await page.screenshot({ path: `${SHOTS}/1-setup.png` });

// ── the start button: labelled, and tall enough to read ──
await page.getByRole('button', { name: /^5 Buchstaben/ }).click();
await page.getByRole('button', { name: 'Täglich' }).click();
const startButton = page.locator('.setup .primary');
check('the start button says Starten', (await startButton.textContent()) === 'Starten');
const startBox = await startButton.boundingBox();
check('the start button is a usable size', (startBox?.height ?? 0) >= 44 && (startBox?.width ?? 0) > 200,
  `${Math.round(startBox?.width ?? 0)}x${Math.round(startBox?.height ?? 0)}`);
await startButton.click();

const tiles = page.locator('.tile');
check('grid has attempts × length tiles', await tiles.count() === 6 * LENGTH, `${await tiles.count()} tiles`);
check('keyboard has 30 letter keys', await page.locator('.key[data-key]').count() === 30);

// ── a wrong guess scores and colours the keyboard ──
await page.keyboard.type('tasse');
await page.screenshot({ path: `${SHOTS}/2-typed.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(400);

const marked = await page.locator('.tile[data-mark]').count();
check('first guess is scored', marked === LENGTH, `${marked} tiles marked`);
const keyColoured = await page.locator('.key[data-state]').count();
check('keyboard picks up letter states', keyColoured > 0, `${keyColoured} keys coloured`);
await page.screenshot({ path: `${SHOTS}/3-scored.png` });

// ── a non-word must be rejected: this is what makes it a Wordle ──
await page.keyboard.type('xxxxx');
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
check('a non-word is rejected', await page.locator('.tile[data-mark]').count() === LENGTH,
  `${await page.locator('.tile[data-mark]').count()} marked tiles — a second row would mean it was accepted`);
check('the rejection is announced', ((await page.locator('.toast').textContent()) ?? '').includes('kenne ich nicht'));
check('the rejected guess keeps its letters for editing',
  (await page.locator('.row').nth(1).locator('.tile').allTextContents()).join('') === 'XXXXX');
for (let i = 0; i < LENGTH; i++) await page.keyboard.press('Backspace');

// ── a German first name must be rejected ──
await page.keyboard.type('bernd');
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
check('a German first name is rejected', await page.locator('.tile[data-mark]').count() === LENGTH,
  'Bernd is a name, not a word');
for (let i = 0; i < LENGTH; i++) await page.keyboard.press('Backspace');

// ── a real German word that is not an answer must be accepted ──
await page.keyboard.type('gehen');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
check('a real word that is not an answer is accepted', await page.locator('.tile[data-mark]').count() === LENGTH * 2,
  `${await page.locator('.tile[data-mark]').count()} marked tiles`);

// ── the umlaut dead key ──
await page.keyboard.press(';');
await page.keyboard.press('u');
const afterDead = await page.locator('.row').nth(2).locator('.tile').first().textContent();
check('dead key `;u` produces Ü', afterDead === 'Ü', `got ${afterDead}`);
for (let i = 0; i < 1; i++) await page.keyboard.press('Backspace');

// ── ss must stay ss, not become ß ──
await page.keyboard.type('ss');
const twoTiles = await page.locator('.row').nth(2).locator('.tile').allTextContents();
check('typing "ss" stays SS', twoTiles.slice(0, 2).join('') === 'SS', twoTiles.slice(0, 3).join(''));
await page.keyboard.press('Backspace');
await page.keyboard.press('Backspace');

// ── win the round ──
await page.keyboard.type(answer.lemma);
await page.keyboard.press('Enter');
await page.waitForSelector('.card-backdrop', { timeout: 4000 });

const card = page.locator('.card');
const headword = (await card.locator('.headword span').first().textContent()) ?? '';
const expectedHead = answer.article ? `${answer.article} ${answer.display}` : answer.display;
check('definition card shows the headword with its article', headword === expectedHead, headword);
check('card shows the German definition', (await card.locator('.definition').textContent()) === answer.definition_de);
check('card shows the English gloss', (await card.locator('.gloss').textContent()) === answer.definition_en);
check('card shows the example sentence', ((await card.locator('.example').textContent()) ?? '').includes(answer.example_de));
check('card shows the CEFR level', (await card.locator('.level').textContent()) === answer.level);
const inflection = (await card.locator('.inflection').textContent()) ?? '';
check('card shows the inflection line', inflection.length > 0, inflection);
await page.screenshot({ path: `${SHOTS}/4-card.png` });

// ── stats ──
await card.getByRole('button', { name: 'Statistik' }).click();
await page.waitForSelector('[aria-label="Statistik"]');
check('stats record the win', ((await page.locator('.stats-figures').textContent()) ?? '').includes('1'));
await page.screenshot({ path: `${SHOTS}/5-stats.png` });
await page.getByRole('button', { name: 'Schließen' }).click();

// ── the daily round cannot be replayed ──
await page.locator('.card-backdrop').first().click({ position: { x: 5, y: 5 } });
await page.waitForSelector('.setup');
await page.getByRole('button', { name: /^5 Buchstaben/ }).click();
await page.getByRole('button', { name: 'Täglich' }).click();
const startLabel = await page.locator('.setup .primary').textContent();
check('daily round is blocked after playing', startLabel === 'Heute schon gespielt', startLabel ?? '');

// ── giving up reveals the word, and takes two clicks ──
await page.locator('.length-option').first().click();          // 3 letters
await page.locator('.mode-option', { hasText: 'Üben' }).click();
await page.locator('.setup .primary').click();
await page.waitForSelector('.give-up');
check('the give-up control is offered during a round', await page.locator('.give-up').count() === 1);
await page.locator('.give-up').click();
check('one click only asks for confirmation',
  ((await page.locator('.give-up').textContent()) ?? '').includes('Wirklich'));
check('one click does not end the round', await page.locator('.card-backdrop').count() === 0);
await page.locator('.give-up').click();
await page.waitForSelector('.card-backdrop', { timeout: 4000 });
const givenUpCard = page.locator('.card');
check('giving up reveals the word', ((await givenUpCard.locator('.result').textContent()) ?? '').includes('Das Wort war'));
check('the revealed word has a definition',
  ((await givenUpCard.locator('.definition').textContent()) ?? '').length > 10);
await page.screenshot({ path: `${SHOTS}/8-gave-up.png` });
await givenUpCard.getByRole('button', { name: 'Statistik' }).click();
await page.waitForSelector('[aria-label="Statistik"]');
check('giving up counts as a played round', ((await page.locator('.stats-figures').textContent()) ?? '').includes('1'));
await page.getByRole('button', { name: 'Schließen' }).click();
await page.locator('.card-backdrop').first().click({ position: { x: 5, y: 5 } });
await page.waitForSelector('.setup');

// ── colour-blind palette + glyphs ──
await page.getByRole('button', { name: 'Einstellungen', exact: true }).click();
// Exact matching matters here: 'An' is a substring of 'Standard', and clicking that
// would silently reset the palette we just set.
await page.locator('.segmented button', { hasText: /^Farbenblind$/ }).click();
await page.locator('.segmented button', { hasText: /^An$/ }).first().click();
check('colour-blind palette applies', await page.locator('html').getAttribute('data-palette') === 'cb');
check('tile glyphs enabled', await page.locator('html').getAttribute('data-glyphs') === 'on');
await page.screenshot({ path: `${SHOTS}/6-settings.png` });
await page.getByRole('button', { name: 'Schließen' }).click();

// ── reload keeps the settings and resumes nothing finished ──
await page.reload({ waitUntil: 'networkidle' });
check('settings survive a reload', await page.locator('html').getAttribute('data-palette') === 'cb');

// A missing favicon is the one 404 the page is allowed to produce.
const realErrors = errors.filter((e) => !e.includes('favicon'));
check('no page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
