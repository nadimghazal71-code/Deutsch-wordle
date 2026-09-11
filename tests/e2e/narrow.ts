/** Checks the layout at 320px with an 8-letter grid — the binding constraint. */
import { chromium } from 'playwright';
const SHOTS = '/tmp/claude-0/-home-user-Deutsch-wordle/50b1f210-a173-50bf-9767-4cb3334d7fe7/scratchpad/shots';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
await page.goto(process.argv[2] ?? 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });

await page.getByRole('button', { name: /^8 Buchstaben/ }).click();
await page.locator('.mode-option', { hasText: 'Üben' }).click();
await page.locator('.setup .primary').click();
// The dead key, because a US-layout keyboard has no ö — see docs/ui-ux.md § 3.
await page.keyboard.type('br;otchen');

const overflow = await page.evaluate(() => ({
  bodyScrollWidth: document.body.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
console.log('320px viewport, 8-letter grid:');
console.log(`  body scrollWidth ${overflow.bodyScrollWidth} vs viewport ${overflow.clientWidth}`);
console.log(`  horizontal overflow: ${overflow.bodyScrollWidth > overflow.clientWidth ? 'YES — layout bug' : 'none'}`);

const tile = await page.locator('.tile').first().boundingBox();
const key = await page.locator('.key[data-key]').first().boundingBox();
console.log(`  tile ${tile?.width.toFixed(1)}px, key ${key?.width.toFixed(1)}px`);
await page.screenshot({ path: `${SHOTS}/7-narrow.png`, fullPage: true });
await browser.close();
process.exit(overflow.bodyScrollWidth > overflow.clientWidth ? 1 : 0);
