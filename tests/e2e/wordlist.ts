/** Checks the word list browser: the answer key, readable outside a round. */
import { chromium } from 'playwright';
const SHOTS = '/tmp/claude-0/-home-user-Deutsch-wordle/50b1f210-a173-50bf-9767-4cb3334d7fe7/scratchpad/shots';
let failures = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });

// Reachable from the main menu, without starting a game.
check('the main menu offers the word list', await page.locator('.secondary-button').count() === 1);
await page.locator('.secondary-button').click();
await page.waitForSelector('[aria-label="Wortliste"]');

const count = (await page.locator('.grammar').first().textContent()) ?? '';
check('it lists every answer', count.includes('347 von 347'), count.trim());
check('rows render', await page.locator('.word-row').count() === 347,
  `${await page.locator('.word-row').count()} rows`);
check('a row shows the article with the noun',
  ((await page.locator('.word-row-word').allTextContents()).includes('die Tasse')));
await page.screenshot({ path: `${SHOTS}/12-wordlist.png` });

// Search, including the umlaut fold and the English gloss.
await page.locator('.search').fill('kase');
await page.waitForTimeout(150);
check('searching "kase" finds Käse without an umlaut',
  (await page.locator('.word-row-word').allTextContents()).some((t) => t.includes('Käse')));
await page.locator('.search').fill('train station');
await page.waitForTimeout(150);
check('searching the English gloss works',
  (await page.locator('.word-row-word').allTextContents()).some((t) => t.includes('Bahnhof')));
await page.locator('.search').fill('zzzzzz');
await page.waitForTimeout(150);
check('a query with no hits says so', await page.locator('.empty').count() === 1);
await page.locator('.search').fill('');
await page.waitForTimeout(150);

// Length filter.
await page.locator('.chip', { hasText: /^3$/ }).click();
await page.waitForTimeout(150);
const threes = await page.locator('.word-row').count();
check('filtering by length narrows the list', threes === 31, `${threes} three-letter words`);

// Detail view.
await page.locator('.word-row').first().click();
await page.waitForTimeout(200);
check('a word opens its full entry', await page.locator('.definition').count() === 1);
check('the entry shows the example sentence', await page.locator('.example').count() === 1);
check('the entry shows no win/loss result, because this is not a round',
  await page.locator('.result').count() === 0);
await page.screenshot({ path: `${SHOTS}/13-word-detail.png` });
await page.getByRole('button', { name: '← Zurück' }).click();
await page.waitForTimeout(200);
check('Zurück returns to the list', await page.locator('.word-row').count() === threes);

await page.getByRole('button', { name: 'Schließen' }).click();
await page.waitForSelector('.setup');
check('closing returns to the main menu', await page.locator('.setup').count() === 1);
check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();
console.log(failures === 0 ? '\nall checks passed\n' : `\n${failures} failed\n`);
process.exit(failures === 0 ? 0 : 1);
