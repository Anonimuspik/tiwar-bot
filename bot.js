const { chromium } = require('playwright');

const GAME_URL = process.env.GAME_URL;

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext();

  // cookies
  if (process.env.COOKIES_JSON) {
    try {
      const cookies = JSON.parse(process.env.COOKIES_JSON);
      await context.addCookies(cookies);
      console.log('Cookies loaded:', cookies.length);
    } catch (e) {
      console.log('Cookies error:', e.message);
    }
  }

  const page = await context.newPage();

  page.on('requestfailed', r => {
    console.log('FAILED:', r.url());
  });

  page.on('response', r => {
    if (r.url().includes('tiwar')) {
      console.log('RESP:', r.status(), r.url());
    }
  });

  console.log('Opening:', GAME_URL);

  try {
    await page.goto(GAME_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Current URL:', page.url());
    console.log('Title:', await page.title());

    await page.screenshot({ path: 'debug.png', fullPage: true });
    console.log('Screenshot saved: debug.png');

  } catch (e) {
    console.log('NAVIGATION ERROR:', e.message);

    await page.screenshot({ path: 'error.png', fullPage: true });
  }

  await browser.close();
})();
