const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL             = process.env.GAME_URL             || 'https://tiwar.ru/';
const RUN_MINUTES          = parseInt(process.env.RUN_MINUTES          || '340', 10);
const RELOAD_EVERY_MINUTES = parseInt(process.env.RELOAD_EVERY_MINUTES || '30',  10);

function loadCookies() {
    const raw = process.env.COOKIES_JSON;
    if (!raw) throw new Error('COOKIES_JSON не задана!');
    return JSON.parse(raw);
}

// ШАГ 1: выполняется ДО userscript — прописываем базовые настройки
const INIT_BEFORE = `
(function() {
    const KEY = 'fadd_tiwar_settings';
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) {}

    s.autoSequentialFarm        = true;
    s.autoUndying               = true;
    s.autoClanfight             = true;
    s.autoKing                  = true;
    s.autoAltars                = true;
    s.autoClancoliseum          = false;
    s.autoHunt1                 = false;
    s.autoMine                  = false;
    s.autoForge                 = false;
    s.autoCave                  = false;
    s.autoClanDungeon           = false;
    s.autoCampaign              = false;
    s.autoCareer                = false;
    s.autoAdventure             = false;
    s.battlesEnableUndying      = true;
    s.battlesEnableClanfight    = true;
    s.battlesEnableKing         = true;
    s.battlesEnableAltars       = true;
    s.battlesEnableClancoliseum = true;

    localStorage.setItem(KEY, JSON.stringify(s));

    // Порядок очереди — только нужные задачи
    const CUSTOM_ORDER = [
        'clanrecruit','clangreet','mine','forge','cave',
        'clandungeon','campaign','career','sage',
        'battles','arena','treasury','undying'
    ];
    localStorage.setItem('fadd_custom_order', JSON.stringify(CUSTOM_ORDER));

    // Замороженные — пишем сейчас, но initFadd() может их сбросить
    // Поэтому повторно зафиксируем ПОСЛЕ через патч ниже
    localStorage.setItem('fadd_frozen_tasks', JSON.stringify(['hunt','league','coliseum','clanquest']));

    console.log('[bot-init] pre-script настройки прописаны');
})();
`;

// ШАГ 2: выполняется ПОСЛЕ userscript — патчит initFadd чтобы frozen не сбрасывались
const INIT_AFTER = `
(function() {
    // Патчим оригинальный initFadd: после его выполнения
    // принудительно восстанавливаем замороженные задачи
    // Используем MutationObserver на <body> — он сработает когда DOM готов
    const FROZEN_ALWAYS = ['hunt', 'league', 'coliseum', 'clanquest'];

    function enforceFrozen() {
        try {
            const current = JSON.parse(localStorage.getItem('fadd_frozen_tasks') || '[]');
            const set = new Set(current);
            let changed = false;
            FROZEN_ALWAYS.forEach(t => {
                if (!set.has(t)) { set.add(t); changed = true; }
            });
            if (changed) {
                localStorage.setItem('fadd_frozen_tasks', JSON.stringify([...set]));
                console.log('[bot-patch] восстановили frozen:', [...set]);
            }
        } catch(e) {}
    }

    // Сразу после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // initFadd вызывается на DOMContentLoaded — ждём чуть позже
            setTimeout(enforceFrozen, 100);
            // И ещё раз через секунду на случай задержки
            setTimeout(enforceFrozen, 1000);
        });
    } else {
        setTimeout(enforceFrozen, 100);
        setTimeout(enforceFrozen, 1000);
    }

    // Дополнительно — перехватываем localStorage.setItem
    // чтобы frozen_tasks никогда не мог потерять нужные задачи
    const _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        if (key === 'fadd_frozen_tasks') {
            try {
                const arr = JSON.parse(value || '[]');
                const set = new Set(arr);
                FROZEN_ALWAYS.forEach(t => set.add(t));
                value = JSON.stringify([...set]);
            } catch(e) {}
        }
        return _origSet(key, value);
    };

    console.log('[bot-patch] перехват frozen_tasks активен');
})();
`;

(async () => {
    console.log('[bot] Запуск:', new Date().toISOString());

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 }
    });

    await context.addCookies(loadCookies());

    // Порядок addInitScript важен — выполняются по порядку регистрации
    await context.addInitScript({ content: INIT_BEFORE });
    await context.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8') });
    await context.addInitScript({ content: INIT_AFTER });

    const page = await context.newPage();
    page.on('console', msg => console.log('[page]', msg.text()));
    page.on('pageerror', err => console.error('[page-err]', err.message));

    console.log('[bot] Открываю', GAME_URL);
    await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });

    console.log('[bot] Работаю', RUN_MINUTES, 'минут.');
    const endAt = Date.now() + RUN_MINUTES * 60 * 1000;

    while (Date.now() < endAt) {
        const msLeft = endAt - Date.now();
        const waitMs = Math.min(RELOAD_EVERY_MINUTES * 60 * 1000, msLeft);
        await page.waitForTimeout(waitMs);
        if (Date.now() >= endAt) break;

        try {
            console.log('[bot]', new Date().toISOString(), '— перезагрузка');
            await page.reload({ waitUntil: 'load', timeout: 60000 });
        } catch (e) {
            console.log('[bot] Ошибка перезагрузки:', e.message);
            try {
                await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });
            } catch (e2) {
                console.log('[bot] Не получилось:', e2.message);
            }
        }
    }

    console.log('[bot] Время вышло, закрываю браузер.');
    await browser.close();
})().catch(err => {
    console.error('[bot] Критическая ошибка:', err);
    process.exit(1);
});
