const { chromium } = require('playwright');
const fs = require('fs');

const ORDER_DEFAULT = [
  'clanrecruit','clangreet','mine','forge','cave',
  'clandungeon','campaign','career','sage','battles',
  'arena','treasury','undying'
];

const ORDER_ACC5 = [...ORDER_DEFAULT, 'clanquest'];

const BATTLES_ALL_ON = {
  battlesEnableUndying: true,
  battlesEnableClanfight: true,
  battlesEnableKing: true,
  battlesEnableAltars: true,
  battlesEnableClancoliseum: true,
  autoUndying: true,
  autoClanfight: true,
  autoKing: true,
  autoAltars: true,
};

const ACCOUNTS = [
  { id: 1, name: 'Kaneki', cookies: 'COOKIES_JSON_1', order: ORDER_DEFAULT, extra: BATTLES_ALL_ON },
  { id: 2, name: 'Black Fly', cookies: 'COOKIES_JSON_2', order: ORDER_DEFAULT, extra: BATTLES_ALL_ON },
  { id: 3, name: 'Tsukiyama', cookies: 'COOKIES_JSON_3', order: ORDER_DEFAULT, extra: BATTLES_ALL_ON },
  { id: 5, name: 'Вирус Б', cookies: 'COOKIES_JSON_5', order: ORDER_ACC5, extra: { ...BATTLES_ALL_ON, autoClanTasks: true } }
];

const scriptContent = fs.readFileSync('userscript.js', 'utf8');

async function runAccount(browser, acc) {
  const raw = process.env[acc.cookies];
  if (!raw) return;

  const cookies = JSON.parse(raw);

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  await context.addCookies(cookies);

  const page = await context.newPage();

  await page.goto('https://tiwar.ru/', { waitUntil: 'commit' });

  await page.evaluate((accData) => {
    const KEY = 'fadd_tiwar_settings';

    localStorage.setItem(KEY, JSON.stringify({
      ...JSON.parse(localStorage.getItem(KEY) || '{}'),
      autoSequentialFarm: true,
      sequentialOrder: accData.order,
      ...accData.extra
    }));
  }, acc);

  await page.addScriptTag({ content: scriptContent });

  return page;
}

async function runBatch(browser, batch) {
  return Promise.all(batch.map(acc => runAccount(browser, acc)));
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const CHUNK = 2;

  const pages = [];

  for (let i = 0; i < ACCOUNTS.length; i += CHUNK) {
    const batch = ACCOUNTS.slice(i, i + CHUNK);

    const result = await runBatch(browser, batch);
    pages.push(...result);

    // пауза чтобы не забить CPU
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('[bot] ALL ACCOUNTS RUNNING');

  const HEARTBEAT = 120000;

  setInterval(async () => {
    for (const page of pages) {
      if (!page) continue;
      try {
        await page.evaluate(() => window._fadd_alive === true);
      } catch {}
    }
  }, HEARTBEAT);

  await new Promise(r => setTimeout(r, 5 * 60 * 60 * 1000));

  await browser.close();
})();
