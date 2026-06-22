// bot.js
// Открывает headless Chromium, логинится через cookies, внедряет userscript.js
// (ваш скрипт авто-охоты) и держит страницу открытой заданное время.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL = process.env.GAME_URL || 'https://tiwar.ru/distshores/hunt';
// Сколько минут держать браузер открытым за один запуск.
// GitHub Actions free runner убивает job жёстко на 360 минутах (6 часов) —
// берём с запасом меньше, чтобы процесс завершился сам и чисто.
const RUN_MINUTES = parseInt(process.env.RUN_MINUTES || '340', 10);
// Раз в сколько минут просто проверяем/перезагружаем страницу как safety-net
// (на случай зависания сети, разрыва соединения и т.п.)
const RELOAD_EVERY_MINUTES = parseInt(process.env.RELOAD_EVERY_MINUTES || '30', 10);

function loadCookies() {
    const raw = process.env.COOKIES_JSON;
    if (!raw) {
        throw new Error(
            'Переменная COOKIES_JSON не задана. Добавьте секрет в репозитории ' +
            '(Settings -> Secrets and variables -> Actions -> New repository secret).'
        );
    }
    return JSON.parse(raw);
}

function loadUserscript() {
    return fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8');
}

async function enableSequentialFarm(page) {
    // Включаем нужные настройки скрипта в localStorage страницы,
    // т.к. localStorage не переносится через cookies — это отдельное хранилище.
    await page.evaluate(() => {
        const KEY = 'fadd_tiwar_settings';
        let s = {};
        try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
        s.autoSequentialFarm = true;
        localStorage.setItem(KEY, JSON.stringify(s));

        // Порядок задач в очереди — именно такой, как задано
        const CUSTOM_ORDER = [
            'clanrecruit', // Авто-набор в клан
            'clangreet',   // Авто-привет
            'mine',        // Авто-шахта
            'forge',       // Авто-кузница
            'cave',        // Авто-пещера
            'clandungeon', // Авто-подземелье
            'campaign',    // Авто-поход
            'career',      // Карьера
            'sage',        // Хижина мудреца
            'battles',     // Авто-заявки сражений
            'arena',       // Авто-арена
            'treasury',    // Авто-казна клана
            'undying'      // Авто-долина бессмертных
        ];
        localStorage.setItem('fadd_custom_order', JSON.stringify(CUSTOM_ORDER));

        // Всё, что НЕ входит в список выше (охота, лига, колизей, клан-задания)
        // — замораживаем, чтобы они не выполнялись и не мешали очереди.
        const ALL_TASKS = ['arena','mine','forge','hunt','cave','clandungeon','campaign','career','sage','battles','league','coliseum','treasury','undying','clanquest','clanrecruit','clangreet'];
        const frozen = ALL_TASKS.filter(t => !CUSTOM_ORDER.includes(t));
        localStorage.setItem('fadd_frozen_tasks', JSON.stringify(frozen));
    });
}

(async () => {
    console.log('[bot] Запуск, время:', new Date().toISOString());

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 900 }
    });

    await context.addCookies(loadCookies());

    const userscript = loadUserscript();
    // addInitScript выполняется на каждой новой странице/перезагрузке
    // до того, как игра успеет загрузиться — это аналог Tampermonkey.
    await context.addInitScript({ content: userscript });

    const page = await context.newPage();

    let lastActivityAt = Date.now();
    page.on('console', msg => {
        lastActivityAt = Date.now();
        console.log('[page]', msg.text());
    });
    // Игра иногда показывает confirm()/alert() — без обработчика такой диалог
    // блокирует JS на странице навечно. Автоматически подтверждаем любой диалог.
    page.on('dialog', async dialog => {
        console.log('[bot] Игровой диалог:', dialog.type(), '—', dialog.message());
        try {
            await dialog.accept();
        } catch (e) {
            console.log('[bot] Не удалось закрыть диалог:', e.message);
        }
    });
    // Необработанные JS-ошибки на странице (не через console.log) —
    // без этого они проходят незаметно, и цикл выглядит "молча зависшим"
    page.on('pageerror', err => {
        lastActivityAt = Date.now();
        console.log('[bot] PAGE ERROR:', err.message);
    });

    console.log('[bot] Открываю', GAME_URL);
    await page.goto(GAME_URL, { waitUntil: 'load' });

    await enableSequentialFarm(page);
    await page.reload({ waitUntil: 'load' });

    console.log('[bot] Страница загружена, скрипт внедрён. Работаю', RUN_MINUTES, 'минут.');
    lastActivityAt = Date.now();

    const endAt = Date.now() + RUN_MINUTES * 60 * 1000;
    const HANG_TIMEOUT_MS = 2 * 60 * 1000; // 2 минуты без единого console.log — считаем зависанием
    const CHECK_EVERY_MS = 15 * 1000;
    let lastPlannedReload = Date.now();

    while (Date.now() < endAt) {
        await page.waitForTimeout(CHECK_EVERY_MS);
        if (Date.now() >= endAt) break;

        const idleMs = Date.now() - lastActivityAt;
        const sincePlannedReload = Date.now() - lastPlannedReload;

        const needHangReload = idleMs >= HANG_TIMEOUT_MS;
        const needPlannedReload = sincePlannedReload >= RELOAD_EVERY_MINUTES * 60 * 1000;

        if (!needHangReload && !needPlannedReload) continue;

        try {
            if (needHangReload) {
                console.log('[bot]', new Date().toISOString(), '— страница не подавала признаков жизни', Math.round(idleMs / 1000), 'сек, перезагружаю');
            } else {
                console.log('[bot]', new Date().toISOString(), '— профилактическая перезагрузка страницы');
            }
            await page.reload({ waitUntil: 'load' });
            await enableSequentialFarm(page);
            lastActivityAt = Date.now();
            lastPlannedReload = Date.now();
        } catch (e) {
            console.log('[bot] Ошибка при перезагрузке:', e.message, '— пробую открыть страницу заново');
            try {
                await page.goto(GAME_URL, { waitUntil: 'load' });
                await enableSequentialFarm(page);
                await page.reload({ waitUntil: 'load' });
                lastActivityAt = Date.now();
                lastPlannedReload = Date.now();
            } catch (e2) {
                console.log('[bot] Не получилось переоткрыть страницу:', e2.message);
            }
        }
    }

    console.log('[bot] Время вышло, закрываю браузер. Следующий запуск подхватит GitHub Actions по расписанию.');
    await browser.close();
})().catch(err => {
    console.error('[bot] Критическая ошибка:', err);
    process.exit(1);
});
