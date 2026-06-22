const { chromium } = require('playwright');
const fs = require('fs');

const ACCOUNT_INDEX = parseInt(process.env.ACCOUNT_INDEX || '1', 10);

const ORDER_DEFAULT = [
  'clanrecruit','clangreet','mine','forge','cave',
  'clandungeon','campaign','career','sage','battles',
  'arena','treasury','undying'
];

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

const ACCOUNT_CONFIGS = {
  1: {
    name: 'Kaneki',
    cookiesEnv: 'COOKIES_JSON_1',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      ...BATTLES_ALL_ON,
    }
  },
  2: {
    name: 'Black Fly',
    cookiesEnv: 'COOKIES_JSON_2',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      ...BATTLES_ALL_ON,
    }
  }
};

(async () => {
  const config = ACCOUNT_CONFIGS[ACCOUNT_INDEX];

  if (!config) {
    console.error('Unknown account:', ACCOUNT_INDEX);
    process.exit(1);
  }

  console.log(`[bot] Start account ${config.name}`);

  const cookiesRaw = process.env[config.cookiesEnv];
  if (!cookiesRaw) {
    console.error('No cookies env:', config.cookiesEnv);
    process.exit(1);
  }

  const cookies = JSON.parse(cookiesRaw);

  const scriptContent = fs.readFileSync('userscript.js', 'utf8');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  await context.addCookies(cookies);

  const page = await context.newPage();

  page.on('console', msg =>
    console.log(`[${config.name}]`, msg.text())
  );

  await page.goto('https://tiwar.ru/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.evaluate((cfg) => {
    const KEY = 'fadd_tiwar_settings';
    const merged = {
      ...JSON.parse(localStorage.getItem(KEY) || '{}'),
      ...cfg
    };
    localStorage.setItem(KEY, JSON.stringify(merged));
  }, config.settings);

  await page.addScriptTag({ content: scriptContent });

  const RUN_TIME = 5 * 60 * 60 * 1000;
  await new Promise(r => setTimeout(r, RUN_TIME));

  await browser.close();
})();
