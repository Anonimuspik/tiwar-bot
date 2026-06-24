// ==UserScript==
// @name          тестn
// @version      3.5
// @match        *://tiwar.ru/*
// @grant        GM_xmlhttpRequest
// @connect      archive.org
// @connect      catbox.moe
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('%c Made By RcKaneki (RcCode) v3.1 — arena/effshop задания Приключения ⚔️⚗️', 'color: gold; font-size: 24px; font-weight: bold');

    const SETTINGS_KEY = 'fadd_tiwar_settings';
    const SEQUENTIAL_STEP_KEY = 'fadd_sequential_farm_step';
    const SEQUENTIAL_LAST_KEY = 'fadd_sequential_farm_last';
    const TIMER_SCAN_ACTIVE_KEY = 'fadd_timer_scan_active';
    const TIMER_SCAN_INDEX_KEY = 'fadd_timer_scan_index';
    const SEQUENTIAL_COOLDOWN = 600;
    const SEQUENTIAL_DEFAULT_ORDER = ['arena', 'mine', 'forge', 'hunt', 'cave', 'clandungeon', 'campaign', 'career', 'sage', 'battles', 'league', 'coliseum', 'treasury', 'undying', 'clanquest', 'clanrecruit', 'clangreet'];
    const SEQUENTIAL_TASK_LABELS = {
        arena: 'Авто-арена',
        mine: 'Авто-шахта',
        forge: 'Авто-кузница',
        hunt: 'Авто-охота',
        cave: 'Авто-пещера',
        clandungeon: 'Авто-подземелье',
        campaign: 'Авто-поход',
        career: 'Карьера',
        sage: 'Хижина мудреца',
        battles: 'Авто-заявки сражений',
        league: 'Авто-лига (00:00)',
        coliseum: 'Авто-колизей',
        treasury: 'Авто-казна клана',
        undying: 'Авто-долина бессмертных',
        clanquest: 'Авто-клан задания',
        clanrecruit: 'Авто-набор в клан',
        clangreet: 'Авто-привет'
    };

    // Расписание Долины бессмертных (МСК): заходим в 9:59, 15:58, 21:58 и обновляем до начала боя
    const UNDYING_SCHEDULE_MSK = [
        { h: 9,  m: 59 },
        { h: 15, m: 58 },
        { h: 21, m: 58 },
    ];
    // Бои начинаются в 10:00, 16:00, 22:00 МСК
    const UNDYING_FIGHT_MSK = [
        { h: 10, m: 0 },
        { h: 16, m: 0 },
        { h: 22, m: 0 },
    ];
    const UNDYING_NAV_KEY  = 'fadd_undying_nav_last';
    const UNDYING_REF_KEY  = 'fadd_undying_ref_last';
    const UNDYING_MANA_KEY = 'fadd_undying_mana_done';
    const UNDYING_ATK_KEY  = 'fadd_undying_atk_last';

    // Страницы заявок сражений по порядку
    const BATTLE_PAGES = [
        { path: '/undying/',      url: 'https://tiwar.ru/undying/',      hrefPart: '/undying/enterGame/',    settingKey: 'battlesEnableUndying' },
        { path: '/clanfight/',    url: 'https://tiwar.ru/clanfight/',    hrefPart: '/clanfight/enterFight/', settingKey: 'battlesEnableClanfight' },
        { path: '/king/',         url: 'https://tiwar.ru/king/',         hrefPart: '/king/enterGame/',       settingKey: 'battlesEnableKing' },
        { path: '/altars/',       url: 'https://tiwar.ru/altars/',       hrefPart: '/altars/enterFight/',    settingKey: 'battlesEnableAltars' },
        { path: '/clancoliseum/', url: 'https://tiwar.ru/clancoliseum/?from=fights', hrefPart: '/clancoliseum/enterFight/', btnText: 'Подать заявку', settingKey: 'battlesEnableClancoliseum' },
    ];
    const BATTLES_STEP_KEY = 'fadd_battles_step';
    const BATTLES_LAST_KEY = 'fadd_battles_last';

    // ── Авто-набор в клан ────────────────────────────────────────────────────
    const CR_TARGET_KEY  = 'fadd_clanrecruit_target';
    const CR_COUNT_KEY   = 'fadd_clanrecruit_count';
    const CR_CHECKED_KEY = 'fadd_clanrecruit_checked';
    const CR_LAST_KEY    = 'fadd_clanrecruit_last';
    const CR_MIN_LEVEL   = 45;
    const CR_MAX_LEVEL   = 150;
    const CR_MIN_POWER   = 40000;
    const CR_BATCH_SIZE  = 5;

    // ── Авто-привет новичкам в чате клана ───────────────────────────────────
    const CG_CHAT_URL     = 'https://tiwar.ru/chat/clan/';
    const CG_GREETED_KEY  = 'fadd_clangreet_greeted';
    const CG_LAST_KEY     = 'fadd_clangreet_last';
    const CG_GREETED_MAX  = 300; // не храним список бесконечно
    const CG_PHRASES = [
        'привет, располагайся!',
        'привет! Добро пожаловать в клан',
        'рады видеть тебя в команде!',
        'хай, чувствуй себя как дома',
        'добро пожаловать, удачи в клане!',
        'привет! Не стесняйся, общайся с нами',
        'ну здравствуй, новый боец!',
        'привет-привет, заходи к нам почаще',
        'хеллоу, добро пожаловать на борт!',
        'привет! Удачи и хорошего фарма',
        'салют, добро пожаловать!',
        'привет! Рады что ты с нами',
        'здравствуй, боец! Удачи в сражениях',
        'хай! Главное — не теряться',
        'привет, новенький! Мы рады тебя видеть',
        'добро пожаловать! Здесь тебе понравится',
        'привет! Заходи, не стой у порога',
        'здарова! Добро пожаловать в нашу семью',
        'привет, воин! Будем рады твоей помощи в клане',
        'добро пожаловать в клан, удачного фарма!',
        'хай! Удачи тебе и побольше трофеев',
        'привет! Надеемся тебе у нас понравится',
        'рады приветствовать нового члена клана!',
        'привет! Клан рад пополнению',
        'здравствуй! Добро пожаловать к нам',
        'привет, новичок! Удачи в игре',
        'хай! Не стесняйся, мы дружные',
        'добро пожаловать! Клан рад тебя видеть',
        'привет! Пусть тебе сопутствует удача',
        'салют! Добро пожаловать в наш клан',
        'привет! Мы ждали тебя',
        'здравствуй, боец! Добро пожаловать',
        'хай! Ты попал в хороший клан',
        'добро пожаловать! Приятной игры',
        'привет! Надеемся на совместные победы',
        'рады видеть тебя в наших рядах!',
        'привет! Обживайся и не стесняйся',
        'здарова! Добро пожаловать, воин',
        'хай, новенький! Мы за тебя рады',
        'привет! Клан пополнился хорошим бойцом',
        'добро пожаловать! Фармить будем вместе',
        'привет! Удачи в подземельях и походах',
        'здравствуй! Будем рады совместным битвам',
        'хай! Скоро узнаешь все секреты клана',
        'добро пожаловать! Ты отличный выбор для клана',
        'привет! Пусть всё идёт по плану',
        'рады новому бойцу в клане!',
        'привет! Обустраивайся, мы рядом',
        'здарова! Ты теперь один из нас',
        'хай! Добро пожаловать, жди интересного',
        'привет, боец! Добро пожаловать в команду',
        'добро пожаловать! Желаем крутых побед',
        'привет! Надеемся, тебе у нас будет хорошо',
        'салют! Клан рад новому участнику',
        'здравствуй! Добро пожаловать, будем вместе фармить',
        'хай! Ты попал к отличным ребятам',
        'привет! Удачи тебе в нашем клане',
        'рады тебя видеть в нашем клане!',
        'привет! Ты теперь часть команды',
        'здарова, боец! Удачи и трофеев побольше',
        'хай! Клан рад тебя принять',
        'добро пожаловать! Будем сражаться вместе',
        'привет! Пусть враги трепещут',
        'здравствуй! Рады новому соратнику',
        'салют! Мы ждали именно тебя',
        'привет! Добро пожаловать, обживайся',
        'хай, воин! Клан рад тебя видеть',
        'добро пожаловать! Удачи в битвах',
        'привет! Надеемся на долгое сотрудничество',
        'рады, что ты выбрал наш клан!',
        'здарова! Добро пожаловать на борт',
        'привет! Ты попал в лучший клан',
        'хай! Рады тебя видеть в команде',
        'добро пожаловать! Желаем успехов',
        'привет, новичок! Добро пожаловать к нам',
        'здравствуй! Будем рады твоим победам',
        'салют! Добро пожаловать, воин',
        'привет! Мы всегда поможем',
        'хай! Пусть фарм будет щедрым',
        'добро пожаловать! Клан стал сильнее',
        'привет! Удачи в клане и за его пределами',
        'рады принять тебя в наши ряды!',
        'здарова! Хорошего тебе игрового опыта',
        'привет! Добро пожаловать, новый союзник',
        'хай! Клан становится лучше с каждым новым бойцом',
        'добро пожаловать! Желаем хорошего фарма',
        'привет! Рады видеть тебя в наших рядах',
        'здравствуй! Добро пожаловать, приятного фарма',
        'салют, боец! Удачи тебе в клане',
        'привет! Надеемся на совместные победы в рейдах',
        'хай! Ты вовремя, мы как раз набираем силу',
        'добро пожаловать! Пусть тебе везёт',
        'привет! Теперь нас стало больше',
        'рады новому союзнику в клане!',
        'здарова! Добро пожаловать, соратник',
        'привет! Клан рад усилению',
        'хай! Добро пожаловать, будь как дома',
        'добро пожаловать! Мы всегда поддержим',
        'привет! Удачи и побед тебе в клане',
        'здравствуй, новый член клана! Рады тебя видеть'
    ];

    // Страницы для сканирования таймеров и какие маркеры/задачи там проверять
    const TIMER_PAGES = [
        { task: 'clandungeon', url: 'https://tiwar.ru/clandungeon/', path: '/clandungeon', marker: 'ударов через' },
        { task: 'campaign',    url: 'https://tiwar.ru/campaign/',    path: '/campaign',    marker: 'Новый поход через' },
        { task: 'career',      url: 'https://tiwar.ru/career/',      path: '/career',      marker: 'Турнир откроется через' },
        { task: 'cave',        url: 'https://tiwar.ru/cave/',        path: '/cave',        marker: null }
    ];

    let settings = {
        autoCampaign: false,
        autoCareer: false,
        autoHunt1: false,
        autoForge: false,
        autoMine: false,
        autoCave: false,
        autoClanDungeon: false,
        autoSequentialFarm: false,
        sequentialOrder: [...SEQUENTIAL_DEFAULT_ORDER],
        sequentialIgnored: [],
        autoAdventure: false,
        battlesEnableUndying: true,
        battlesEnableClanfight: true,
        battlesEnableKing: true,
        battlesEnableAltars: true,
        battlesEnableClancoliseum: true,
        zow: { name: 'Билет', priority: 3 }
    };

    let isRunning = false;
    let lastActionTime = Date.now();
    let timerInitialized = false;

    window.addEventListener('DOMContentLoaded', () => {
        initFadd();
    });

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (saved) {
                let mergedOrder = Array.isArray(saved.sequentialOrder)
                    ? saved.sequentialOrder.filter(task => SEQUENTIAL_TASK_LABELS[task])
                    : settings.sequentialOrder;

                // Добавляем в конец любые новые задачи (например clanrecruit),
                // которых не было в старом сохранённом порядке пользователя
                SEQUENTIAL_DEFAULT_ORDER.forEach(task => {
                    if (!mergedOrder.includes(task)) {
                        mergedOrder = [...mergedOrder, task];
                    }
                });

                settings = {
                    ...settings,
                    ...saved,
                    sequentialOrder: mergedOrder
                };
            }
        } catch (e) {}
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    loadSettings();

    function setTaskCooldown(task, ms) {
        const readyAt = Date.now() + ms;
        localStorage.setItem(getTaskReadyKey(task), readyAt.toString());
        console.log(`[timer] ${task} готов через ${Math.round(ms / 1000)}с`);
    }

    function getMineClicks() {
        const header = document.querySelector('.ds-mine-header');
        if (!header) return 0;

        const box = header.querySelector('div[style*="border"]');
        if (!box) return 0;

        const text = (box.textContent || '').trim();
        const match = text.match(/(\d+)\s*\/\s*(\d+)/);
        if (!match) return 0;

        return parseInt(match[1], 10);
    }

    function createMenu() {
        if (document.getElementById('fadd-menu')) return;

        const menu = document.createElement('div');
        menu.id = 'fadd-menu';

        const savedPos  = JSON.parse(localStorage.getItem('fadd_menu_position') || '{}');
        const savedSize = JSON.parse(localStorage.getItem('fadd_menu_size') || '{}');

        function clamp(val, min, max) {
            return Math.max(min, Math.min(max, val));
        }

        let left = parseInt(savedPos.left || 20, 10);
        let top  = parseInt(savedPos.top  || 20, 10);

        menu.style.position = 'fixed';
        menu.style.background = 'linear-gradient(160deg,#0d0000 0%,#1a0000 60%,#0d0000 100%)';
        menu.style.color = '#ff3333';
        menu.style.border = '2px solid #8b0000';
        menu.style.borderRadius = '6px';
        menu.style.zIndex = '99999';
        menu.style.fontFamily = "'Palatino Linotype','Book Antiqua',Palatino,serif";
        menu.style.padding = '10px';
        menu.style.boxShadow = '0 0 28px #cc000099,0 0 6px #ff000044,inset 0 0 40px #1a000022';
        menu.style.overflow = 'hidden';
        menu.style.minWidth = '220px';
        menu.style.minHeight = '100px';
        if (savedSize.width)  menu.style.width  = savedSize.width;
        if (savedSize.height) menu.style.height = savedSize.height;

        menu.innerHTML = `
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');

#fadd-menu, #fadd-menu * {
    font-family: 'Cinzel', 'Palatino Linotype', Palatino, serif !important;
    box-sizing: border-box;
}
#fadd-menu label, #fadd-menu div, #fadd-menu span {
    color: #cc3333;
}
#fadd-menu a { color: #ff4444; text-decoration:none; }
#fadd-menu a:hover { color:#ff7777; text-shadow:0 0 6px #ff0000; }

/* Неоновые переключатели вместо чекбоксов */
#fadd-menu input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 34px;
    height: 18px;
    background: #1a0000;
    border: 1px solid #5c0000;
    border-radius: 10px;
    position: relative;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.25s, box-shadow 0.25s;
    vertical-align: middle;
}
#fadd-menu input[type="checkbox"]::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #5c0000;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: left 0.25s, background 0.25s, box-shadow 0.25s;
}
#fadd-menu input[type="checkbox"]:checked {
    background: #3a0000;
    border-color: #ff2222;
    box-shadow: 0 0 8px #ff000099, 0 0 3px #ff000066 inset;
}
#fadd-menu input[type="checkbox"]:checked::after {
    left: 18px;
    background: #ff2222;
    box-shadow: 0 0 6px #ff0000, 0 0 12px #ff000088;
}
#fadd-menu label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: #cc3333;
    font-size: 12px;
    margin-bottom: 4px;
}

/* Кнопки */
#fadd-menu button {
    background: linear-gradient(135deg,#1a0000,#2d0000);
    color: #cc3333;
    border: 1px solid #5c0000;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    padding: 3px 6px;
    transition: all 0.15s;
    font-family: 'Cinzel', serif !important;
}
#fadd-menu button:hover {
    background: linear-gradient(135deg,#3a0000,#5c0000);
    color: #ff5555;
    box-shadow: 0 0 8px #ff000066;
    border-color: #ff2222;
}

/* Скроллбар */
#fadd-menu ::-webkit-scrollbar { width:4px; }
#fadd-menu ::-webkit-scrollbar-track { background:#0d0000; }
#fadd-menu ::-webkit-scrollbar-thumb { background:#5c0000; border-radius:2px; }
</style>
<div id="fadd-drag" style="cursor:move;background:linear-gradient(90deg,#1a0000,#2d0000,#1a0000);padding:6px 5px;margin-bottom:8px;text-align:center;color:#ff3333;border-bottom:1px solid #5c0000;border-radius:4px;letter-spacing:2px;font-weight:bold;text-shadow:0 0 8px #ff000099;">
    💀 Made By RcKaneki (RcCode) 💀
    <div id="fadd-clock" style="font-size:13px;color:#ff6666;margin-top:2px;letter-spacing:1px;text-shadow:0 0 6px #ff000077;">--:--:--</div>
</div>
<div id="fadd-resize" style="position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:se-resize;z-index:100000;">
    <svg viewBox="0 0 16 16" width="16" height="16" style="display:block;opacity:0.6;">
        <line x1="4" y1="16" x2="16" y2="4" stroke="#ff2222" stroke-width="1.5"/>
        <line x1="8" y1="16" x2="16" y2="8" stroke="#ff2222" stroke-width="1.5"/>
        <line x1="12" y1="16" x2="16" y2="12" stroke="#ff2222" stroke-width="1.5"/>
    </svg>
</div>
<div id="fadd-content" style="overflow-y:auto;max-height:calc(100% - 70px);padding-right:2px;">

<div id="tab-buttons" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">
    <button data-tab="main">Главное</button>
    <button data-tab="distshores">Далекие берега</button>
    <button data-tab="clan">Мой клан</button>
    <button data-tab="battles">Авто сражения</button>
    <button data-tab="other">Автофарм</button>
    <button data-tab="adventure">🗺 Приключение</button>
    <button data-tab="utility">🔧 Другое</button>
    <button data-tab="music">🎵 Музыка</button>
</div>

<div id="tab-main" class="tab">
    <label>
        <input type="checkbox" id="auto-campaign">
        Авто-поход
    </label>

    <br><br>

    <label>
        <input type="checkbox" id="auto-career">
        Карьера
    </label>

    <br><br>

    <label>
        <input type="checkbox" id="auto-cave">
        Авто-пещера
    </label>
</div>
<div id="tab-distshores" class="tab" style="display:none;">

    <label>
        <input type="checkbox" id="auto-hunt1">
        Авто-охота
    </label>

    <br><br>

    <label>
        <input type="checkbox" id="auto-forge">
        Авто-кузница
    </label>

    <br><br>

    <label>
        <input type="checkbox" id="auto-mine">
        Авто-шахта
    </label>

    <br><br>

    <div>
        <button id="mine-toggle" style="width:100%;background:#1a0000;color:#cc3333;border:1px solid #5c0000;">
            ⚒ Приоритет шахты ▼
        </button>

        <div id="mine-panel" style="display:none;margin-top:8px;font-size:12px;"></div>
    </div>
</div>

<div id="tab-clan" class="tab" style="display:none;">
    <label>
        <input type="checkbox" id="auto-clandungeon">
        Авто-подземелье
    </label>
</div>

<div id="tab-battles" class="tab" style="display:none;">
    <div style="color:#ff3333;font-size:13px;font-weight:bold;margin-bottom:8px;">Авто сражения</div>
    <div style="font-size:11px;color:#773333;margin-bottom:10px;">Активные бои выполняются в порядке ближайшего по расписанию.</div>
    <label>
        <input type="checkbox" id="auto-undying">
        Авто-долина бессмертных
    </label>
    <br><br>
    <label>
        <input type="checkbox" id="auto-clanfight">
        Авто-клановый турнир
    </label>
    <br><br>
    <label>
        <input type="checkbox" id="auto-king">
        Авто-король бессмертных
    </label>
    <br><br>
    <label>
        <input type="checkbox" id="auto-altars">
        Авто-древние алтари
    </label>
    <br><br>
    <label>
        <input type="checkbox" id="auto-clancoliseum">
        Авто-клановый колизей
    </label>
    <br>
    <div style="font-size:10px;color:#553333;margin-top:6px;">За 1 мин до боя — подаёт заявку. В X:00:05 — входит в бой и сражается до конца.</div>
</div>

<div id="tab-other" class="tab" style="display:none;">
    <label title="Запускает включенные режимы по очереди, чтобы они не перебивали друг друга.">
        <input type="checkbox" id="auto-sequential-farm">
        Поочередный автофарм
    </label>
    <div style="margin-top:6px;font-size:11px;color:#ccc;max-width:210px;">
        Сам запускает выбранные пункты по порядку и пропускает те, где сейчас нет ходов/ресурсов.
    </div>
    <button id="sequential-order-toggle" style="width:100%;margin-top:8px;background:#1a0000;color:#cc3333;border:1px solid #5c0000;">
        🔃 Очередь автофарма ▼
    </button>
    <div id="sequential-order-panel" style="display:none;margin-top:8px;font-size:12px;">
        <div style="color:#773333;font-size:11px;margin-bottom:4px;">🔒 — заморожена, ▶️ — активна</div>
    </div>

</div>

<div id="tab-schedule" class="tab" style="display:none;">
    <div style="color:#ff3333;font-size:13px;font-weight:bold;margin-bottom:8px;">Расписание боёв</div>

    <div style="border:1px solid #3a0000;border-radius:4px;padding:8px;margin-bottom:10px;background:#0d0000;">
        <label style="margin-bottom:6px;">
            <input type="checkbox" id="notif-enabled">
            🔔 Уведомления о боях
        </label>
        <div id="notif-permission-warn" style="display:none;font-size:10px;color:#ff6633;margin-top:4px;">⚠ Нажми "Разрешить" в браузере</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
            <span style="font-size:11px;color:#884444;">За</span>
            <input type="number" id="notif-minutes" min="1" max="50" value="10"
                style="width:48px;background:#1a0000;color:#ff4444;border:1px solid #5c0000;border-radius:3px;padding:2px 4px;font-size:12px;text-align:center;">
            <span style="font-size:11px;color:#884444;">мин до боя</span>
        </div>
        <div style="font-size:10px;color:#553333;margin-top:4px;">от 1 до 50 минут</div>
        <div style="margin-top:8px;">
            <div style="font-size:11px;color:#884444;margin-bottom:4px;">🔊 Звук уведомления</div>
            <select id="notif-sound-select" style="width:100%;background:#1a0000;color:#ff4444;border:1px solid #5c0000;border-radius:3px;padding:3px 4px;font-size:11px;cursor:pointer;">
                <option value="oshiete">Oshiete Oshiete yo 🎵</option>
                <option value="beep">Стандартный пип</option>
            </select>
        </div>
        <button id="notif-test-btn" style="width:100%;margin-top:8px;background:#1a0000;color:#ff6633;border:1px solid #5c0000;padding:5px;font-size:11px;cursor:pointer;">
            🔔 Проверить уведомление
        </button>
    </div>

    <div id="all-schedule-list" style="font-size:12px;line-height:1.8;"></div>
</div>

<div id="tab-utility" class="tab" style="display:none;">
    <div style="color:#ff3333;font-size:13px;font-weight:bold;margin-bottom:10px;">🔧 Другое</div>

    <label style="font-size:12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;">
        <input type="checkbox" id="utility-hide-images-toggle">
        🖼 Убрать изображения
    </label>
    <div style="font-size:10px;color:#553333;margin-bottom:12px;">Скрывает все /images/ кроме /images/icon/</div>

    <label style="font-size:12px;display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;">
        <input type="checkbox" id="utility-bg-toggle">
        🩸 Новый фон
    </label>
    <div style="font-size:10px;color:#553333;margin-bottom:12px;">Красит фон сайта в стиль меню</div>

    <button id="utility-clear-cache" style="width:100%;background:#1a0000;color:#ff8844;border:1px solid #5c0000;padding:6px;font-size:12px;cursor:pointer;">
        🗑 Очистить кеш
    </button>
    <div style="font-size:10px;color:#553333;margin-top:4px;">Перезагрузка страницы без кеша (Ctrl+Shift+R)</div>

    <div id="utility-status" style="margin-top:10px;font-size:11px;color:#ff4444;display:none;"></div>
</div>

<div id="tab-music" class="tab" style="display:none;">
    <div style="color:#ff3333;font-size:13px;font-weight:bold;margin-bottom:8px;">🎵 Фоновая музыка</div>

    <!-- Название трека -->
    <div id="music-title" style="font-size:12px;color:#ff6666;text-align:center;margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">—</div>

    <!-- Прогресс-бар -->
    <div style="position:relative;height:6px;background:#2a0000;border-radius:3px;margin-bottom:4px;cursor:pointer;" id="music-progress-wrap">
        <div id="music-progress-fill" style="height:100%;width:0%;background:linear-gradient(90deg,#8b0000,#ff2222);border-radius:3px;pointer-events:none;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:10px;color:#553333;margin-bottom:8px;">
        <span id="music-time-cur">0:00</span>
        <span id="music-time-dur">0:00</span>
    </div>

    <!-- Кнопки управления -->
    <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:10px;">
        <button id="music-prev" title="Предыдущий" style="font-size:16px;padding:4px 8px;">⏮</button>
        <button id="music-play" title="Пауза/Играть" style="font-size:18px;padding:4px 10px;">▶</button>
        <button id="music-next" title="Следующий" style="font-size:16px;padding:4px 8px;">⏭</button>
    </div>

    <!-- Громкость -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <span style="font-size:11px;color:#884444;">🔊</span>
        <input type="range" id="music-volume" min="0" max="100" value="50"
            style="flex:1;accent-color:#cc3333;cursor:pointer;">
        <span id="music-volume-val" style="font-size:11px;color:#ff4444;width:28px;text-align:right;">50%</span>
    </div>

    <!-- Плейлист -->
    <div style="font-size:11px;color:#773333;margin-bottom:4px;">Плейлист</div>
    <div id="music-playlist" style="font-size:11px;line-height:1.9;max-height:120px;overflow-y:auto;"></div>
</div>
</div>`;

        (document.body || document.documentElement).appendChild(menu);

        setTimeout(() => {
            const rect = menu.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;

            left = clamp(left, 0, maxX);
            top = clamp(top, 0, maxY);

            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }, 0);

        const tabButtons = menu.querySelectorAll('#tab-buttons button');

        function showTab(tab) {
            localStorage.setItem('fadd_active_tab', tab);

            menu.querySelectorAll('.tab').forEach(el => {
                el.style.display = 'none';
            });

            const activeTab = menu.querySelector('#tab-' + tab);
            if (activeTab) {
                activeTab.style.display = 'block';
            }
        }

        const savedTab = localStorage.getItem('fadd_active_tab') || 'distshores';
        showTab(savedTab);

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                showTab(btn.dataset.tab);
            });
        });

        const drag = menu.querySelector('#fadd-drag');
        const hunt = menu.querySelector('#auto-hunt1');
        const forge = menu.querySelector('#auto-forge');
        const mine = menu.querySelector('#auto-mine');
        const cave = menu.querySelector('#auto-cave');
        const clanDungeon = menu.querySelector('#auto-clandungeon');
        const undying = menu.querySelector('#auto-undying');
        const clanfight = menu.querySelector('#auto-clanfight');
        const king = menu.querySelector('#auto-king');
        const altars = menu.querySelector('#auto-altars');
        const clancoliseum = menu.querySelector('#auto-clancoliseum');
        const campaign = menu.querySelector('#auto-campaign');
        const career = menu.querySelector('#auto-career');
        const sequentialFarm = menu.querySelector('#auto-sequential-farm');

        campaign.checked = settings.autoCampaign;
        career.checked = settings.autoCareer;
        hunt.checked = settings.autoHunt1;
        forge.checked = settings.autoForge;
        mine.checked = settings.autoMine;
        cave.checked = settings.autoCave;
        clanDungeon.checked = settings.autoClanDungeon;
        if (undying) undying.checked = settings.autoUndying || false;
        if (clanfight) clanfight.checked = settings.autoClanfight || false;
        if (king) king.checked = settings.autoKing || false;
        if (altars) altars.checked = settings.autoAltars || false;
        if (clancoliseum) clancoliseum.checked = settings.autoClancoliseum || false;
        sequentialFarm.checked = settings.autoSequentialFarm;

        bindCheckbox(campaign, 'autoCampaign');
        bindCheckbox(career, 'autoCareer');
        bindCheckbox(hunt, 'autoHunt1');
        bindCheckbox(forge, 'autoForge');
        bindCheckbox(mine, 'autoMine');
        bindCheckbox(cave, 'autoCave');
        bindCheckbox(clanDungeon, 'autoClanDungeon');
        bindCheckbox(undying, 'autoUndying');
        bindCheckbox(clanfight, 'autoClanfight');
        bindCheckbox(king, 'autoKing');
        bindCheckbox(altars, 'autoAltars');
        bindCheckbox(clancoliseum, 'autoClancoliseum');
        bindCheckbox(sequentialFarm, 'autoSequentialFarm', () => {
            localStorage.setItem(SEQUENTIAL_STEP_KEY, getSequentialOrder()[0] || 'mine');
            localStorage.setItem(SEQUENTIAL_LAST_KEY, '0');
        });

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        if (drag) {
            drag.addEventListener('mousedown', (e) => {
                isDragging = true;
                offsetX = e.clientX - menu.offsetLeft;
                offsetY = e.clientY - menu.offsetTop;
            });
        }

        // ── RESIZE ──────────────────────────────────────────────────────────
        let isResizing = false;
        let resizeStartX = 0, resizeStartY = 0;
        let resizeStartW = 0, resizeStartH = 0;

        const resizeHandle = menu.querySelector('#fadd-resize');
        if (resizeHandle) {
            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizing = true;
                resizeStartX = e.clientX;
                resizeStartY = e.clientY;
                resizeStartW = menu.offsetWidth;
                resizeStartH = menu.offsetHeight;
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                menu.style.left = (e.clientX - offsetX) + 'px';
                menu.style.top = (e.clientY - offsetY) + 'px';
            }
            if (isResizing) {
                const newW = Math.max(220, resizeStartW + (e.clientX - resizeStartX));
                const newH = Math.max(100, resizeStartH + (e.clientY - resizeStartY));
                menu.style.width  = newW + 'px';
                menu.style.height = newH + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                localStorage.setItem('fadd_menu_position', JSON.stringify({
                    left: menu.style.left,
                    top: menu.style.top
                }));
            }
            if (isResizing) {
                localStorage.setItem('fadd_menu_size', JSON.stringify({
                    width:  menu.style.width,
                    height: menu.style.height
                }));
            }
            isDragging = false;
            isResizing = false;
        });

        const toggle = document.getElementById('mine-toggle');
        const panel = document.getElementById('mine-panel');

        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
            });
        }

        const sequentialOrderToggle = document.getElementById('sequential-order-toggle');
        const sequentialOrderPanel = document.getElementById('sequential-order-panel');
        if (sequentialOrderToggle && sequentialOrderPanel) {
            sequentialOrderToggle.addEventListener('click', () => {
                sequentialOrderPanel.style.display = sequentialOrderPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        const battlesApplyToggle = document.getElementById('battles-apply-toggle');
        const battlesApplyPanel = document.getElementById('battles-apply-panel');
        if (battlesApplyToggle && battlesApplyPanel) {
            battlesApplyToggle.addEventListener('click', () => {
                battlesApplyPanel.style.display = battlesApplyPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        const battlesApplyKing = menu.querySelector('#battles-apply-king');
        const battlesApplyAltars = menu.querySelector('#battles-apply-altars');
        const battlesApplyClanfight = menu.querySelector('#battles-apply-clanfight');
        const battlesApplyClancoliseum = menu.querySelector('#battles-apply-clancoliseum');
        const battlesApplyUndying = menu.querySelector('#battles-apply-undying');

        if (battlesApplyKing) battlesApplyKing.checked = settings.battlesEnableKing !== false;
        if (battlesApplyAltars) battlesApplyAltars.checked = settings.battlesEnableAltars !== false;
        if (battlesApplyClanfight) battlesApplyClanfight.checked = settings.battlesEnableClanfight !== false;
        if (battlesApplyClancoliseum) battlesApplyClancoliseum.checked = settings.battlesEnableClancoliseum !== false;
        if (battlesApplyUndying) battlesApplyUndying.checked = settings.battlesEnableUndying !== false;

        bindCheckbox(battlesApplyKing, 'battlesEnableKing');
        bindCheckbox(battlesApplyAltars, 'battlesEnableAltars');
        bindCheckbox(battlesApplyClanfight, 'battlesEnableClanfight');
        bindCheckbox(battlesApplyClancoliseum, 'battlesEnableClancoliseum');
        bindCheckbox(battlesApplyUndying, 'battlesEnableUndying');

        buildMinePanel();

        // Если скан уже идёт — показать статус
        updateTimerScanStatusUI();

        // Запускаем часы Киева в шапке
        startClock();
        // Запускаем тикер расписания
        startScheduleTicker();
    }

    function updateTimerScanStatusUI() {
        const statusEl = document.getElementById('timer-scan-status');
        if (!statusEl) return;

        if (localStorage.getItem(TIMER_SCAN_ACTIVE_KEY) === '1') {
            const idx = parseInt(localStorage.getItem(TIMER_SCAN_INDEX_KEY) || '0', 10);
            const page = TIMER_PAGES[idx];
            statusEl.style.display = 'block';
            statusEl.textContent = page
                ? `⏳ Проверяем: ${page.task} (${idx + 1}/${TIMER_PAGES.length})`
                : '✅ Проверка завершена';
        } else {
            statusEl.style.display = 'none';
        }
    }

    function bindCheckbox(input, key, afterChange) {
        if (!input) return;

        input.addEventListener('change', function() {
            settings[key] = this.checked;
            saveSettings();

            if (afterChange) {
                afterChange();
            }
        });
    }

    // ── Слоты приоритетов шахты ────────────────────────────────────────────────
    // 12 слотов по порядку: индекс 0 = копаем первым (самый ценный)
    // type: tnt | drill | ticket | bore | ore | gold | empty
    // clicks: сколько кликов стоит ячейка (из break-параметра: 0→1, 1→2, 2→3)

    const MINE_SLOTS_DEFAULT = [
        { type: 'tnt',    clicks: 1, label: 'Динамит 1кл'  },
        { type: 'drill',  clicks: 1, label: 'Бур 1кл'       },
        { type: 'ticket', clicks: 1, label: 'Билет 1кл'     },
        { type: 'ticket', clicks: 2, label: 'Билет 2кл'     },
        { type: 'bore',   clicks: 1, label: '150 меди 1кл'  },
        { type: 'ore',    clicks: 1, label: '50 меди 1кл'   },
        { type: 'bore',   clicks: 2, label: '150 меди 2кл'  },
        { type: 'ore',    clicks: 2, label: '50 меди 2кл'   },
        { type: 'gold',   clicks: 1, label: 'Золото 1кл'    },
        { type: 'gold',   clicks: 2, label: 'Золото 2кл'    },
        { type: 'dirt',   clicks: 1, label: 'Земля 1кл'     },
        { type: 'stone',  clicks: 2, label: 'Камень 2кл'    },
    ];

    function getMineSlots() {
        try {
            const saved = JSON.parse(localStorage.getItem('fadd_mine_slots') || 'null');
            if (Array.isArray(saved) && saved.length === MINE_SLOTS_DEFAULT.length) {
                return saved;
            }
        } catch (e) {}
        return MINE_SLOTS_DEFAULT.map(s => ({ ...s }));
    }

    function saveMineSlots(slots) {
        localStorage.setItem('fadd_mine_slots', JSON.stringify(slots));
    }

    function moveMineSlot(idx, dir) {
        const slots = getMineSlots();
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= slots.length) return;
        [slots[idx], slots[swapIdx]] = [slots[swapIdx], slots[idx]];
        saveMineSlots(slots);
        buildMinePanel();
    }

    // Определяет тип ячейки по src img
    function getMineType(el) {
        const img = el.querySelector('img');
        const src = (img?.getAttribute('src') || img?.src || '').toLowerCase();
        if (src.includes('tnt.png'))    return 'tnt';
        if (src.includes('drill.png'))  return 'drill';
        if (src.includes('ticket.png')) return 'ticket';
        if (src.includes('bore.png'))   return 'bore';
        if (src.includes('ore.png'))    return 'ore';
        if (src.includes('gold.png'))   return 'gold';
        if (!img || src === '') {
            // Нет картинки — земля (1 клик) или камень (2 клика)
            const clicks = getMineClicksFromHref(el);
            return clicks >= 2 ? 'stone' : 'dirt';
        }
        return 'other';
    }

    // Определяет кол-во кликов ячейки из break= параметра href
    // break = base64("X:Y"), Y=0→1клик, Y=1→2клика, Y=2→3клика
    function getMineClicksFromHref(el) {
        const href = el.getAttribute('href') || '';
        const match = href.match(/[?&]break=([^&]+)/);
        if (!match) return 1;
        try {
            const decoded = atob(match[1]);
            const y = parseInt((decoded.split(':')[1] || '0'), 10);
            return y + 1;
        } catch (e) {
            return 1;
        }
    }

    // Возвращает приоритет ячейки (меньший индекс = выше приоритет = копать первым)
    function getMineTilePriority(el) {
        const type = getMineType(el);
        const clicks = getMineClicksFromHref(el);
        const slots = getMineSlots();
        // Точное совпадение тип+клики
        let idx = slots.findIndex(s => s.type === type && s.clicks === clicks);
        // Нет точного — берём по типу
        if (idx === -1) idx = slots.findIndex(s => s.type === type);
        return idx === -1 ? 9998 : idx;
    }

    function buildMinePanel() {
        const panel = document.getElementById('mine-panel');
        if (!panel) return;

        panel.innerHTML = '';

        const hint = document.createElement('div');
        hint.style.cssText = 'color:#773333;font-size:10px;margin-bottom:6px;';
        hint.textContent = '↑↓ — менять приоритет. Сверху = копать первым.';
        panel.appendChild(hint);

        const slots = getMineSlots();
        const btnStyle = 'background:#1a0000;color:#cc3333;border:1px solid #5c0000;border-radius:3px;padding:0 3px;cursor:pointer;font-size:11px;line-height:16px;';

        slots.forEach((slot, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;align-items:center;gap:3px;margin:2px 0;padding:2px 3px;background:#222;border-radius:3px;';

            const num = document.createElement('span');
            num.textContent = (idx + 1) + '.';
            num.style.cssText = 'color:#555;font-size:10px;min-width:16px;';

            const upBtn = document.createElement('button');
            upBtn.textContent = '↑';
            upBtn.style.cssText = btnStyle;
            upBtn.disabled = idx === 0;
            upBtn.style.opacity = idx === 0 ? '0.3' : '1';
            upBtn.addEventListener('click', () => moveMineSlot(idx, -1));

            const downBtn = document.createElement('button');
            downBtn.textContent = '↓';
            downBtn.style.cssText = btnStyle;
            downBtn.disabled = idx === slots.length - 1;
            downBtn.style.opacity = idx === slots.length - 1 ? '0.3' : '1';
            downBtn.addEventListener('click', () => moveMineSlot(idx, 1));

            const name = document.createElement('span');
            name.textContent = slot.label;
            name.style.cssText = 'flex:1;color:#ff2222;font-size:11px;';

            row.appendChild(num);
            row.appendChild(upBtn);
            row.appendChild(downBtn);
            row.appendChild(name);
            panel.appendChild(row);
        });
    }

    // ── Порядок задач (кастомный, хранится отдельно) ──────────────────────────

    function getCustomOrder() {
        try {
            const saved = JSON.parse(localStorage.getItem('fadd_custom_order') || 'null');
            if (Array.isArray(saved) && saved.length > 0) {
                // Оставляем только известные задачи из сохранённого порядка
                const valid = saved.filter(t => SEQUENTIAL_TASK_LABELS[t]);
                // Добавляем новые задачи которых ещё нет в сохранённом
                const missing = SEQUENTIAL_DEFAULT_ORDER.filter(t => !valid.includes(t));
                const result = [...valid, ...missing];
                // Если порядок изменился (новые задачи добавились) — сохраняем обновлённый
                if (missing.length > 0) {
                    localStorage.setItem('fadd_custom_order', JSON.stringify(result));
                }
                return result;
            }
        } catch (e) {}
        return [...SEQUENTIAL_DEFAULT_ORDER];
    }

    function saveCustomOrder(order) {
        localStorage.setItem('fadd_custom_order', JSON.stringify(order));
    }

    function moveTaskInOrder(task, direction) {
        const order = getCustomOrder();
        const idx = order.indexOf(task);
        if (idx < 0) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= order.length) return;
        // Меняем местами
        [order[idx], order[swapIdx]] = [order[swapIdx], order[idx]];
        saveCustomOrder(order);
        buildSequentialOrderPanel();
    }

    // ── Заморозка ──────────────────────────────────────────────────────────────

    function getFrozenTasks() {
        try {
            const saved = JSON.parse(localStorage.getItem('fadd_frozen_tasks') || '[]');
            return new Set(Array.isArray(saved) ? saved : []);
        } catch (e) {
            return new Set();
        }
    }

    function setTaskFrozen(task, frozen) {
        const set = getFrozenTasks();
        if (frozen) {
            set.add(task);
        } else {
            set.delete(task);
        }
        localStorage.setItem('fadd_frozen_tasks', JSON.stringify([...set]));
        buildSequentialOrderPanel();
    }

    // ── Панель очереди ─────────────────────────────────────────────────────────

    function buildSequentialOrderPanel() {
        const panel = document.getElementById('sequential-order-panel');
        if (!panel) return;

        panel.innerHTML = '';

        const hintEl = document.createElement('div');
        hintEl.style.cssText = 'color:#773333;font-size:10px;margin-bottom:6px;';
        hintEl.textContent = '↑↓ — порядок   🔒 — заморозить   ▶ — разморозить';
        panel.appendChild(hintEl);

        const order = getCustomOrder();
        const frozen = getFrozenTasks();

        order.forEach((task, idx) => {
            const isFrozen = frozen.has(task);
            const label = SEQUENTIAL_TASK_LABELS[task] || task;

            const row = document.createElement('div');
            row.style.cssText = [
                'display:flex',
                'align-items:center',
                'gap:3px',
                'margin:3px 0',
                'padding:3px 4px',
                'border-radius:4px',
                isFrozen ? 'opacity:0.4;background:#111;' : 'background:#222;'
            ].join(';');

            // Номер позиции
            const numEl = document.createElement('span');
            numEl.textContent = (idx + 1) + '.';
            numEl.style.cssText = 'color:#553333;font-size:10px;min-width:14px;';

            // Кнопки ↑ ↓
            const btnStyle = 'background:#1a0000;color:#cc3333;border:1px solid #5c0000;border-radius:3px;padding:0 4px;cursor:pointer;font-size:11px;line-height:16px;';

            const upBtn = document.createElement('button');
            upBtn.textContent = '↑';
            upBtn.title = 'Выше';
            upBtn.style.cssText = btnStyle;
            upBtn.disabled = idx === 0;
            upBtn.style.opacity = idx === 0 ? '0.3' : '1';
            upBtn.addEventListener('click', () => moveTaskInOrder(task, -1));

            const downBtn = document.createElement('button');
            downBtn.textContent = '↓';
            downBtn.title = 'Ниже';
            downBtn.style.cssText = btnStyle;
            downBtn.disabled = idx === order.length - 1;
            downBtn.style.opacity = idx === order.length - 1 ? '0.3' : '1';
            downBtn.addEventListener('click', () => moveTaskInOrder(task, 1));

            // Название
            const nameEl = document.createElement('span');
            nameEl.textContent = label;
            nameEl.style.cssText = [
                'flex:1',
                'font-size:12px',
                isFrozen ? 'text-decoration:line-through;color:#553333;' : 'color:#ff2222;'
            ].join(';');

            // Кнопка заморозки
            const freezeBtn = document.createElement('button');
            freezeBtn.textContent = isFrozen ? '▶' : '🔒';
            freezeBtn.title = isFrozen ? 'Разморозить' : 'Заморозить';
            freezeBtn.style.cssText = [
                'background:' + (isFrozen ? '#1a3a1a' : '#3a1a1a'),
                'color:' + (isFrozen ? '#0f0' : '#f88'),
                'border:1px solid #555',
                'border-radius:3px',
                'padding:1px 5px',
                'cursor:pointer',
                'font-size:12px'
            ].join(';');
            freezeBtn.addEventListener('click', () => setTaskFrozen(task, !isFrozen));

            row.appendChild(numEl);
            row.appendChild(upBtn);
            row.appendChild(downBtn);
            row.appendChild(nameEl);
            row.appendChild(freezeBtn);
            panel.appendChild(row);
        });
    }

    function forceClick(element) {
        if (!element) return false;

        lastActionTime = Date.now();
        const rect = element.getBoundingClientRect();
        const x = rect.left + (rect.width / 2);
        const y = rect.top + (rect.height / 2);

        const evOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y };

        try {
            ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(type => {
                let ev;
                try {
                    ev = new PointerEvent(type, Object.assign({}, evOpts, { pointerId: 1, isPrimary: true }));
                } catch (_) {
                    ev = new MouseEvent(type, evOpts);
                }
                element.dispatchEvent(ev);
            });
        } catch (e) {
            try {
                ['mousedown', 'mouseup', 'click'].forEach(type => {
                    element.dispatchEvent(new MouseEvent(type, evOpts));
                });
            } catch (_) {}
        }

        try { element.click(); } catch (_) {}
        console.log('✅ fadd нажал кнопку:', (element.textContent || '').trim().substring(0, 40));
        return true;
    }

    function findGameButton(texts, hrefPattern = null) {
        const elements = Array.from(document.querySelectorAll('a, button, input[type="button"], input[type="submit"], div.btn'));

        if (hrefPattern) {
            const perfectMatch = elements.find(el => {
                const txt = (el.textContent || el.value || '').trim();
                const href = el.getAttribute('href') || el.href || '';
                return texts.some(t => txt.toLowerCase().includes(t.toLowerCase())) && href.toLowerCase().includes(hrefPattern.toLowerCase());
            });
            if (perfectMatch) return perfectMatch;
        }

        return elements.find(el => {
            if (el.closest('.header') || el.closest('#header') || el.textContent.includes('41358')) return false;
            const txt = (el.textContent || el.value || '').trim();
            return texts.some(t => txt.toLowerCase().includes(t.toLowerCase()));
        });
    }

    function checkNeedHeal() {
        const mySide = document.querySelector('.bf_left');
        if (mySide) {
            const hpBar = mySide.querySelector('.rate.fl');
            if (hpBar) {
                const styleWidth = hpBar.getAttribute('style') || '';
                const widthMatch = styleWidth.match(/width:\s*(\d+)%/);
                if (widthMatch) {
                    const percent = parseInt(widthMatch[1], 10);
                    console.log(`[fadd] Текущее здоровье по полоске: ${percent}%`);

                    if (percent > 0 && percent <= 20) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function runDistshores(now, url) {
        if (!url.includes('distshores')) return;

        // Если уже идёт бой с монстром (страница mfight, есть кнопка атаки/завершения боя
        // или блок боя) — не трогаем меню "Охота", иначе скрипт выйдет из боя вместо атаки
        const inMonsterFight =
            url.includes('/mfight') ||
            document.querySelector('.block_fight') ||
            document.querySelector('.exp_bar') ||
            findGameButton(['Атаковать монстра'], '/mfight/attack');
        if (inMonsterFight) return;

        const huntBtn = findGameButton(['Охота']);
        if (huntBtn) {
            const last = parseInt(localStorage.getItem('ds_hunt') || '0', 10);
            if (now - last > 1000) {
                localStorage.setItem('ds_hunt', now);
                forceClick(huntBtn);
                return;
            }
        }

        const reconBtn = findGameButton(['Разведка за 1', 'Разведка']);
        if (reconBtn) {
            const last = parseInt(localStorage.getItem('ds_recon') || '0', 10);
            if (now - last > 1000) {
                localStorage.setItem('ds_recon', now);
                forceClick(reconBtn);
                return;
            }
        }

        const exitBtn = findGameButton(['Закончить бой']);
        if (exitBtn) {
            forceClick(exitBtn);
        }
    }

    function getCampaignAttempts() {
        const text = (document.body?.textContent || '').replace(/\s+/g, ' ').trim();
        const match = text.match(/Осталось походов:\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
    }

    function runCampaign(force = false) {
        if (!force && !settings.autoCampaign) return false;

        const url = window.location.href;

        if (!url.includes('/campaign')) {
            window.location.href = 'https://tiwar.ru/campaign/';
            return true;
        }

        const bodyText = document.body?.textContent || '';

        if (bodyText.includes('Новый поход через')) {
            rememberCooldownFromText('campaign', 'Новый поход через');
            return false;
        }

        const attempts = getCampaignAttempts();
        if (attempts !== null && attempts <= 0) {
            rememberCooldownFromText('campaign', 'Новый поход через');
            return false;
        }

        const rewardBtn = findGameButton(['Получить награду', 'Забрать награду']);
        if (rewardBtn) {
            const last = parseInt(localStorage.getItem('fadd_campaign_reward') || '0', 10);

            if (Date.now() - last > 1000) {
                localStorage.setItem('fadd_campaign_reward', Date.now().toString());
                forceClick(rewardBtn);
            }
            return true;
        }

        const backBtn = findGameButton(['Вернуться в поход']);
        if (backBtn) {
            const last = parseInt(localStorage.getItem('fadd_campaign_back') || '0', 10);

            if (Date.now() - last > 1000) {
                localStorage.setItem('fadd_campaign_back', Date.now().toString());
                forceClick(backBtn);
            }
            return true;
        }

        const attackBtn = findGameButton(['Атаковать монстра'], '/campaign/attack');
        if (attackBtn) {
            const last = parseInt(localStorage.getItem('fadd_campaign_attack') || '0', 10);

            if (Date.now() - last > 400) {
                localStorage.setItem('fadd_campaign_attack', Date.now().toString());
                forceClick(attackBtn);
            }
            return true;
        }

        const fightBtn = findGameButton(['Начать бой'], '/campaign/fight');
        if (fightBtn) {
            forceClick(fightBtn);
            return true;
        }

        const startBtn = findGameButton(['Отправиться в поход'], '/campaign/go');
        if (startBtn) {
            forceClick(startBtn);
            return true;
        }

        return false;
    }

    function getSequentialOrder() {
        // Кастомный порядок минус замороженные
        const frozen = getFrozenTasks();
        return getCustomOrder().filter(task => !frozen.has(task));
    }

    function setSequentialStep(step) {
        localStorage.setItem(SEQUENTIAL_STEP_KEY, step);
    }

    function getSequentialStep() {
        const order = getSequentialOrder();
        const savedStep = localStorage.getItem(SEQUENTIAL_STEP_KEY);
        return order.includes(savedStep) ? savedStep : order[0];
    }

    function nextSequentialStep(step) {
        const order = getSequentialOrder();
        const index = order.indexOf(step);
        return order[(index + 1) % order.length] || order[0];
    }

    function getTaskReadyKey(task) {
        return 'fadd_' + task + '_ready_at';
    }

    function getTaskReadyAt(task) {
        return parseInt(localStorage.getItem(getTaskReadyKey(task)) || '0', 10);
    }

    function isTaskOnCooldown(task) {
        const readyAt = getTaskReadyAt(task);
        return readyAt > Date.now();
    }

    // ─── TIMER SCAN ────────────────────────────────────────────────────────────

    /**
     * Запускает обход страниц для считывания таймеров.
     * Вызывается по кнопке "Проверить таймеры".
     */
    function startTimerRefreshScan() {
        console.log('[timer-scan] запуск сканирования таймеров');
        localStorage.setItem(TIMER_SCAN_ACTIVE_KEY, '1');
        localStorage.setItem(TIMER_SCAN_INDEX_KEY, '0');
        updateTimerScanStatusUI();
        // Небольшая задержка чтобы UI успел обновиться
        setTimeout(() => {
            runTimerRefreshScan();
        }, 200);
    }

    /**
     * Вызывается каждый тик (runAutoHunt), пока TIMER_SCAN_ACTIVE_KEY === '1'.
     * Переходит на нужную страницу, читает таймер, сдвигает индекс.
     */
    function runTimerRefreshScan() {
        let index = parseInt(localStorage.getItem(TIMER_SCAN_INDEX_KEY) || '0', 10);

        if (isNaN(index) || index >= TIMER_PAGES.length) {
            // Сканирование завершено
            localStorage.removeItem(TIMER_SCAN_ACTIVE_KEY);
            localStorage.removeItem(TIMER_SCAN_INDEX_KEY);
            localStorage.setItem(SEQUENTIAL_STEP_KEY, getSequentialOrder()[0] || 'mine');
            localStorage.setItem(SEQUENTIAL_LAST_KEY, '0');
            updateTimerScanStatusUI();
            console.log('[timer-scan] проверка завершена');
            return;
        }

        const page = TIMER_PAGES[index];
        updateTimerScanStatusUI();

        // Если мы ещё не на нужной странице — переходим
        if (!window.location.href.includes(page.path)) {
            console.log(`[timer-scan] переходим на ${page.url}`);
            window.location.href = page.url;
            return;
        }

        // Мы на нужной странице — считываем таймер
        console.log(`[timer-scan] считываем таймер для ${page.task}`);
        refreshCurrentPageTimer(page);

        // Переходим к следующей странице
        localStorage.setItem(TIMER_SCAN_INDEX_KEY, (index + 1).toString());

        // Небольшая задержка перед следующим шагом (чтобы не флипать страницы мгновенно)
        setTimeout(() => {
            runTimerRefreshScan();
        }, 600);
    }

    /**
     * Считывает таймер на текущей странице и сохраняет cooldown для задачи.
     * @param {object} page — элемент из TIMER_PAGES
     */
    function refreshCurrentPageTimer(page) {
        if (!page) return;

        const task = page.task;

        // Особая логика для пещеры
        if (task === 'cave') {
            // Если таймера нет — сбрасываем кулдаун
            const found = rememberCaveTimer();
            if (!found) {
                localStorage.setItem(getTaskReadyKey(task), '0');
                console.log(`[timer-scan] cave: таймера нет, кулдаун сброшен`);
            }
            return;
        }

        // Для остальных — ищем маркер в тексте страницы
        if (page.marker) {
            const found = rememberCooldownFromText(task, page.marker);
            if (found) {
                console.log(`[timer-scan] таймер ${task} сохранён`);
            } else {
                // Маркер не найден — задача доступна, сбрасываем кулдаун
                localStorage.setItem(getTaskReadyKey(task), '0');
                console.log(`[timer-scan] ${task}: кулдауна нет, задача доступна`);
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────────

    function parseCooldownDuration(text) {
        if (!text) return 0;

        const normalized = text.replace(/\s+/g, ' ').trim();
        const clockMatch = normalized.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

        if (clockMatch) {
            const hours = parseInt(clockMatch[1], 10);
            const minutes = parseInt(clockMatch[2], 10);
            const seconds = parseInt(clockMatch[3] || '0', 10);
            return ((hours * 60 + minutes) * 60 + seconds) * 1000;
        }

        let ms = 0;
        const days = normalized.match(/(\d+)\s*(?:д|дн|день|дня|дней)/i);
        const hours = normalized.match(/(\d+)\s*(?:ч|час|часа|часов)/i);
        const minutes = normalized.match(/(\d+)\s*(?:м|мин|минута|минуты|минут)/i);
        const seconds = normalized.match(/(\d+)\s*(?:с|сек|секунда|секунды|секунд)/i);

        if (days) ms += parseInt(days[1], 10) * 86400000;
        if (hours) ms += parseInt(hours[1], 10) * 3600000;
        if (minutes) ms += parseInt(minutes[1], 10) * 60000;
        if (seconds) ms += parseInt(seconds[1], 10) * 1000;

        return ms;
    }

    function rememberCooldownFromText(task, marker) {
        const text = (document.body?.textContent || '').replace(/\s+/g, ' ').trim();
        // Если маркер не найден — кулдаун не активен, не парсить случайные числа
        if (!marker) return false;
        const markerIndex = text.toLowerCase().indexOf(marker.toLowerCase());
        if (markerIndex === -1) return false;
        const source = text.slice(markerIndex, markerIndex + 120);
        const duration = parseCooldownDuration(source);

        if (duration > 0) {
            setTaskCooldown(task, duration);
            return true;
        }

        return false;
    }

    function getForgeResource() {
        const resourceNode = document.querySelector('div[style*="right: 0"]');
        if (!resourceNode) return 0;

        return parseInt(resourceNode.textContent.replace(/\D/g, ''), 10) || 0;
    }

    function getHuntTickets() {
        const ticketBlock = Array.from(document.querySelectorAll('.block_zero, div'))
            .find(el => (el.textContent || '').includes('Билет охоты'));

        if (!ticketBlock) return null;

        const text = (ticketBlock.textContent || '').replace(/\s+/g, ' ').trim();
        const match = text.match(/Билет охоты:\s*(\d+)/i);

        return match ? parseInt(match[1], 10) : null;
    }

    function isAnyFightPage() {
        const url = window.location.href;
        return url.includes('/fight') || url.includes('/mfight') || url.includes('/coliseum') || document.querySelector('.block_fight') || document.querySelector('.life_bar');
    }

    function runSequentialFarm() {
        if (!document.body) return;

        const now = Date.now();
        const last = parseInt(localStorage.getItem(SEQUENTIAL_LAST_KEY) || '0', 10);

        if (now - last < SEQUENTIAL_COOLDOWN) return;

        localStorage.setItem(SEQUENTIAL_LAST_KEY, now.toString());

        const order = getSequentialOrder();
        const currentStep = getSequentialStep();
        let startIndex = order.indexOf(currentStep);
        if (startIndex < 0) startIndex = 0;

        for (let offset = 0; offset < order.length; offset++) {
            const task = order[(startIndex + offset) % order.length];

            const noCooldownTasks = ['campaign', 'career', 'clandungeon', 'battles', 'league', 'coliseum', 'treasury', 'clanrecruit', 'clangreet'];
            if (!noCooldownTasks.includes(task) && isTaskOnCooldown(task)) {
                console.log('[sequential-farm] пропуск по таймеру:', SEQUENTIAL_TASK_LABELS[task]);
                continue;
            }

            setSequentialStep(task);
            console.log('[sequential-farm] текущий шаг:', SEQUENTIAL_TASK_LABELS[task]);

            if (runSequentialTask(task)) {
                return;
            }

            setSequentialStep(nextSequentialStep(task));
        }

        console.log('[sequential-farm] все пункты очереди пока недоступны');
    }

    function runSequentialTask(task) {
        if (task === 'arena') return runArena(true);
        if (task === 'mine') return runSequentialMine();
        if (task === 'forge') return runSequentialForge();
        if (task === 'hunt') return runSequentialHunt();
        if (task === 'cave') return runSequentialCave();
        if (task === 'clandungeon') return runClanDungeon(true);
        if (task === 'campaign') return runCampaign(true);
        if (task === 'career') return runCareer(true);
        if (task === 'sage') return runSageQuests();
        if (task === 'battles') return runBattles(true);
        if (task === 'league') return runLeague(true);
        if (task === 'coliseum') return runColiseum(true);
        if (task === 'treasury') return runTreasury(true);
        if (task === 'undying') return runUndying(true);
        if (task === 'clanquest') return runClanQuest(true);
        if (task === 'clanrecruit') return runClanRecruit(true);
        if (task === 'clangreet') return runClanGreet(true);
        return false;
    }

    // ── АВТО-КЛАНОВЫЕ ЗАДАНИЯ ─────────────────────────────────────────────────

    const CQ_STEP_KEY   = 'fadd_cq_step';    // текущий шаг внутри задания
    const CQ_LAST_KEY   = 'fadd_cq_last';    // throttle — время последнего действия
    const CQ_COOLDOWN   = 1500;              // мс между действиями

    // Список заданий по порядку — номера quest id как на сайте
    const CQ_QUESTS = [
        { id: 1,  title: 'Гладиатор',           type: 'league',   needWin: false },
        { id: 2,  title: 'Легендарный гладиатор',type: 'league',   needWin: true  },
        { id: 3,  title: 'Воин арены',           type: 'arena',    needWin: false },
        { id: 4,  title: 'Легендарный воин арены',type: 'arena',   needWin: false },
        { id: 5,  title: 'Поиск ресурсов',       type: 'cave',     needWin: false },
        { id: 6,  title: 'Мастер турниров',      type: 'career',   needWin: false },
        { id: 7,  title: 'Алхимик',              type: 'alchemy',  needWin: false },
        { id: 8,  title: 'Старый лавочник',      type: 'merchant', needWin: false },
    ];

    /**
     * Разбирает прогресс задания из блока .block_light.center вверху страницы.
     * Возвращает { done, total } или null.
     */
    function parseClanQuestProgress() {
        const blocks = document.querySelectorAll('.block_light.center, .block_light');
        for (const b of blocks) {
            const m = (b.textContent || '').match(/Прогресс:\s*(\d+)\s*из\s*(\d+)/i);
            if (m) return { done: parseInt(m[1], 10), total: parseInt(m[2], 10) };
        }
        return null;
    }

    /**
     * Проверяет, есть ли кнопка "Получить награду" или "Забрать награду" с /quest/end/
     */
    function findClanQuestReward() {
        return Array.from(document.querySelectorAll('a.btn, a'))
            .find(a => {
                const href = a.getAttribute('href') || '';
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                return href.includes('/quest/end/') && (text.includes('Получить') || text.includes('Забрать'));
            });
    }

    /**
     * Ищет кнопку "Восстановить" с href /lab/wizard/potion/
     * (восстановление зелья мага для продолжения задания)
     */
    function findWizardPotionRestoreBtn() {
        return Array.from(document.querySelectorAll('a.btn'))
            .find(a => {
                const href = a.getAttribute('href') || '';
                const label = a.querySelector('.label');
                const text = label ? label.textContent.trim() : (a.textContent || '').replace(/\s+/g, ' ').trim();
                return href.includes('/lab/wizard/potion/') && text.includes('Восстановить');
            });
    }

    /**
     * Возвращает первое активное задание с кнопкой "Выполнить",
     * которую ещё не взяли (href /quest/take/).
     */
    function findClanQuestToTake() {
        return Array.from(document.querySelectorAll('a.btn'))
            .find(a => (a.getAttribute('href') || '').includes('/quest/take/'));
    }

    /**
     * Возвращает кнопку "Перейти к выполнению".
     */
    function findClanQuestGoBtn() {
        return Array.from(document.querySelectorAll('a.btn'))
            .find(a => (a.textContent || '').replace(/\s+/g, ' ').trim().includes('Перейти к выполнению'));
    }

    /**
     * Парсит слабейшего противника в лиге или на арене.
     * Ищет блоки с кнопкой "Атаковать" и суммирует статы.
     * hrefPart — '/league/fight/' или '/arena/attack/'
     */
    function findWeakestOpponent(hrefPart) {
        const blocks = Array.from(document.querySelectorAll('.block_zero'))
            .filter(b => b.querySelector(`a[href*="${hrefPart}"]`));

        if (!blocks.length) return null;

        function getStats(block) {
            const text = block.textContent || '';
            function stat(label) {
                const m = text.match(new RegExp(label + '[^\\d]*(\\d+)'));
                return m ? parseInt(m[1], 10) : 0;
            }
            const total = stat('Сила') + stat('Жизнь') + stat('Удача') + stat('Броня');
            const btn = block.querySelector(`a[href*="${hrefPart}"]`);
            return btn ? { total, btn } : null;
        }

        const parsed = blocks.map(getStats).filter(Boolean);
        if (!parsed.length) return null;
        parsed.sort((a, b) => a.total - b.total);
        return parsed[0].btn;
    }

    /**
     * Парсит лучший (дешевейший) вариант крафта алхимии или лавочника.
     * Оценка по "Доплата: X золота" — чем меньше, тем лучше.
     * Если нет доплаты — только ресурсов не хватает → берём по min нехватки.
     */
    function findCheapestCraftBtn(hrefPart) {
        const candidates = Array.from(document.querySelectorAll('.block_zero'))
            .map(block => {
                const btn = block.querySelector(`a[href*="${hrefPart}"]`);
                if (!btn) return null;
                const text = block.textContent || '';

                // Доплата (золото) — меньше значит лучше
                const surchargeMatch = text.match(/Доплата:\s*[^\d]*(\d+)/i);
                const surcharge = surchargeMatch ? parseInt(surchargeMatch[1], 10) : 0;

                // Кол-во не хватающих ресурсов (сумма)
                const shortages = [...text.matchAll(/Не хватает\s+(\d+)/gi)]
                    .reduce((sum, m) => sum + parseInt(m[1], 10), 0);

                return { btn, surcharge, shortages };
            })
            .filter(Boolean);

        if (!candidates.length) return null;

        // Сначала по нехватке (меньше — лучше), потом по доплате
        candidates.sort((a, b) => {
            if (a.shortages !== b.shortages) return a.shortages - b.shortages;
            return a.surcharge - b.surcharge;
        });

        return candidates[0].btn;
    }

    /**
     * Главная функция авто-клановых заданий.
     * Интегрируется в очередь через runSequentialTask('clanquest').
     */
    function runClanQuest(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // throttle
        const last = parseInt(localStorage.getItem(CQ_LAST_KEY) || '0', 10);
        if (now - last < CQ_COOLDOWN) return true;

        // ── 1. Страница клановых заданий ─────────────────────────────────────
        if (url.includes('/clan/') && url.includes('/quest') && !url.includes('/quest/take') && !url.includes('/quest/end')) {

            // Есть кнопка "Забрать награду" — жмём
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] забираем награду');
                forceClick(rewardBtn);
                return true;
            }

            // Кнопка "Восстановить" зелье мага — нажимаем если нет награды и нет задания на взятие
            const wizardPotionBtn = findWizardPotionRestoreBtn();
            if (wizardPotionBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] восстанавливаем зелье мага');
                forceClick(wizardPotionBtn);
                return true;
            }

            // Берём первое доступное задание
            const takeBtn = findClanQuestToTake();
            if (takeBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] берём задание:', takeBtn.href);
                forceClick(takeBtn);
                return true;
            }

            // Есть кнопка "Перейти к выполнению"
            const goBtn = findClanQuestGoBtn();
            if (goBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] переходим к выполнению');
                forceClick(goBtn);
                return true;
            }

            // Нет активных заданий — задача завершена для этого цикла
            console.log('[clanquest] нет активных заданий, пропуск');
            return false;
        }

        // ── 2. Страница лиги (/league/) ────────────────────────────────────
        if (url.includes('/league/')) {
            // Кнопка "Забрать награду"
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            // Кнопка "Восстановить" зелье мага (/lab/wizard/potion/)
            // Нажимаем только если нет кнопки получить/забрать награду
            const wizardPotionBtn = findWizardPotionRestoreBtn();
            if (wizardPotionBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] лига: восстанавливаем зелье мага');
                forceClick(wizardPotionBtn);
                return true;
            }

            // Прогресс выполнен?
            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                // Возвращаемся на страницу заданий
                console.log('[clanquest] лига: задание выполнено, идём за наградой');
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Кнопка восстановления боёв ("Восстановить за X")
            const restoreBtn = Array.from(document.querySelectorAll('a.btn'))
                .find(a => (a.getAttribute('href') || '').includes('/league/refreshFights/'));
            if (restoreBtn && prog && prog.done < prog.total) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] лига: восстанавливаем бои');
                forceClick(restoreBtn);
                return true;
            }

            // Атакуем самого слабого противника
            const weakest = findWeakestOpponent('/league/fight/');
            if (weakest) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] лига: атакуем слабейшего');
                window.location.href = 'https://tiwar.ru' + weakest.getAttribute('href');
                return true;
            }

            // Нет противников — возможно нет боёв, ждём
            console.log('[clanquest] лига: нет кнопок атаки');
            return true;
        }

        // ── 3. Страница арены (/arena/) ────────────────────────────────────
        if (url.includes('/arena/') && !url.includes('/lab/')) {
            // Кнопка "Забрать награду"
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            // Прогресс выполнен
            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Восстановление энергии/жизни
            const restoreHref = Array.from(document.querySelectorAll('a'))
                .map(a => a.getAttribute('href') || '')
                .find(h => h.includes('/lab/wizard/potion/') && h.includes('ref=/arena/'));
            if (restoreHref) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] арена: восстанавливаем энергию');
                window.location.href = 'https://tiwar.ru' + restoreHref;
                return true;
            }

            // Атакуем
            const attackHref = Array.from(document.querySelectorAll('a'))
                .map(a => a.getAttribute('href') || '')
                .find(h => /\/arena\/attack\//.test(h));
            if (attackHref) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] арена: атакуем');
                window.location.href = 'https://tiwar.ru' + attackHref;
                return true;
            }

            console.log('[clanquest] арена: нет кнопки атаки, ждём...');
            return true;
        }

        // ── 4. Страница пещеры (/cave/) ────────────────────────────────────
        if (url.includes('/cave/')) {
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Кнопка "Убежать" (/cave/runaway/) — убегаем, потом начнём новый поиск
            const runawayBtn = Array.from(document.querySelectorAll('a.btn'))
                .find(a => {
                    const href = a.getAttribute('href') || '';
                    const label = a.querySelector('.label');
                    const text = label ? label.textContent.trim() : (a.textContent || '').replace(/\s+/g, ' ').trim();
                    return href.includes('/cave/runaway/') && text.includes('Убежать');
                });
            if (runawayBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] пещера: убегаем');
                forceClick(runawayBtn);
                return true;
            }

            // Ускорить добычу
            const speedBtn = Array.from(document.querySelectorAll('a.btn'))
                .find(a => (a.textContent || '').includes('Ускорить за'));
            if (speedBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] пещера: ускоряем поиск');
                forceClick(speedBtn);
                return true;
            }

            // Новый поиск
            const newSearchBtn = Array.from(document.querySelectorAll('a'))
                .find(a => (a.getAttribute('href') || '').includes('/cave/down/'));
            if (newSearchBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] пещера: новый поиск');
                forceClick(newSearchBtn);
                return true;
            }

            console.log('[clanquest] пещера: ждём...');
            return true;
        }

        // ── 5. Страница карьеры (/career/) ────────────────────────────────
        if (url.includes('/career/')) {
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Кнопка "Открыть за X" (разблокировка нового турнира)
            const unlockBtn = Array.from(document.querySelectorAll('a'))
                .find(a => (a.getAttribute('href') || '').includes('/career/unblock/'));
            if (unlockBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] карьера: открываем турнир');
                forceClick(unlockBtn);
                return true;
            }

            // Атаковать X/5
            const attackBtn = Array.from(document.querySelectorAll('a,button'))
                .find(el => {
                    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
                    return t.includes('Атаковать') && /\d+\/5/.test(t);
                });
            if (attackBtn) {
                const matchUsed = (attackBtn.textContent || '').match(/(\d+)\/5/);
                const used = matchUsed ? parseInt(matchUsed[1], 10) : 0;
                if (used < 5) {
                    localStorage.setItem(CQ_LAST_KEY, now.toString());
                    console.log('[clanquest] карьера: атакуем', used, '/5');
                    forceClick(attackBtn);
                    return true;
                }
            }

            console.log('[clanquest] карьера: ждём следующего турнира');
            return true;
        }

        // ── 6. Страница алхимии (/lab/alchemy/) ───────────────────────────
        if (url.includes('/lab/alchemy/')) {
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Если мы уже на странице конкретного эликсира — жмём "Изготовить"
            const makeBtn = Array.from(document.querySelectorAll('a.btn'))
                .find(a => (a.getAttribute('href') || '').includes('/makePotion'));
            if (makeBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] алхимия: изготавливаем');
                forceClick(makeBtn);
                return true;
            }

            // Выбираем дешевейший эликсир из списка
            const cheapBtn = findCheapestCraftBtn('/lab/alchemy/');
            if (cheapBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] алхимия: выбираем дешевейший эликсир');
                window.location.href = 'https://tiwar.ru' + cheapBtn.getAttribute('href');
                return true;
            }

            console.log('[clanquest] алхимия: нет доступных эликсиров');
            window.location.href = 'https://tiwar.ru/clan/41140/quest/';
            return true;
        }

        // ── 7. Страница лавочника (/coliseum/merchant/) ───────────────────
        if (url.includes('/coliseum/merchant/')) {
            const rewardBtn = findClanQuestReward();
            if (rewardBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                forceClick(rewardBtn);
                return true;
            }

            const prog = parseClanQuestProgress();
            if (prog && prog.done >= prog.total) {
                window.location.href = 'https://tiwar.ru/clan/41140/quest/';
                return true;
            }

            // Если мы на /coliseum/merchant/X/startMaking... — ждём ответа/редиректа
            if (url.includes('/startMaking')) {
                console.log('[clanquest] лавочник: изготовление в процессе...');
                return true;
            }

            // Выбираем дешевейший крафт (камень или трава) по доплате
            const cheapBtn = findCheapestCraftBtn('/coliseum/merchant/');
            if (cheapBtn) {
                localStorage.setItem(CQ_LAST_KEY, now.toString());
                console.log('[clanquest] лавочник: выбираем дешевейший крафт');
                window.location.href = 'https://tiwar.ru' + cheapBtn.getAttribute('href');
                return true;
            }

            console.log('[clanquest] лавочник: нет доступных крафтов');
            window.location.href = 'https://tiwar.ru/clan/41140/quest/';
            return true;
        }

        // ── Мы не на нужной странице — идём на страницу клановых заданий
        const last2 = parseInt(localStorage.getItem(CQ_LAST_KEY) || '0', 10);
        if (now - last2 > 3000) {
            localStorage.setItem(CQ_LAST_KEY, now.toString());
            console.log('[clanquest] переходим на страницу клановых заданий');
            window.location.href = 'https://tiwar.ru/clan/41140/quest/';
        }
        return true;
    }

    // ── КОНЕЦ АВТО-КЛАНОВЫХ ЗАДАНИЙ ────────────────────────────────────────────

    function getArenaMana() {
        // <img src="/images/icon/mana.png" alt="mp"> 1975
        const spans = Array.from(document.querySelectorAll('span'));
        for (const span of spans) {
            const img = span.querySelector('img[alt="mp"]');
            if (img) {
                const text = (span.textContent || '').replace(/\D/g, ' ').trim();
                const nums = text.match(/(\d+)/g);
                if (nums && nums.length >= 2) return parseInt(nums[1], 10);
                if (nums && nums.length === 1) return parseInt(nums[0], 10);
            }
        }
        // Альтернативный парсер: ищем паттерн в тексте страницы
        const bodyText = (document.body?.textContent || '');
        const match = bodyText.match(/mp[^\d]*(\d+)/i);
        return match ? parseInt(match[1], 10) : null;
    }

    function runArena(force = false) {
        const url = window.location.href;

        // Переходим на арену если не там
        if (!url.includes('/arena')) {
            const arenaLink = Array.from(document.querySelectorAll('a'))
                .find(a => (a.getAttribute('href') || '').includes('/arena/'));
            if (arenaLink) {
                forceClick(arenaLink);
            } else {
                window.location.href = 'https://tiwar.ru/arena/';
            }
            return true;
        }

        // Проверяем ману
        const mana = getArenaMana();
        console.log('[arena] мана:', mana);

        if (mana !== null && mana < 50) {
            console.log('[arena] мана кончилась, идём дальше');
            return false;
        }

        // Нет HP/энергии — сообщение «Для нападения надо минимум...»
        const noRes = Array.from(document.querySelectorAll('.dred'))
            .some(el => el.textContent.includes('Для нападения надо'));
        if (noRes) {
            console.log('[arena] нет HP/энергии, идём дальше');
            return false;
        }

        const attackBtn = Array.from(document.querySelectorAll('a.btn'))
            .find(a => (a.getAttribute('href') || '').includes('/arena/attack/'));

        if (!attackBtn) {
            console.log('[arena] кнопка атаки не найдена');
            return false;
        }

        const now = Date.now();
        const last = parseInt(localStorage.getItem('fadd_arena_last') || '0', 10);
        if (now - last < 200) return true;

        localStorage.setItem('fadd_arena_last', now.toString());
        forceClick(attackBtn);
        return true;
    }

    function runSequentialMine() {
        const url = window.location.href;

        if (!url.includes('/distshores/mine')) {
            goToMine();
            return true;
        }

        const clicks = getMineClicks();
        console.log('[sequential-farm] шахта, кликов:', clicks);

        if (clicks <= 0) {
            return false;
        }

        runMine(true);
        return true;
    }

    function runSequentialForge() {
        const url = window.location.href;

        if (!url.includes('/distshores/forge')) {
            window.location.href = 'https://tiwar.ru/distshores/forge';
            return true;
        }

        const resource = getForgeResource();
        console.log('[sequential-farm] кузница, ресурсов:', resource);

        if (resource < 100) {
            return false;
        }

        runForge(true);
        return true;
    }

    function runSequentialHunt() {
        const url = window.location.href;

        if (isAnyFightPage()) {
            localStorage.setItem('fadd_hunt_active', Date.now().toString());
            runAutoHuntActions(true);
            return true;
        }

        // Если недавно нажимали разведку/атаку — ждём пока бой не загрузится (10 сек)
        const huntActive = parseInt(localStorage.getItem('fadd_hunt_active') || '0', 10);
        if (Date.now() - huntActive < 3000) {
            console.log('[sequential-farm] охота: ждём загрузки боя...');
            return true;
        }

        if (!url.includes('/distshores/hunt')) {
            const huntBtn = findGameButton(['Охота'], '/distshores/hunt');
            if (huntBtn) {
                forceClick(huntBtn);
            } else {
                window.location.href = 'https://tiwar.ru/distshores/hunt';
            }
            return true;
        }

        // Если есть кнопка боя/атаки — жмём, даже если билеты кончились
        const attackBtnHunt = findGameButton(['Атаковать', 'Атаковать монстра', 'Начать новый бой', 'Напасть'], '/hunt/find/new');
        const fightBtnHunt = findGameButton(['АТАКОВАТЬ'], '/attack/');
        const exitBtnHunt = findGameButton(['Закончить бой', 'В город', 'Завершить', 'ЗАКОНЧИТЬ БОЙ']);
        if (attackBtnHunt || fightBtnHunt || exitBtnHunt) {
            localStorage.setItem('fadd_hunt_active', Date.now().toString());
            runAutoHuntActions(true);
            return true;
        }

        const tickets = getHuntTickets();
        console.log('[sequential-farm] охота, билетов:', tickets);

        if (tickets !== null && tickets <= 0) {
            return false;
        }

        // Нажимаем разведку — запоминаем время чтобы ждать боя
        localStorage.setItem('fadd_hunt_active', Date.now().toString());
        runAutoHuntActions(true);
        return true;
    }

    function findQuestBlockByTitle(title) {
        return Array.from(document.querySelectorAll('.block_zero, .block_light'))
            .find(block => {
                const header = block.querySelector('b.dgreen');
                const text = (block.textContent || '').replace(/\s+/g, ' ').trim();
                return (header && header.textContent.trim() === title) || text.startsWith(title);
            });
    }

    function findQuestAction(title, hrefPart) {
        const block = findQuestBlockByTitle(title);
        if (!block) return null;

        return Array.from(block.querySelectorAll('a.btn, a'))
            .find(a => {
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                const href = a.getAttribute('href') || a.href || '';
                return text.includes('Перейти к выполнению') && href.includes(hrefPart);
            });
    }

    function findQuestRewardButton() {
        const REWARD_TEXTS = ['Забрать награду', 'Получить награду', 'Открыть'];
        return Array.from(document.querySelectorAll('a.btn, a, button'))
            .find(a => {
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                return REWARD_TEXTS.some(t => text.includes(t));
            });
    }

    function findElixirUseButton() {
        return Array.from(document.querySelectorAll('.block_zero'))
            .map(block => {
                const img = block.querySelector('img[src*="/images/alchemy/"]');
                const useBtn = Array.from(block.querySelectorAll('a.btn, a'))
                    .find(a => {
                        const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                        const href = a.getAttribute('href') || a.href || '';
                        return text.includes('Использовать') && href.includes('/inv/chest/use/');
                    });

                return img ? useBtn : null;
            })
            .find(Boolean);
    }

    // Среди всех эликсиров на /inv/chest/ выбирает тот, которого больше всего
    // (по полю "Количество: N штук/штуки") и возвращает его кнопку "Использовать".
    function findBestElixirButton() {
        const items = Array.from(document.querySelectorAll('.block_zero'))
            .map(block => {
                const img = block.querySelector('img[src*="/images/alchemy/"]');
                if (!img) return null;

                const useBtn = Array.from(block.querySelectorAll('a.btn, a'))
                    .find(a => {
                        const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                        const href = a.getAttribute('href') || a.href || '';
                        return text.includes('Использовать') && href.includes('/inv/chest/use/');
                    });

                if (!useBtn) return null;

                const text = (block.textContent || '').replace(/\s+/g, ' ');
                const qMatch = text.match(/Количество:\s*(\d+)/i);
                const qty = qMatch ? parseInt(qMatch[1], 10) : 0;

                return { btn: useBtn, qty };
            })
            .filter(Boolean);

        if (!items.length) return null;

        items.sort((a, b) => b.qty - a.qty);
        return items[0].btn;
    }

    function isQuestGroupDone() {
        // Ищем (+) рядом со ссылкой на questrnd — все задания выполнены
        // <a href="/questrnd/...">Приключение!</a><span class="green"> (+)</span>
        const links = Array.from(document.querySelectorAll('a[href*="/questrnd/"]'));
        for (const a of links) {
            const next = a.nextElementSibling;
            if (next && next.classList.contains('green') && (next.textContent || '').includes('+')) return true;
            const parent = a.parentElement;
            if (parent && (parent.innerHTML || '').includes('(+)')) return true;
        }
        return false;
    }

    function runAdventureArena() {
        const now = Date.now();

        // Восстановить (мана/жизни кончились) — href /lab/wizard/potion/ с ref=/arena/
        const restoreHref = Array.from(document.querySelectorAll('a'))
            .map(a => a.getAttribute('href') || '')
            .find(h => h.includes('/lab/wizard/potion/') && h.includes('ref=/arena/'));
        if (restoreHref) {
            const last = parseInt(localStorage.getItem('fadd_arena_restore_last') || '0', 10);
            if (now - last >= 3000) {
                localStorage.setItem('fadd_arena_restore_last', now.toString());
                console.log('[adventure/arena] восстанавливаем энергию/жизни');
                window.location.href = 'https://tiwar.ru' + restoreHref;
            }
            return true;
        }

        // Атаковать — href /arena/attack/
        const attackHref = Array.from(document.querySelectorAll('a'))
            .map(a => a.getAttribute('href') || '')
            .find(h => /\/arena\/attack\//.test(h));
        if (attackHref) {
            const last = parseInt(localStorage.getItem('fadd_arena_adv_last') || '0', 10);
            if (now - last >= 1500) {
                localStorage.setItem('fadd_arena_adv_last', now.toString());
                console.log('[adventure/arena] атакуем');
                window.location.href = 'https://tiwar.ru' + attackHref;
            }
            return true;
        }

        // Ни кнопки атаки ни восстановления — ждём или мана 0
        console.log('[adventure/arena] нет кнопок, ждём...');
        return true;
    }

    function runSageQuests() {
        const url = window.location.href;

        if (url.includes('/campaign')) {
            const handled = runCampaign(true);
            if (!handled) {
                window.location.href = 'https://tiwar.ru/quest/';
            }
            return true;
        }

        if (url.includes('/career')) {
            const handled = runCareer(true);
            if (!handled) {
                window.location.href = 'https://tiwar.ru/quest/';
            }
            return true;
        }

        if (url.includes('/arena')) {
            if (isQuestGroupDone()) {
                console.log('[sage/arena] (+) выполнено, возвращаемся');
                window.location.href = 'https://tiwar.ru/quest/';
                return true;
            }
            return runAdventureArena();
        }

        if (url.includes('/effshop')) {
            if (isQuestGroupDone()) {
                console.log('[sage/effshop] (+) выполнено, возвращаемся');
                window.location.href = 'https://tiwar.ru/quest/';
                return true;
            }
            const buyHref = Array.from(document.querySelectorAll('a'))
                .map(a => a.getAttribute('href') || '')
                .find(h => /\/effshop\/\d+\/\?r=/.test(h));
            if (buyHref) {
                const now = Date.now();
                const last = parseInt(localStorage.getItem('fadd_effshop_last') || '0', 10);
                if (now - last >= 1500) {
                    localStorage.setItem('fadd_effshop_last', now.toString());
                    console.log('[sage/effshop] покупаем:', buyHref);
                    window.location.href = 'https://tiwar.ru' + buyHref;
                }
            } else {
                window.location.href = 'https://tiwar.ru/quest/';
            }
            return true;
        }

        if (url.includes('/inv/chest')) {
            const rewardBtn = findQuestRewardButton();
            if (rewardBtn) {
                forceClick(rewardBtn);
                return true;
            }

            const elixirBtn = findElixirUseButton();
            if (elixirBtn) {
                const last = parseInt(localStorage.getItem('fadd_sage_elixir_last') || '0', 10);
                if (Date.now() - last > 1000) {
                    localStorage.setItem('fadd_sage_elixir_last', Date.now().toString());
                    forceClick(elixirBtn);
                }
                return true;
            }

            window.location.href = 'https://tiwar.ru/quest/';
            return true;
        }

        if (url.includes('/sage') && !url.includes('/quest')) {
            const questLink = Array.from(document.querySelectorAll('a'))
                .find(a => (a.getAttribute('href') || '').includes('/quest/') && (a.textContent || '').includes('Задания'));

            if (questLink) {
                forceClick(questLink);
            } else {
                window.location.href = 'https://tiwar.ru/quest/';
            }
            return true;
        }

        if (!url.includes('/quest')) {
            const sageLink = Array.from(document.querySelectorAll('a'))
                .find(a => (a.getAttribute('href') || '').includes('/sage/') && (a.textContent || '').includes('Хижина мудреца'));

            if (sageLink) {
                forceClick(sageLink);
            } else {
                window.location.href = 'https://tiwar.ru/sage/';
            }
            return true;
        }

        const rewardBtn = findQuestRewardButton();
        if (rewardBtn) {
            forceClick(rewardBtn);
            return true;
        }

        const questActions = [
            { title: 'Поход', href: '/campaign/', cooldownTask: 'campaign' },
            { title: 'Турнир', href: '/career/', cooldownTask: 'career' },
            { title: 'Алхимия', href: '/inv/chest/', cooldownTask: null },
            { title: 'Лаборатория', href: '/effshop/', cooldownTask: null },
            { title: 'Арена', href: '/arena/', cooldownTask: null }
        ];

        for (const quest of questActions) {
            if (quest.cooldownTask && isTaskOnCooldown(quest.cooldownTask)) continue;
            const action = findQuestAction(quest.title, quest.href);
            if (action) {
                forceClick(action);
                return true;
            }
        }

        return false;
    }

    function runSequentialCave() {
        return runCave(true);
    }

    function getCaveStateText() {
        return (document.body?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function getCavePercent() {
        const values = Array.from(document.querySelectorAll('.block_zero .small'))
            .map(el => {
                const match = (el.textContent || '').match(/(\d+)%/);
                return match ? parseInt(match[1], 10) : null;
            })
            .filter(value => Number.isInteger(value));

        return values.length ? Math.max(...values) : null;
    }

    function getCaveTimerMs() {
        const text = getCaveStateText();
        // Ищем таймер только рядом с маркерами активного кулдауна
        const CAVE_MARKERS = ['Добыча', 'Завершится', 'Осталось', 'идёт добыча'];
        for (const marker of CAVE_MARKERS) {
            const idx = text.toLowerCase().indexOf(marker.toLowerCase());
            if (idx === -1) continue;
            const slice = text.slice(idx, idx + 60);
            const match = slice.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
            if (!match) continue;
            const parts = match[1].split(':').map(p => parseInt(p, 10));
            let ms = 0;
            if (parts.length === 2) ms = ((parts[0] * 60) + parts[1]) * 1000;
            if (parts.length === 3) ms = (((parts[0] * 60) + parts[1]) * 60 + parts[2]) * 1000;
            // Пещера макс 55 мин — если больше, это не таймер пещеры
            if (ms > 0 && ms <= 55 * 60 * 1000) return ms;
        }
        return 0;
    }

    function rememberCaveTimer() {
        const ms = getCaveTimerMs();
        if (ms > 0) {
            setTaskCooldown('cave', ms);
            return true;
        }
        return false;
    }

    function runCave(force = false) {
        if (!force && !settings.autoCave) return false;

        const url = window.location.href;

        if (!url.includes('/cave')) {
            window.location.href = 'https://tiwar.ru/cave/';
            return true;
        }

        const attackBtn = findGameButton(['Напасть'], '/cave/attack/');
        if (attackBtn) {
            forceClick(attackBtn);
            rememberCaveTimer();
            return true;
        }

        const gatherBtn = findGameButton(['Начать добычу'], '/cave/gather/');
        const searchBtn = findGameButton(['Новый поиск'], '/cave/down/');
        const percent = getCavePercent();

        if (gatherBtn && percent != null && percent >= 23) {
            forceClick(gatherBtn);
            rememberCaveTimer();
            return true;
        }

        if (searchBtn) {
            forceClick(searchBtn);
            rememberCaveTimer();
            return true;
        }

        rememberCaveTimer();
        return false;
    }

    function runAutoHunt() {
        settings.autoClanDungeon = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').autoClanDungeon ?? false;

        // Если идёт сканирование таймеров — обрабатываем его в приоритете
        if (localStorage.getItem(TIMER_SCAN_ACTIVE_KEY) === '1') {
            runTimerRefreshScan();
            return;
        }

        // ── ПРИОРИТЕТ СРАЖЕНИЙ ─────────────────────────────────────────────────
        // Если любое авто-сражение включено и до него ≤ 60 сек — забываем обо всём остальном
        const battleChecks = [
            { enabled: settings.autoUndying,       schedule: UNDYING_FIGHT_MSK,       run: runUndying      },
            { enabled: settings.autoClanfight,      schedule: CLANFIGHT_FIGHT_MSK,     run: runClanfight    },
            { enabled: settings.autoKing,           schedule: KING_FIGHT_MSK,          run: runKing         },
            { enabled: settings.autoAltars,         schedule: ALTARS_FIGHT_MSK,        run: runAltars       },
        ];

        for (const battle of battleChecks) {
            if (!battle.enabled) continue;
            const diff = secondsToNextFight(battle.schedule);
            if (diff <= 60 && diff > -300) {
                console.log('[battle-priority] сражение через', diff, 'с — всё остальное отключено');
                battle.run();
                return;
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        if (settings.autoSequentialFarm) {
            runSequentialFarm();
            return;
        }


        if (settings.autoHunt1) {
            runAutoHuntActions(false);
        }

        if (settings.autoCareer) {
            runCareer();
        }

        if (!document.body) return;

        if (settings.autoForge) {
            runForge();
        }

        if (settings.autoClanDungeon) {
            runClanDungeon();
        }

        if (settings.autoMine) {
            runMineRoute();
        }

        if (settings.autoCave) {
            runCave();
        }

        if (settings.autoCampaign) {
            runCampaign();
        }

        if (settings.autoUndying) {
            runUndying();
        }

        if (settings.autoClanfight) {
            runClanfight();
        }

        if (settings.autoKing) {
            runKing();
        }

        if (settings.autoAltars) {
            runAltars();
        }
    }

    function runAutoHuntActions(force = false) {
        const url = window.location.href;
        const now = Date.now();

        if (!force && settings.autoHunt1) {
            runDistshores(now, url);
        }

        if (!document.body) return;

        const huntExists = findGameButton(['Охота'], '/hunt');

        if (!force &&
            !huntExists &&
            !window.location.href.includes('/fight') &&
            !window.location.href.includes('/hunt') &&
            !document.querySelector('.block_fight')) {
            return;
        }

        if (isRunning && (now - lastActionTime > 1500)) {
            isRunning = false;
        }

        const isFightPage = url.includes('/fight') || url.includes('/mfight') || url.includes('/coliseum') || document.querySelector('.block_fight') || document.querySelector('.life_bar');

        if (isFightPage) {
            if (checkNeedHeal()) {
                const healBtn = findGameButton(['Настойка'], '/heal/');
                if (healBtn) {
                    const lastHealTime = parseInt(localStorage.getItem('fadd_last_heal_click') || '0', 10);
                    if (now - lastHealTime >= 90000) {
                        console.log('🧪 ЖИЗНИ НА ИСХОДЕ! fadd пьет Настойку.');
                        localStorage.setItem('fadd_last_heal_click', now.toString());
                        forceClick(healBtn);
                    }
                }
            }

            const grassBtn = findGameButton(['Трава', 'ТРАВА']);
            if (grassBtn) {
                const lastGrassTime = parseInt(localStorage.getItem('fadd_last_grass_click') || '0', 10);
                if (now - lastGrassTime >= 30000) {
                    localStorage.setItem('fadd_last_grass_click', now.toString());
                    forceClick(grassBtn);
                }
            }

            // Камень — жмём если кнопка зелёная (кулдаун прошёл) и HP >= 80%
            const stoneBtn = document.querySelector('a.nbtn.b_green[href*="/fight/stone/"]');
            if (stoneBtn) {
                const hpBar = document.querySelector('.bf_left .rate.fl');
                let hp = 100;
                if (hpBar) {
                    const m = (hpBar.getAttribute('style') || '').match(/width:\s*(\d+)%/);
                    if (m) hp = parseInt(m[1], 10);
                }
                if (hp >= 80) {
                    const lastStone = parseInt(localStorage.getItem('fadd_last_stone_click') || '0', 10);
                    if (now - lastStone >= 5000) {
                        localStorage.setItem('fadd_last_stone_click', now.toString());
                        console.log(`[hunt] камень (HP ${hp}%)`);
                        forceClick(stoneBtn);
                    }
                }
            }
        }

        if (isRunning) return;

        const attackBtn = findGameButton(['Атаковать', 'Атаковать монстра', 'Начать новый бой', 'Напасть'], '/hunt/find/new');
        const fightBtn = findGameButton(['АТАКОВАТЬ'], '/attack/');
        const exitBtn = findGameButton(['Закончить бой', 'В город', 'Завершить', 'ЗАКОНЧИТЬ БОЙ']);
        const reconBtn = findGameButton(['Разведка за 1', 'Разведка за'], '/hunt/');
        const huntBtn = findGameButton(['Охота'], '/hunt');
        const tickets = getHuntTickets();

        if (fightBtn) {
            const lastClick = parseInt(localStorage.getItem('fadd_last_fight_click') || '0', 10);
            if (now - lastClick >= 5000) {
                localStorage.setItem('fadd_last_fight_click', now.toString());
                isRunning = true;
                lastActionTime = now;
                forceClick(fightBtn);
                setTimeout(() => { isRunning = false; }, 150);
            }
            return;
        }

        if (exitBtn) {
            localStorage.setItem('fadd_last_fight_click', '0');
            isRunning = true;
            lastActionTime = now;
            forceClick(exitBtn);
            setTimeout(() => { isRunning = false; }, 150);
            return;
        }

        if (attackBtn) {
            const lastAttackClick = parseInt(localStorage.getItem('fadd_last_attack_click') || '0', 10);
            if (now - lastAttackClick >= 600) {
                localStorage.setItem('fadd_last_attack_click', now.toString());
                isRunning = true;
                lastActionTime = now;
                forceClick(attackBtn);
                setTimeout(() => { isRunning = false; }, 150);
            }
            return;
        }

        if (reconBtn) {
            if (attackBtn || fightBtn) return;
            isRunning = true;
            lastActionTime = now;
            forceClick(reconBtn);
            setTimeout(() => { isRunning = false; }, 500);
            return;
        }

        if (huntBtn && !url.includes('/distshores/hunt')) {
            isRunning = true;
            lastActionTime = now;
            forceClick(huntBtn);
            setTimeout(() => { isRunning = false; }, 150);
        }
    }

    function runForge(force = false) {
        const url = window.location.href;

        if (!url.includes('/distshores/forge')) {
            window.location.href = 'https://tiwar.ru/distshores/forge';
            return;
        }

        const now = Date.now();
        const last = parseInt(localStorage.getItem('fadd_forge_last') || '0', 10);

        if (now - last < 400) {
            return;
        }

        const resource = getForgeResource();

        if (!resource || resource < 100) {
            return;
        }

        const craftBtn = Array.from(document.querySelectorAll('a.btn')).find(el => {
            const t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
            return t.includes('Выковать');
        });

        if (!craftBtn) return;

        localStorage.setItem('fadd_forge_last', now.toString());
        forceClick(craftBtn);
    }

    function goToMine() {
        const mineBtn = findGameButton(['Шахта'], '/distshores/mine');
        if (mineBtn) {
            forceClick(mineBtn);
        } else {
            window.location.href = 'https://tiwar.ru/distshores/mine';
        }
    }

    function runMineRoute(force = false) {
        const url = window.location.href;
        runMine(force);
        if (!url.includes('/distshores/mine')) {
            goToMine();
        }
    }

    function runMine(force = false) {
        if (!force && !settings.autoMine) return;
        const url = window.location.href;
        if (!url.includes('/distshores/mine')) return;

        const budget = getMineClicks(); // сколько кликов осталось у персонажа
        if (budget <= 0) return;

        const now = Date.now();
        const last = parseInt(localStorage.getItem('fadd_mine_last') || '0', 10);
        if (now - last < 800) return;

        const tiles = Array.from(document.querySelectorAll('a[href*="/distshores/mine/pick"]'));
        if (!tiles.length) return;

        // Убираем явно пустые (empty.png) и сортируем по приоритету
        const ranked = tiles
            .filter(t => !t.querySelector('img[src*="empty.png"]'))
            .map(t => ({
                el: t,
                priority: getMineTilePriority(t),
                cost: getMineClicksFromHref(t)
            }))
            .filter(t => t.priority < 9000)
            .sort((a, b) => a.priority - b.priority);

        if (!ranked.length) {
            console.log('[mine] нет подходящих ячеек');
            return;
        }

        localStorage.setItem('fadd_mine_last', now.toString());

        // Кликаем по лучшим ячейкам, пока хватает бюджета
        let remaining = budget;
        let delay = 0;

        for (const tile of ranked) {
            if (remaining <= 0) break;
            const times = Math.min(tile.cost, remaining);
            for (let i = 0; i < times; i++) {
                const el = tile.el;
                setTimeout(() => forceClick(el), delay);
                delay += 130;
            }
            remaining -= times;
        }
    }

    function runClanDungeon(force = false) {
        if (!force && !settings.autoClanDungeon) return false;

        const url = window.location.href;

        if (!url.includes('/clandungeon')) {
            window.location.href = 'https://tiwar.ru/clandungeon/';
            return true;
        }

        // Если открыт экран награды — закрываем его кнопкой "В подземелье", чтобы продолжить
        const closeDungeonBtn = Array.from(document.querySelectorAll('a.btn')).find(a => {
            const href = (a.getAttribute('href') || '').trim();
            const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
            return href === '?close' && text.includes('В подземелье');
        });

        if (closeDungeonBtn) {
            const lastClose = parseInt(localStorage.getItem('fadd_clandungeon_last') || '0', 10);
            if (Date.now() - lastClose < 1000) return true;
            localStorage.setItem('fadd_clandungeon_last', Date.now().toString());
            console.log('[clandungeon] закрываем награду, возвращаемся в подземелье');
            forceClick(closeDungeonBtn);
            return true;
        }

        const bodyText = document.body.textContent || '';

        if (bodyText.includes('Удары закончились')) {
            rememberCooldownFromText('clandungeon', 'ударов через');
            return false;
        }

        const match = bodyText.match(/Осталось ударов:\s*(\d+)/i);

        if (match) {
            const hits = parseInt(match[1], 10);
            console.log('[clandungeon] ударов осталось:', hits);

            if (hits <= 0) {
                rememberCooldownFromText('clandungeon', 'ударов через');
                return false;
            }
        }

        const attackBtn = findGameButton(['Атаковать монстра'], '/clandungeon/attack');

        if (!attackBtn) {
            rememberCooldownFromText('clandungeon', 'ударов через');
            console.log('[clandungeon] кнопка атаки не найдена');
            return false;
        }

        const now = Date.now();
        const last = parseInt(localStorage.getItem('fadd_clandungeon_last') || '0', 10);

        if (now - last < 1000) return true;

        localStorage.setItem('fadd_clandungeon_last', now.toString());
        console.log('[clandungeon] атака');
        forceClick(attackBtn);
        return true;
    }

    function runCareer(force = false) {
        if (!force && !settings.autoCareer) return false;

        const url = window.location.href;

        if (!url.includes('/career')) {
            const last = parseInt(localStorage.getItem('fadd_career_go') || '0', 10);

            if (Date.now() - last > 5000) {
                localStorage.setItem('fadd_career_go', Date.now().toString());
                window.location.href = 'https://tiwar.ru/career/';
            }
            return true;
        }

        const bodyText = document.body.textContent || '';

        // Если есть кнопка "Забрать награду" — жмём её, пока не пропадёт
        const careerRewardBtn = Array.from(document.querySelectorAll('a.nbtn1, a'))
            .find(a => {
                const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
                const href = a.getAttribute('href') || '';
                return text.includes('Забрать награду') && href.includes('/career/take/');
            });

        if (careerRewardBtn) {
            const lastReward = parseInt(localStorage.getItem('fadd_career_reward_last') || '0', 10);
            if (Date.now() - lastReward < 500) return true;
            localStorage.setItem('fadd_career_reward_last', Date.now().toString());
            console.log('[career] забираем награду');
            forceClick(careerRewardBtn);
            return true;
        }

        if (bodyText.includes('Турнир откроется через')) {
            rememberCooldownFromText('career', 'Турнир откроется через');
            return false;
        }

        const attackBtn = Array.from(document.querySelectorAll('a,button'))
            .find(el => {
                const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
                return t.includes('Атаковать') && /\d+\/5/.test(t);
            });

        if (!attackBtn) {
            rememberCooldownFromText('career', 'Турнир откроется через');
            return false;
        }

        const text = attackBtn.textContent;
        const match = text.match(/(\d+)\/5/);

        if (!match) return false;

        const used = parseInt(match[1], 10);
        if (used >= 5) {
            rememberCooldownFromText('career', 'Турнир откроется через');
            return false;
        }

        const last = parseInt(localStorage.getItem('fadd_career_last') || '0', 10);
        if (Date.now() - last < 500) return true;

        localStorage.setItem('fadd_career_last', Date.now().toString());
        forceClick(attackBtn);
        return true;
    }

    // ── РАСПИСАНИЕ ВСЕХ БОЁВ (МСК) ───────────────────────────────────────────
    // Каждый элемент: { settingKey, path, url, applyHref, refreshHref, fightTimes }
    // fightTimes — точное время начала боя в МСК
    // За 60 сек до боя: переходим на страницу и жмём "Подать заявку"
    // В X:00:05 (5 сек после начала): жмём "Обновить" и остаёмся на странице боя
    const ALL_FIGHT_CONFIG = [
        {
            settingKey:   'autoUndying',
            path:         '/undying/',
            url:          'https://tiwar.ru/undying/',
            applyHref:    '/undying/enterGame/',
            refreshHref:  '/undying/',
            fightTimes:   [{ h: 10, m: 0 }, { h: 16, m: 0 }, { h: 22, m: 0 }],
        },
        {
            settingKey:   'autoClanfight',
            path:         '/clanfight/',
            url:          'https://tiwar.ru/clanfight/',
            applyHref:    '/clanfight/enterFight/',
            refreshHref:  '/clanfight/',
            fightTimes:   [{ h: 11, m: 0 }, { h: 19, m: 0 }],
        },
        {
            settingKey:   'autoKing',
            path:         '/king/',
            url:          'https://tiwar.ru/king/',
            applyHref:    '/king/enterGame/',
            refreshHref:  '/king/',
            fightTimes:   [{ h: 12, m: 30 }, { h: 16, m: 30 }, { h: 22, m: 30 }],
        },
        {
            settingKey:   'autoAltars',
            path:         '/altars/',
            url:          'https://tiwar.ru/altars/',
            applyHref:    '/altars/enterFight/',
            refreshHref:  '/altars/',
            fightTimes:   [{ h: 14, m: 0 }, { h: 21, m: 0 }],
        },
        {
            settingKey:   'autoClancoliseum',
            path:         '/clancoliseum/',
            url:          'https://tiwar.ru/clancoliseum/',
            applyHref:    '/clancoliseum/enterFight/',
            refreshHref:  '/clancoliseum/',
            fightTimes:   [{ h: 10, m: 30 }, { h: 15, m: 0 }],
        },
    ];

    // localStorage ключи для battles
    const BATTLES_APPLY_DONE_KEY = 'fadd_battles_apply_done'; // "path-h-m" → timestamp подачи заявки
    const BATTLES_REFRESH_DONE_KEY = 'fadd_battles_refresh_done'; // "path-h-m" → timestamp нажатия Обновить
    const BATTLES_ACTIVE_KEY = 'fadd_battles_active_fight'; // "path-h-m" — идёт бой прямо сейчас

    /**
     * Возвращает ключ конкретного слота боя, например "undying-10-0"
     */
    function fightSlotKey(cfg, t) {
        return cfg.path.replace(/\//g, '') + '-' + t.h + '-' + t.m;
    }

    /**
     * Секунды МСК до конкретного слота. Отрицательное — уже прошёл.
     */
    function secToSlot(t) {
        const now = getMskTotalSeconds();
        const slotSec = t.h * 3600 + t.m * 60;
        let diff = slotSec - now;
        if (diff < -43200) diff += 86400; // если прошло больше полусуток — это следующий день
        return diff;
    }

    /**
     * Новая runBattles:
     * 1. Ищет ближайший бой (за 60 сек до начала или пропустили <5 мин назад)
     *    среди включённых типов боёв.
     * 2. Переходит на страницу, жмёт "Подать заявку" (один раз за слот).
     * 3. В X:00:05 жмёт "Обновить" (один раз за слот) и передаёт управление бою.
     * 4. Пока идёт активный бой (есть BATTLES_ACTIVE_KEY) — делегирует бой
     *    существующим runUndying / runBattleAuto / runClancoliseum.
     */
    function runBattles(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // ── Проверяем: идёт ли прямо сейчас бой, в который мы уже вошли ────────
        const activeFightKey = localStorage.getItem(BATTLES_ACTIVE_KEY);
        if (activeFightKey) {
            // Определяем какой это бой
            for (const cfg of ALL_FIGHT_CONFIG) {
                if (!settings[cfg.settingKey]) continue;
                for (const t of cfg.fightTimes) {
                    if (fightSlotKey(cfg, t) !== activeFightKey) continue;
                    const diff = secToSlot(t);
                    // Бой идёт от 0 до +600 сек (10 мин после начала)
                    if (diff > 5 || diff < -600) {
                        // Время вышло — бой завершён
                        console.log('[battles] бой завершён:', activeFightKey);
                        localStorage.removeItem(BATTLES_ACTIVE_KEY);
                        break;
                    }
                    // Делегируем бой соответствующей функции
                    console.log('[battles] активный бой:', activeFightKey, '— делегируем');
                    if (cfg.path === '/undying/') return runUndying(true);
                    if (cfg.path === '/clancoliseum/') return runClancoliseum(true);
                    return runBattleAuto(
                        cfg.path.replace(/\//g, ''),
                        cfg.path,
                        cfg.url,
                        cfg.applyHref,
                        'fadd_' + cfg.path.replace(/\//g, '') + '_nav_last',
                        'fadd_' + cfg.path.replace(/\//g, '') + '_ref_last',
                        cfg.fightTimes
                    );
                }
            }
        }

        // ── Ищем бой, для которого сейчас пора действовать ───────────────────
        // Приоритет: ближайший по времени из активных (включённых)
        let bestCfg = null, bestT = null, bestDiff = Infinity;

        for (const cfg of ALL_FIGHT_CONFIG) {
            if (!settings[cfg.settingKey]) continue;
            for (const t of cfg.fightTimes) {
                const diff = secToSlot(t);
                // Окно действия: за 65 сек до боя или пропустили < 5 мин (300 сек)
                if (diff > 65 || diff < -300) continue;
                const absDiff = Math.abs(diff);
                if (absDiff < bestDiff) {
                    bestDiff = absDiff;
                    bestCfg = cfg;
                    bestT = t;
                }
            }
        }

        if (!bestCfg) {
            // Нет ни одного боя в ближайшие 65 сек
            return false;
        }

        const slotKey = fightSlotKey(bestCfg, bestT);
        const diff = secToSlot(bestT); // может быть отрицательным (бой уже начался)

        // ── Фаза 1: ПОДАЧА ЗАЯВКИ (за 65..5 сек до боя) ─────────────────────
        if (diff > 5) {
            // Проверяем — не подавали ли уже заявку на этот слот
            let applyDone = {};
            try { applyDone = JSON.parse(localStorage.getItem(BATTLES_APPLY_DONE_KEY) || '{}'); } catch(_) {}
            if (applyDone[slotKey]) {
                console.log('[battles] заявка на', slotKey, 'уже подана, ждём начала боя');
                return true; // ждём — выходим чтобы не мешать другим задачам
            }

            // Если не на нужной странице — переходим
            if (!url.includes(bestCfg.path)) {
                const last = parseInt(localStorage.getItem(BATTLES_LAST_KEY) || '0', 10);
                if (now - last < 2000) return true;
                localStorage.setItem(BATTLES_LAST_KEY, now.toString());
                console.log('[battles] переходим на', bestCfg.url, '(до боя:', diff, 'сек)');
                window.location.href = bestCfg.url;
                return true;
            }

            // Мы на странице — ищем кнопку "Подать заявку"
            const applyBtn = Array.from(document.querySelectorAll('a.btn')).find(el =>
                (el.getAttribute('href') || '').includes(bestCfg.applyHref)
            );
            if (applyBtn) {
                const last = parseInt(localStorage.getItem(BATTLES_LAST_KEY) || '0', 10);
                if (now - last < 1500) return true;
                localStorage.setItem(BATTLES_LAST_KEY, now.toString());
                console.log('[battles] подаём заявку на', slotKey, '(до боя:', diff, 'сек)');
                forceClick(applyBtn);
                // Помечаем что заявка подана для этого слота
                applyDone[slotKey] = now;
                // Чистим старые записи (оставляем только за последние сутки)
                const cutoff = now - 86400000;
                Object.keys(applyDone).forEach(k => { if (applyDone[k] < cutoff) delete applyDone[k]; });
                localStorage.setItem(BATTLES_APPLY_DONE_KEY, JSON.stringify(applyDone));
                return true;
            }

            // Кнопки нет — возможно уже подана через сайт, тоже помечаем
            console.log('[battles] кнопка заявки не найдена на', bestCfg.path, '— считаем поданной');
            applyDone[slotKey] = now;
            localStorage.setItem(BATTLES_APPLY_DONE_KEY, JSON.stringify(applyDone));
            return true;
        }

        // ── Фаза 2: БОЙ НАЧАЛСЯ (diff <= 5, то есть X:00:05 или позже) ───────
        // Проверяем — нажимали ли уже "Обновить" для этого слота
        let refreshDone = {};
        try { refreshDone = JSON.parse(localStorage.getItem(BATTLES_REFRESH_DONE_KEY) || '{}'); } catch(_) {}

        if (!refreshDone[slotKey]) {
            // Нужно нажать "Обновить" один раз
            if (!url.includes(bestCfg.path)) {
                const last = parseInt(localStorage.getItem(BATTLES_LAST_KEY) || '0', 10);
                if (now - last < 2000) return true;
                localStorage.setItem(BATTLES_LAST_KEY, now.toString());
                console.log('[battles] бой начался, переходим на', bestCfg.url);
                window.location.href = bestCfg.url;
                return true;
            }

            // Ищем кнопку "Обновить"
            const refreshBtn = Array.from(document.querySelectorAll('a.btn')).find(el => {
                const href = el.getAttribute('href') || '';
                const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
                return href.includes(bestCfg.refreshHref) && txt === 'Обновить';
            });

            if (refreshBtn) {
                const last = parseInt(localStorage.getItem(BATTLES_LAST_KEY) || '0', 10);
                if (now - last < 1500) return true;
                localStorage.setItem(BATTLES_LAST_KEY, now.toString());
                console.log('[battles] нажимаем Обновить для', slotKey);
                forceClick(refreshBtn);
                refreshDone[slotKey] = now;
                const cutoff = now - 86400000;
                Object.keys(refreshDone).forEach(k => { if (refreshDone[k] < cutoff) delete refreshDone[k]; });
                localStorage.setItem(BATTLES_REFRESH_DONE_KEY, JSON.stringify(refreshDone));
                // Помечаем этот бой как активный
                localStorage.setItem(BATTLES_ACTIVE_KEY, slotKey);
                return true;
            }

            // Кнопки "Обновить" нет — бой уже загружен, просто помечаем как активный
            console.log('[battles] кнопка Обновить не найдена, помечаем бой активным:', slotKey);
            refreshDone[slotKey] = now;
            localStorage.setItem(BATTLES_REFRESH_DONE_KEY, JSON.stringify(refreshDone));
            localStorage.setItem(BATTLES_ACTIVE_KEY, slotKey);
        }

        // "Обновить" уже нажали — делегируем логику боя
        localStorage.setItem(BATTLES_ACTIVE_KEY, slotKey);
        if (bestCfg.path === '/undying/') return runUndying(true);
        if (bestCfg.path === '/clancoliseum/') return runClancoliseum(true);
        return runBattleAuto(
            bestCfg.path.replace(/\//g, ''),
            bestCfg.path,
            bestCfg.url,
            bestCfg.applyHref,
            'fadd_' + bestCfg.path.replace(/\//g, '') + '_nav_last',
            'fadd_' + bestCfg.path.replace(/\//g, '') + '_ref_last',
            bestCfg.fightTimes
        );
    }

    // Оставляем заглушку чтобы старые вызовы не ломались
    function _runBattlesLegacy(force = false) {
        const url = window.location.href;
        const now = Date.now();
        // (старая логика удалена, используется runBattles выше)
        if (false) {
            return false; // все страницы обошли
        }

        const nextPage = activePages[nextIdx];
        const last = parseInt(localStorage.getItem(BATTLES_LAST_KEY) || '0', 10);
        if (now - last < 1500) return true;
        localStorage.setItem(BATTLES_LAST_KEY, now.toString());
        console.log('[battles] кнопка заявки не найдена на', page.path, '— переходим на', nextPage.url);
        window.location.href = nextPage.url;
        return true;
    }

    // ── Авто-набор в клан ────────────────────────────────────────────────────
    // 1) Заходим на /online/clan/ — список игроков без клана
    // 2) Берём самого высокого по уровню (45–150) из непроверенных в этом раунде
    // 3) Заходим в его профиль, смотрим Мощь
    // 4) Если Мощь >= 40000 — жмём "Пригласить в клан"
    // 5) Возвращаемся на /online/clan/, повторяем, пока не проверим 5 игроков за раунд
    function getClanRecruitChecked() {
        try {
            const arr = JSON.parse(localStorage.getItem(CR_CHECKED_KEY) || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function addClanRecruitChecked(id) {
        const arr = getClanRecruitChecked();
        if (!arr.includes(id)) arr.push(id);
        localStorage.setItem(CR_CHECKED_KEY, JSON.stringify(arr));
    }

    function runClanRecruit(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // ── ID игрока берём прямо из текущего URL (надёжнее, чем сверять с сохранённым target) ──
        const profileMatch = url.match(/\/user\/(\d+)/);

        // ── Мы на странице профиля какого-то игрока ──────────────────────
        if (profileMatch && !url.includes('/online/')) {
            const pid = profileMatch[1];
            const checked = getClanRecruitChecked();

            // Если этого игрока в этом раунде ещё не проверяли — проверяем сейчас
            if (!checked.includes(pid)) {
                const inviteBtn = Array.from(document.querySelectorAll('a')).find(a => {
                    const href = a.getAttribute('href') || '';
                    return href.includes('invite=');
                });

                if (inviteBtn) {
                    let power = 0;
                    const mightLink = document.querySelector('a[href*="show=might"]');
                    if (mightLink) {
                        const boldEl = mightLink.querySelector('.bold') || mightLink;
                        const digits = (boldEl.textContent || '').replace(/\D/g, '');
                        power = digits ? parseInt(digits, 10) : 0;
                    }
                    if (!power) {
                        // Резервный вариант — ищем по всему тексту страницы
                        const bodyText = (document.body.textContent || '').replace(/\s+/g, ' ');
                        const powerMatch = bodyText.match(/Мощь:[^\d]*(\d[\d\s]*)/);
                        power = powerMatch ? parseInt(powerMatch[1].replace(/\D/g, ''), 10) : 0;
                    }

                    if (power >= CR_MIN_POWER) {
                        console.log('[clanrecruit] приглашаем игрока', pid, '— мощь', power);
                        const inviteHref = inviteBtn.getAttribute('href') || '';
                        const inviteUrl = inviteHref.startsWith('http') ? inviteHref : ('https://tiwar.ru' + inviteHref);
                        addClanRecruitChecked(pid);
                        localStorage.removeItem(CR_TARGET_KEY);
                        let countNow = parseInt(localStorage.getItem(CR_COUNT_KEY) || '0', 10) + 1;
                        if (countNow >= CR_BATCH_SIZE) {
                            localStorage.setItem(CR_COUNT_KEY, '0');
                            localStorage.setItem(CR_CHECKED_KEY, '[]');
                        } else {
                            localStorage.setItem(CR_COUNT_KEY, countNow.toString());
                        }
                        localStorage.setItem(CR_LAST_KEY, now.toString());
                        console.log('[clanrecruit] переходим по ссылке приглашения:', inviteUrl);
                        window.location.href = inviteUrl;
                        return true;
                    } else {
                        console.log('[clanrecruit] мощь ниже', CR_MIN_POWER, '(', power, ') — пропускаем', pid);
                    }
                } else {
                    console.log('[clanrecruit] кнопка приглашения не найдена — пропускаем', pid);
                }

                addClanRecruitChecked(pid);
                localStorage.removeItem(CR_TARGET_KEY);

                let count = parseInt(localStorage.getItem(CR_COUNT_KEY) || '0', 10) + 1;

                if (count >= CR_BATCH_SIZE) {
                    console.log('[clanrecruit] проверено', CR_BATCH_SIZE, 'игроков, цикл завершён');
                    localStorage.setItem(CR_COUNT_KEY, '0');
                    localStorage.setItem(CR_CHECKED_KEY, '[]');
                    return false;
                }

                localStorage.setItem(CR_COUNT_KEY, count.toString());
            }

            // Уже проверен (или только что проверили) — возвращаемся на список
            const last = parseInt(localStorage.getItem(CR_LAST_KEY) || '0', 10);
            if (now - last < 1200) return true;
            localStorage.setItem(CR_LAST_KEY, now.toString());
            window.location.href = 'https://tiwar.ru/online/clan/';
            return true;
        }

        // ── Мы не на странице списка без клана — переходим туда ─────────────
        if (!url.includes('/online/clan/')) {
            const last = parseInt(localStorage.getItem(CR_LAST_KEY) || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem(CR_LAST_KEY, now.toString());
            console.log('[clanrecruit] переходим на список игроков без клана');
            window.location.href = 'https://tiwar.ru/online/clan/';
            return true;
        }

        // ── Мы на странице списка — парсим игроков без клана ────────────────
        const checked = getClanRecruitChecked();
        const links = Array.from(document.querySelectorAll('.block_zero a[href^="/user/"]'));

        const candidates = links.map(a => {
            const href = a.getAttribute('href') || '';
            const idMatch = href.match(/\/user\/(\d+)/);
            if (!idMatch) return null;
            const id = idMatch[1];

            // Текст уровня идёт сразу после ссылки до <br>, например " 87 - Подземелье"
            let levelText = '';
            let node = a.nextSibling;
            while (node && node.nodeName !== 'BR') {
                if (node.nodeType === 3) levelText += node.textContent;
                node = node.nextSibling;
            }
            const lvlMatch = levelText.match(/(\d+)/);
            const level = lvlMatch ? parseInt(lvlMatch[1], 10) : null;

            return level !== null ? { id, level, name: (a.textContent || '').trim() } : null;
        }).filter(Boolean);

        const filtered = candidates
            .filter(c => c.level >= CR_MIN_LEVEL && c.level <= CR_MAX_LEVEL && !checked.includes(c.id))
            .sort((a, b) => b.level - a.level);

        if (!filtered.length) {
            console.log('[clanrecruit] нет подходящих игроков (', CR_MIN_LEVEL, '-', CR_MAX_LEVEL, 'ур.) на странице — цикл завершён');
            localStorage.setItem(CR_COUNT_KEY, '0');
            localStorage.setItem(CR_CHECKED_KEY, '[]');
            return false;
        }

        const next = filtered[0];
        localStorage.setItem(CR_TARGET_KEY, next.id);

        const last = parseInt(localStorage.getItem(CR_LAST_KEY) || '0', 10);
        if (now - last < 1200) return true;
        localStorage.setItem(CR_LAST_KEY, now.toString());
        console.log('[clanrecruit] заходим к игроку', next.name, '— ур.', next.level);
        window.location.href = 'https://tiwar.ru/user/' + next.id + '/';
        return true;
    }

    // ── Авто-привет новичкам в чате клана ───────────────────────────────────
    // 1) Заходим в чат клана
    // 2) Ищем сообщения вида "Приветствуем новичка: Ник!"
    // 3) Для каждого ещё не поприветствованного — пишем "{ник}, <случайная фраза>"
    function getClanGreeted() {
        try {
            const arr = JSON.parse(localStorage.getItem(CG_GREETED_KEY) || '[]');
            return Array.isArray(arr) ? arr : [];
        } catch (_) {
            return [];
        }
    }

    function addClanGreeted(id) {
        let arr = getClanGreeted();
        if (!arr.includes(id)) arr.push(id);
        if (arr.length > CG_GREETED_MAX) arr = arr.slice(arr.length - CG_GREETED_MAX);
        localStorage.setItem(CG_GREETED_KEY, JSON.stringify(arr));
    }

    function runClanGreet(force = false) {
        if (!document.body) return false;
        const url = window.location.href;
        const now = Date.now();

        // ── Не на странице чата клана — переходим туда ──────────────────────
        if (!url.includes('/chat/clan')) {
            const last = parseInt(localStorage.getItem(CG_LAST_KEY) || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem(CG_LAST_KEY, now.toString());
            console.log('[clangreet] переходим в чат клана');
            window.location.href = CG_CHAT_URL;
            return true;
        }

        // ── Мы в чате клана — ищем сообщения "Приветствуем новичка: ..." ────
        const greeted = getClanGreeted();

        const newMemberDivs = Array.from(document.querySelectorAll('span.dgreen'))
            .filter(s => (s.textContent || '').includes('Приветствуем новичка'))
            .map(s => s.closest('div'))
            .filter(Boolean);

        let target = null;
        for (const div of newMemberDivs) {
            const link = div.querySelector('a[href^="/user/"]');
            if (!link) continue;
            const idMatch = (link.getAttribute('href') || '').match(/\/user\/(\d+)/);
            if (!idMatch) continue;
            const id = idMatch[1];
            if (greeted.includes(id)) continue;
            target = { id, name: (link.textContent || '').trim() };
            break;
        }

        if (!target) {
            console.log('[clangreet] новых непоприветствованных новичков нет');
            return false;
        }

        const input = document.getElementById('sml');
        const form = input ? input.closest('form') : null;

        if (!input || !form) {
            console.log('[clangreet] поле ввода чата не найдено');
            return false;
        }

        // Кулдаун проверяем ДО записи в greeted — чтобы не помечать как поприветствованного зря
        const last = parseInt(localStorage.getItem(CG_LAST_KEY) || '0', 10);
        if (now - last < 2000) return true;

        const phrase = CG_PHRASES[Math.floor(Math.random() * CG_PHRASES.length)];
        const text = target.name + ', ' + phrase;

        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));

        localStorage.setItem(CG_LAST_KEY, now.toString());
        addClanGreeted(target.id);

        console.log('[clangreet] приветствуем', target.name, '—', text);

        const sendBtn = form.querySelector('input[type="submit"][name="send_message"].label')
            || Array.from(form.querySelectorAll('input[type="submit"][name="send_message"]')).pop();

        try {
            if (sendBtn) {
                // Используем нативный клик как казна — надёжнее requestSubmit
                sendBtn.click();
            } else {
                form.submit();
            }
        } catch (e) {
            console.log('[clangreet] ошибка отправки:', e);
            try { form.submit(); } catch (_) {}
        }

        return true;
    }

    const LEAGUE_DONE_KEY = 'fadd_league_done_date';
    const LEAGUE_LAST_KEY = 'fadd_league_last';

    /**
     * Возвращает объект Date скорректированный по Киеву (Europe/Kiev).
     */
    function getKyivDate() {
        const now = new Date();
        // toLocaleString с таймзоной даёт строку локального времени Киева
        const kyivStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Kiev', hour12: false });
        // en-CA даёт формат "YYYY-MM-DD, HH:MM:SS"
        return new Date(kyivStr.replace(',', ''));
    }

    /**
     * Возвращает true если сейчас 00:xx по Киеву.
     */
    function isLeagueTime() {
        return getKyivDate().getHours() === 0;
    }

    /**
     * Возвращает дату сегодня по Киеву "YYYY-MM-DD".
     */
    function todayStr() {
        const d = getKyivDate();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    /**
     * Запускает тикер часов в шапке меню.
     */
    function startClock() {
        function tick() {
            const clockEl = document.getElementById('fadd-clock');
            if (!clockEl) return;
            const d = getKyivDate();
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            clockEl.textContent = `🕐 Киев ${hh}:${mm}:${ss}`;
        }
        tick();
        setInterval(tick, 1000);
    }

    // ── ДОЛИНА БЕССМЕРТНЫХ ──────────────────────────────────────────────────

    /**
     * Возвращает дату по МСК (Europe/Moscow)
     */
    function getMskDate() {
        const now = new Date();
        const mskStr = now.toLocaleString('en-CA', { timeZone: 'Europe/Moscow', hour12: false });
        return new Date(mskStr.replace(',', ''));
    }

    function getMskTotalSeconds() {
        const d = getMskDate();
        return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    }

    /**
     * Обновляет вкладку расписания с отсчётом до боёв
     */
    function updateScheduleTab() {
        const el = document.getElementById('all-schedule-list');
        if (!el) return;

        const ALL_BATTLES = [
            {
                name: 'Клановый турнир',
                url: 'https://tiwar.ru/clanfight/?from=fights',
                times: [{ h: 11, m: 0 }, { h: 19, m: 0 }]
            },
            {
                name: 'Король бессмертных',
                url: 'https://tiwar.ru/king/?from=fights',
                times: [{ h: 12, m: 30 }, { h: 16, m: 30 }, { h: 22, m: 30 }]
            },
            {
                name: 'Древние алтари',
                url: 'https://tiwar.ru/altars/?from=fights',
                times: [{ h: 14, m: 0 }, { h: 21, m: 0 }]
            },
            {
                name: 'Долина бессмертных',
                url: 'https://tiwar.ru/undying/?from=fights',
                times: [{ h: 10, m: 0 }, { h: 16, m: 0 }, { h: 22, m: 0 }]
            },
            {
                name: 'Клановый колизей',
                url: 'https://tiwar.ru/clancoliseum/?from=fights',
                times: [{ h: 10, m: 30 }, { h: 15, m: 0 }]
            },
        ];

        const now = getMskTotalSeconds();
        const daySeconds = 86400;

        function formatDiff(diff) {
            if (diff === 0) return '<span style="color:#ff2222;font-weight:bold;">БОЙ НАЧАЛСЯ!</span>';
            const color = diff < 120 ? '#ff4444' : diff < 600 ? '#ffaa00' : '#0f0';
            let timeStr;
            if (diff < 0) {
                timeStr = 'состоялся';
                return `<span style="color:#553333;">Сражение ${timeStr}</span>`;
            } else if (diff < 60) {
                timeStr = 'через ' + diff + ' сек';
            } else if (diff < 3600) {
                const mm = Math.floor(diff / 60);
                const ss = diff % 60;
                timeStr = 'через ' + mm + ' мин' + (ss > 0 ? ' ' + ss + ' сек' : '');
            } else {
                const hh = Math.floor(diff / 3600);
                const mm = Math.floor((diff % 3600) / 60);
                timeStr = 'через ' + hh + ' ч' + (mm > 0 ? ' ' + mm + ' мин' : '');
            }
            return `<span style="color:${color};">Сражение ${timeStr}</span>`;
        }

        // Собираем все ближайшие события для определения первого
        let allEvents = [];
        ALL_BATTLES.forEach(battle => {
            battle.times.forEach(t => {
                const fightSec = t.h * 3600 + t.m * 60;
                let diff = fightSec - now;
                if (diff < 0) diff += daySeconds;
                allEvents.push({ diff, battle, t });
            });
        });
        allEvents.sort((a, b) => a.diff - b.diff);
        const nearestKey = allEvents.length ? `${allEvents[0].battle.name}-${allEvents[0].t.h}-${allEvents[0].t.m}` : '';

        let html = '';
        ALL_BATTLES.forEach(battle => {
            html += `<div style="margin-bottom:10px;">`;
            html += `<div style="margin-bottom:3px;"><a href="${battle.url}" style="color:#ff3333;font-weight:bold;text-decoration:none;" target="_blank">⚔ ${battle.name}</a></div>`;
            battle.times.forEach(t => {
                const fightSec = t.h * 3600 + t.m * 60;
                let diff = fightSec - now;
                if (diff < 0) diff += daySeconds;
                const key = `${battle.name}-${t.h}-${t.m}`;
                const isNearest = key === nearestKey;
                const hStr = String(t.h).padStart(2,'0');
                const mStr = String(t.m).padStart(2,'0');
                const nearMark = isNearest ? ' <span style="color:#ff6666;font-size:10px;">◀ ближайший</span>' : '';
                html += `<div style="padding-left:8px;margin-bottom:2px;">${hStr}:${mStr}мск — ${formatDiff(diff)}${nearMark}</div>`;
            });
            html += `</div>`;
        });

        el.innerHTML = html;
    }

    function startScheduleTicker() {
        updateScheduleTab();
        setInterval(updateScheduleTab, 1000);
    }

    // ── УВЕДОМЛЕНИЯ О БОЯХ ────────────────────────────────────────────────────

    const NOTIF_ENABLED_KEY  = 'fadd_notif_enabled';
    const NOTIF_MINUTES_KEY  = 'fadd_notif_minutes';
    const NOTIF_FIRED_KEY    = 'fadd_notif_fired'; // "name-h-m" уже отправленные сегодня

    const ALL_NOTIF_BATTLES = [
        { name: 'Клановый турнир',     times: [{ h:11,m:0 },{ h:19,m:0 }] },
        { name: 'Король бессмертных',  times: [{ h:12,m:30 },{ h:16,m:30 },{ h:22,m:30 }] },
        { name: 'Древние алтари',      times: [{ h:14,m:0 },{ h:21,m:0 }] },
        { name: 'Долина бессмертных',  times: [{ h:10,m:0 },{ h:16,m:0 },{ h:22,m:0 }] },
        { name: 'Клановый колизей',    times: [{ h:10,m:30 },{ h:15,m:0 }] },
    ];

    const NOTIF_SOUND_URL      = 'https://www.myinstants.com/media/sounds/oshiete-oshiete-yo.mp3';
    const NOTIF_SOUND_KEY      = 'fadd_notif_sound';
    const NOTIF_SOUND_STARTED  = 'fadd_notif_sound_started'; // timestamp начала воспроизведения
    const NOTIF_SOUND_DURATION = 30; // длительность трека в секундах (с запасом)

    function playNotifSoundAt(offsetSec) {
        const soundType = localStorage.getItem(NOTIF_SOUND_KEY) || 'oshiete';
        if (soundType === 'oshiete') {
            try {
                const audio = new Audio(NOTIF_SOUND_URL);
                audio.volume = 0.7;
                audio.currentTime = offsetSec || 0;
                const p = audio.play();
                if (p !== undefined) p.catch(() => { playBeepSound(); });
                return;
            } catch(e) {}
        }
        playBeepSound();
    }

    function playNotifSound() {
        const now = Date.now();
        localStorage.setItem(NOTIF_SOUND_STARTED, now.toString());
        playNotifSoundAt(0);
    }

    // При загрузке страницы — проверяем, был ли звук прерван обновлением
    function resumeNotifSoundIfNeeded() {
        const started = parseInt(localStorage.getItem(NOTIF_SOUND_STARTED) || '0', 10);
        if (!started) return;
        const elapsed = (Date.now() - started) / 1000;
        if (elapsed >= 0 && elapsed < NOTIF_SOUND_DURATION) {
            // Звук был прерван — доигрываем с нужного места
            localStorage.removeItem(NOTIF_SOUND_STARTED);
            playNotifSoundAt(elapsed);
        } else {
            // Устаревшая запись — чистим
            localStorage.removeItem(NOTIF_SOUND_STARTED);
        }
    }

    function playBeepSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.15, 0.3].forEach((delay, i) => {
                const osc  = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = i === 0 ? 880 : i === 1 ? 660 : 440;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0, ctx.currentTime + delay);
                gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.35);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 0.4);
            });
        } catch(e) {}
    }

    function sendBattleNotif(name, minutesBefore, diffSec) {
        const minsLeft = Math.round(diffSec / 60);
        const title = `⚔ ${name}`;
        const body  = minutesBefore <= 1
            ? `Сражение начинается прямо сейчас!`
            : `Сражение через ${minsLeft} мин!`;

        playNotifSound();

        if (Notification.permission === 'granted') {
            const n = new Notification(title, {
                body,
                icon: 'https://tiwar.ru/favicon.ico',
                tag:  `fadd-battle-${name}`,
                requireInteraction: false,
            });
            setTimeout(() => n.close(), 8000);
        }
    }

    function checkBattleNotifications() {
        if (localStorage.getItem(NOTIF_ENABLED_KEY) !== '1') return;
        if (Notification.permission !== 'granted') return;

        const minutesBefore = parseInt(localStorage.getItem(NOTIF_MINUTES_KEY) || '10', 10);
        const threshold = minutesBefore * 60; // секунды
        const now = getMskTotalSeconds();
        const daySeconds = 86400;

        // Ключ дня для сброса fired-списка
        const kyivDate = getKyivDate();
        const dayKey = `${kyivDate.getFullYear()}-${kyivDate.getMonth()}-${kyivDate.getDate()}`;
        let fired = JSON.parse(localStorage.getItem(NOTIF_FIRED_KEY) || '{}');
        // Сброс если новый день
        if (fired._day !== dayKey) fired = { _day: dayKey };

        ALL_NOTIF_BATTLES.forEach(battle => {
            battle.times.forEach(t => {
                const fightKey = `${battle.name}-${t.h}-${t.m}`;
                if (fired[fightKey]) return; // уже отправляли

                const fightSec = t.h * 3600 + t.m * 60;
                let diff = fightSec - now;
                if (diff < 0) diff += daySeconds;

                // Попадает в окно [threshold, threshold+60] — отправить один раз
                if (diff <= threshold && diff > threshold - 60) {
                    fired[fightKey] = true;
                    localStorage.setItem(NOTIF_FIRED_KEY, JSON.stringify(fired));
                    sendBattleNotif(battle.name, minutesBefore, diff);
                }
            });
        });
    }

    function initNotifications() {
        const enabledChk  = document.getElementById('notif-enabled');
        const minutesInp  = document.getElementById('notif-minutes');
        const warnEl      = document.getElementById('notif-permission-warn');
        const soundSelect = document.getElementById('notif-sound-select');

        if (!enabledChk || !minutesInp) return;

        // Восстановить сохранённые значения
        enabledChk.checked = localStorage.getItem(NOTIF_ENABLED_KEY) === '1';
        minutesInp.value   = localStorage.getItem(NOTIF_MINUTES_KEY) || '10';

        // Инициализация звука
        if (soundSelect) {
            soundSelect.value = localStorage.getItem(NOTIF_SOUND_KEY) || 'oshiete';
            soundSelect.addEventListener('change', () => {
                localStorage.setItem(NOTIF_SOUND_KEY, soundSelect.value);
            });
        }

        function clampMinutes(v) { return Math.max(1, Math.min(50, parseInt(v) || 10)); }

        minutesInp.addEventListener('change', () => {
            minutesInp.value = clampMinutes(minutesInp.value);
            localStorage.setItem(NOTIF_MINUTES_KEY, minutesInp.value);
        });

        enabledChk.addEventListener('change', () => {
            if (enabledChk.checked) {
                if (Notification.permission === 'default') {
                    if (warnEl) warnEl.style.display = 'block';
                    Notification.requestPermission().then(perm => {
                        if (warnEl) warnEl.style.display = 'none';
                        if (perm === 'granted') {
                            localStorage.setItem(NOTIF_ENABLED_KEY, '1');
                        } else {
                            enabledChk.checked = false;
                        }
                    });
                } else if (Notification.permission === 'granted') {
                    localStorage.setItem(NOTIF_ENABLED_KEY, '1');
                    if (warnEl) warnEl.style.display = 'none';
                } else {
                    // denied
                    enabledChk.checked = false;
                    if (warnEl) {
                        warnEl.textContent = '❌ Уведомления заблокированы в браузере';
                        warnEl.style.display = 'block';
                    }
                }
            } else {
                localStorage.setItem(NOTIF_ENABLED_KEY, '0');
            }
        });

        // Восстанавливаем прерванный звук если страница обновилась во время воспроизведения
        resumeNotifSoundIfNeeded();

        // Запускаем проверку каждые 30 сек
        setInterval(checkBattleNotifications, 30000);
        checkBattleNotifications(); // сразу при старте

        // Кнопка проверки
        const testBtn = document.getElementById('notif-test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                const mins = clampMinutes(minutesInp.value);
                if (Notification.permission !== 'granted') {
                    Notification.requestPermission().then(perm => {
                        if (perm === 'granted') sendBattleNotif('Тестовый бой', mins, mins * 60);
                    });
                } else {
                    sendBattleNotif('Тестовый бой', mins, mins * 60);
                }
            });
        }
    }

    /**
     * Секунды от полуночи МСК до ближайшего боя.
     * Отрицательное — бой уже начался (сколько секунд назад).
     */
    function secondsToNextUndyingFight() {
        const now = getMskTotalSeconds();
        const daySeconds = 86400;
        let minDiff = Infinity;
        UNDYING_FIGHT_MSK.forEach(f => {
            const fightSec = f.h * 3600 + f.m * 60;
            let diff = fightSec - now;
            if (diff < -daySeconds / 2) diff += daySeconds;
            if (diff > daySeconds / 2) diff -= daySeconds;
            if (Math.abs(diff) < Math.abs(minDiff)) minDiff = diff;
        });
        return minDiff;
    }

    /**
     * true — сейчас нужно заходить на страницу Долины (за 60 сек до боя)
     * или идёт бой (до +300 сек после старта).
     */
    function isUndyingTime() {
        const diff = secondsToNextUndyingFight();
        return diff >= -60 && diff <= 300;
    }

    function runUndying(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // ── ПРИОРИТЕТ: если кнопка "Атаковать" видна — жмём ВСЕГДА,
        //    даже если таймер говорит "не время". Бой уже идёт.
        const attackBtn = document.querySelector('a[href*="/undying/hit/"]');
        if (attackBtn) {
            const lastAtk = parseInt(localStorage.getItem(UNDYING_ATK_KEY) || '0', 10);
            if (now - lastAtk >= 5000) {
                localStorage.setItem(UNDYING_ATK_KEY, now.toString());
                console.log('[undying] атака');
                forceClick(attackBtn);
            }
            return true;
        }

        // ── Если мы на странице /undying/hit/ но кнопки нет — страница не обновилась
        if (url.includes('/undying/hit/')) {
            const lastRef = parseInt(localStorage.getItem(UNDYING_REF_KEY) || '0', 10);
            if (now - lastRef >= 5000) {
                localStorage.setItem(UNDYING_REF_KEY, now.toString());
                console.log('[undying] на странице боя, кнопки нет — обновляем');
                window.location.reload();
            }
            return true;
        }

        const diffSec = secondsToNextUndyingFight();

        // ── Не время Долины ────────────────────────────────────────────────────
        if (diffSec < -60 || diffSec > 300) {
            console.log('[undying] не время боя, пропуск');
            return false;
        }

        // ── Переходим на страницу Долины если не там ──────────────────────────
        if (!url.includes('/undying/')) {
            const last = parseInt(localStorage.getItem(UNDYING_NAV_KEY) || '0', 10);
            if (now - last < 3000) return true;
            localStorage.setItem(UNDYING_NAV_KEY, now.toString());
            console.log('[undying] переходим на /undying/');
            window.location.href = 'https://tiwar.ru/undying/';
            return true;
        }

        // ── Кнопка "Войти в бой" — нажимаем однократно ────────────────────────
        const enterBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes('/undying/enterGame/')
        );
        if (enterBtn) {
            const last = parseInt(localStorage.getItem(UNDYING_NAV_KEY) || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem(UNDYING_NAV_KEY, now.toString());
            console.log('[undying] входим в бой');
            forceClick(enterBtn);
            return true;
        }

        // ── Кнопка "Пополнить энергию" — жмём ОДИН раз за весь бой ──────────
        const manaBtn = document.querySelector('a[href*="/undying/mana/"]');
        if (manaBtn) {
            const manaDone = localStorage.getItem(UNDYING_MANA_KEY) || '';
            const mskD = getMskDate();
            const manaKey = `${mskD.getFullYear()}-${mskD.getMonth()}-${mskD.getDate()}-${Math.floor(mskD.getHours() / 6)}`;
            if (manaDone !== manaKey) {
                localStorage.setItem(UNDYING_MANA_KEY, manaKey);
                console.log('[undying] пополняем энергию');
                forceClick(manaBtn);
                return true;
            }
        }

        // ── Бой ещё не начался (нет ни одной кнопки) — обновляем каждые 5 сек
        const lastRef = parseInt(localStorage.getItem(UNDYING_REF_KEY) || '0', 10);
        if (now - lastRef >= 5000) {
            localStorage.setItem(UNDYING_REF_KEY, now.toString());
            console.log('[undying] ждём начала боя, обновляем...');
            window.location.reload();
        }
        return true;
    }

    // ── АВТО СРАЖЕНИЯ: вспомогательные функции ────────────────────────────────

    const CLANFIGHT_FIGHT_MSK      = [{ h: 11, m: 0 }, { h: 19, m: 0 }];
    const KING_FIGHT_MSK           = [{ h: 12, m: 30 }, { h: 16, m: 30 }, { h: 22, m: 30 }];
    const ALTARS_FIGHT_MSK         = [{ h: 14, m: 0 }, { h: 21, m: 0 }];
    const CLANCOLISEUM_FIGHT_MSK   = [{ h: 10, m: 30 }, { h: 15, m: 0 }];

    const CLANFIGHT_NAV_KEY       = 'fadd_clanfight_nav_last';
    const CLANFIGHT_REF_KEY       = 'fadd_clanfight_ref_last';
    const KING_NAV_KEY            = 'fadd_king_nav_last';
    const KING_REF_KEY            = 'fadd_king_ref_last';
    const ALTARS_NAV_KEY          = 'fadd_altars_nav_last';
    const ALTARS_REF_KEY          = 'fadd_altars_ref_last';
    const CLANCOLISEUM_NAV_KEY    = 'fadd_clancoliseum_nav_last';
    const CLANCOLISEUM_REF_KEY    = 'fadd_clancoliseum_ref_last';

    /**
     * Возвращает секунды до ближайшего боя из расписания МСК.
     * Отрицательное — бой уже начался (сколько секунд назад).
     */
    function secondsToNextFight(schedule) {
        const now = getMskTotalSeconds();
        const daySeconds = 86400;
        let minDiff = Infinity;
        schedule.forEach(f => {
            const fightSec = f.h * 3600 + f.m * 60;
            let diff = fightSec - now;
            if (diff < -daySeconds / 2) diff += daySeconds;
            if (diff > daySeconds / 2) diff -= daySeconds;
            if (Math.abs(diff) < Math.abs(minDiff)) minDiff = diff;
        });
        return minDiff;
    }

    /**
     * Универсальный обработчик сражений.
     * Использует только фиксированное расписание МСК.
     * За 60 сек до боя переходит на страницу и обновляет её каждые 5 сек пока не появится кнопка входа.
     */
    function runBattleAuto(name, path, url_base, enterHref, navKey, refKey, schedule, enterBefore = 60, stayAfter = 300) {
        const url = window.location.href;
        const now = Date.now();
        const diffSec = secondsToNextFight(schedule);

        // Не время боя
        if (diffSec > enterBefore) {
            console.log(`[${name}] не время, пропуск (diff=${diffSec}с)`);
            return false;
        }

        // Бой давно закончился
        if (diffSec < -stayAfter) {
            console.log(`[${name}] бой завершён, пропуск`);
            return false;
        }

        // Переходим на страницу боя если не там
        if (!url.includes(path)) {
            const last = parseInt(localStorage.getItem(navKey) || '0', 10);
            if (now - last < 3000) return true;
            localStorage.setItem(navKey, now.toString());
            console.log(`[${name}] переходим на ${url_base} (diff=${diffSec}с)`);
            window.location.href = url_base;
            return true;
        }

        // Мы на странице — ищем кнопку входа в бой
        const enterBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes(enterHref)
        );
        if (enterBtn) {
            const last = parseInt(localStorage.getItem(navKey) || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem(navKey, now.toString());
            console.log(`[${name}] входим в бой`);
            forceClick(enterBtn);
            return true;
        }

        // ── Бой идёт — обрабатываем атаку/защиту (как в авто-охоте/колизее) ────
        const attackBtn = document.querySelector(`a[href*="${path}attack/"]`);
        if (attackBtn) {
            const hp = getColiseumHP();
            console.log(`[${name}] HP:`, hp);

            // Уворот — если HP упал с прошлой проверки и нет кд (15 сек)
            if (hp !== null) {
                const prevHp = parseFloat(localStorage.getItem(`fadd_${name}_hp_last`) || '');
                if (!isNaN(prevHp) && hp < prevHp) {
                    const dodgeBtn = document.querySelector(`a[href*="${path}dodge/"]`);
                    if (dodgeBtn) {
                        const lastDodge = parseInt(localStorage.getItem(`fadd_${name}_dodge_last`) || '0', 10);
                        if (now - lastDodge >= 15000) {
                            localStorage.setItem(`fadd_${name}_dodge_last`, now.toString());
                            console.log(`[${name}] уворот (HP упал: ${prevHp}% → ${hp}%)`);
                            forceClick(dodgeBtn);
                        }
                    }
                }
                localStorage.setItem(`fadd_${name}_hp_last`, hp.toString());
            }

            // Настойка — при HP ≤ 20%, кд 90 сек
            if (hp !== null && hp <= 20) {
                const healBtn = document.querySelector(`a[href*="${path}heal/"]`);
                if (healBtn) {
                    const lastHeal = parseInt(localStorage.getItem(`fadd_${name}_heal_last`) || '0', 10);
                    if (now - lastHeal >= 90000) {
                        localStorage.setItem(`fadd_${name}_heal_last`, now.toString());
                        console.log(`[${name}] настойка (HP`, hp, '%)');
                        forceClick(healBtn);
                    }
                }
            }

            // Трава — при HP ≤ 80% (но > 20%), кд 60 сек
            if (hp !== null && hp <= 80 && hp > 20) {
                const grassBtn = document.querySelector(`a[href*="${path}buyres/2/"]`);
                if (grassBtn) {
                    const lastGrass = parseInt(localStorage.getItem(`fadd_${name}_grass_last`) || '0', 10);
                    if (now - lastGrass >= 60000) {
                        localStorage.setItem(`fadd_${name}_grass_last`, now.toString());
                        console.log(`[${name}] трава (HP`, hp, '%)');
                        forceClick(grassBtn);
                    }
                }
            }

            // Камень — если HP > 80% (атакуем в полную силу), кд 60 сек
            if (hp !== null && hp > 80) {
                const stoneBtn = document.querySelector(`a[href*="${path}buyres/1/"]`);
                if (stoneBtn) {
                    const lastStone = parseInt(localStorage.getItem(`fadd_${name}_stone_last`) || '0', 10);
                    if (now - lastStone >= 60000) {
                        localStorage.setItem(`fadd_${name}_stone_last`, now.toString());
                        console.log(`[${name}] камень (HP`, hp, '%)');
                        forceClick(stoneBtn);
                    }
                }
            }

            // Атака — раз в 5 сек
            const lastAtk = parseInt(localStorage.getItem(`fadd_${name}_attack_last`) || '0', 10);
            if (now - lastAtk >= 5000) {
                localStorage.setItem(`fadd_${name}_attack_last`, now.toString());
                console.log(`[${name}] атака`);
                forceClick(attackBtn);
            }

            return true;
        }

        // Кнопки нет — ждём начала, обновляем каждые 5 сек
        const lastRef = parseInt(localStorage.getItem(refKey) || '0', 10);
        if (now - lastRef >= 5000) {
            localStorage.setItem(refKey, now.toString());
            console.log(`[${name}] ждём начала боя, обновляем...`);
            window.location.reload();
        }
        return true;
    }

    function runClanfight(force = false) {
        return runBattleAuto(
            'clanfight',
            '/clanfight/',
            'https://tiwar.ru/clanfight/',
            '/clanfight/enterFight/',
            CLANFIGHT_NAV_KEY,
            CLANFIGHT_REF_KEY,
            CLANFIGHT_FIGHT_MSK
        );
    }

    function runKing(force = false) {
        return runBattleAuto(
            'king',
            '/king/',
            'https://tiwar.ru/king/',
            '/king/enterGame/',
            KING_NAV_KEY,
            KING_REF_KEY,
            KING_FIGHT_MSK
        );
    }

    function runAltars(force = false) {
        return runBattleAuto(
            'altars',
            '/altars/',
            'https://tiwar.ru/altars/',
            '/altars/enterFight/',
            ALTARS_NAV_KEY,
            ALTARS_REF_KEY,
            ALTARS_FIGHT_MSK
        );
    }

    const CLANCOLISEUM_APPLY_KEY = 'fadd_clancoliseum_apply_last';

    function runClancoliseum(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // Если мы на странице клан-колизея — сразу ищем кнопку «Подать заявку»
        if (url.includes('/clancoliseum/')) {
            const applyBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
                (a.getAttribute('href') || '').includes('/clancoliseum/enterFight/')
            );
            if (applyBtn) {
                const last = parseInt(localStorage.getItem(CLANCOLISEUM_APPLY_KEY) || '0', 10);
                if (now - last >= 5000) {
                    localStorage.setItem(CLANCOLISEUM_APPLY_KEY, now.toString());
                    console.log('[clancoliseum] подаём заявку');
                    forceClick(applyBtn);
                }
                return true;
            }
        }

        // Если заявку подали недавно — не переходим лишний раз
        const lastApply = parseInt(localStorage.getItem(CLANCOLISEUM_APPLY_KEY) || '0', 10);
        if (now - lastApply < 60000) return false;

        // Переходим на страницу чтобы проверить наличие кнопки
        if (!url.includes('/clancoliseum/')) {
            const last = parseInt(localStorage.getItem(CLANCOLISEUM_NAV_KEY) || '0', 10);
            if (now - last < 30000) return false; // не чаще раза в 30 сек
            localStorage.setItem(CLANCOLISEUM_NAV_KEY, now.toString());
            console.log('[clancoliseum] переходим проверить заявку');
            window.location.href = 'https://tiwar.ru/clancoliseum/?from=fights';
            return true;
        }

        return false;
    }

    /**
     * Парсит блок противника. Возвращает { total, btn } или null.
     * total = сумма Сила+Жизнь+Удача+Броня
     */
    function parseLeagueOpponent(block) {
        const text = block.textContent || '';
        function stat(label) {
            const m = text.match(new RegExp(label + '[^\\d]*(\\d+)'));
            return m ? parseInt(m[1], 10) : 0;
        }
        const total = stat('Сила') + stat('Жизнь') + stat('Удача') + stat('Броня');
        const btn = Array.from(block.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes('/league/fight/')
        );
        return btn ? { total, btn } : null;
    }

    function runLeague(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // Проверяем — уже делали сегодня?
        const doneDateStr = localStorage.getItem(LEAGUE_DONE_KEY) || '';
        if (doneDateStr === todayStr()) {
            console.log('[league] сегодня уже атаковали, пропуск');
            return false;
        }

        // Проверяем временное окно — только в 00:xx
        if (!isLeagueTime()) {
            console.log('[league] ещё не 00:00, пропуск');
            return false;
        }

        // Если не на странице лиги — переходим
        if (!url.includes('/league')) {
            const last = parseInt(localStorage.getItem(LEAGUE_LAST_KEY) || '0', 10);
            if (now - last < 3000) return true;
            localStorage.setItem(LEAGUE_LAST_KEY, now.toString());
            console.log('[league] переходим на /league/');
            window.location.href = 'https://tiwar.ru/league/';
            return true;
        }

        // Мы на странице лиги — парсим противников
        const blocks = Array.from(document.querySelectorAll('.block_zero')).filter(b =>
            (b.querySelector('a[href*="/league/fight/"]'))
        );

        if (!blocks.length) {
            console.log('[league] блоки противников не найдены, ждём загрузки...');
            return true;
        }

        const opponents = blocks
            .map(b => parseLeagueOpponent(b))
            .filter(Boolean);

        if (!opponents.length) {
            console.log('[league] не удалось распарсить противников');
            return false;
        }

        // Находим самого слабого по сумме параметров
        opponents.sort((a, b) => a.total - b.total);
        const weakest = opponents[0];

        console.log(`[league] атакуем самого слабого (total=${weakest.total})`);

        const last = parseInt(localStorage.getItem(LEAGUE_LAST_KEY) || '0', 10);
        if (now - last < 1500) return true;
        localStorage.setItem(LEAGUE_LAST_KEY, now.toString());

        // Запоминаем что сегодня уже атаковали
        localStorage.setItem(LEAGUE_DONE_KEY, todayStr());
        forceClick(weakest.btn);
        return true;
    }

    // ── КОЛИЗЕЙ ────────────────────────────────────────────────────────────────

    const COL_REFRESH_LAST_KEY  = 'fadd_col_refresh_last';
    const COL_ATTACK_LAST_KEY   = 'fadd_col_attack_last';
    const COL_GRASS_LAST_KEY    = 'fadd_col_grass_last';
    const COL_STONE_LAST_KEY    = 'fadd_col_stone_last';
    const COL_HEAL_LAST_KEY     = 'fadd_col_heal_last';
    const COL_DODGE_LAST_KEY    = 'fadd_col_dodge_last';
    const COL_HP_LAST_KEY       = 'fadd_col_hp_last';

    /**
     * Читает HP из .rate.fl style="width:XX%"
     * Берём .bf_left если есть, иначе первый .rate.fl на странице.
     */
    function getColiseumHP() {
        // В колизее нет .bf_left, ищем просто первый .rate.fl
        const bar = document.querySelector('.rate.fl');
        if (!bar) return null;
        const m = (bar.getAttribute('style') || '').match(/width:\s*(\d+(\.\d+)?)%/);
        return m ? parseFloat(m[1]) : null;
    }

    function runColiseum(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // ── 1. Переход на колизей ──────────────────────────────────────────────
        if (!url.includes('/coliseum')) {
            const last = parseInt(localStorage.getItem('fadd_col_nav_last') || '0', 10);
            if (now - last < 3000) return true;
            localStorage.setItem('fadd_col_nav_last', now.toString());
            console.log('[coliseum] переходим на /coliseum/');
            window.location.href = 'https://tiwar.ru/coliseum/';
            return true;
        }

        // ── 2. Бой завершён — "Начать новый бой" ──────────────────────────────
        const newFightBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes('/coliseum/enterFight/') &&
            (a.textContent || '').includes('Начать новый бой')
        );
        if (newFightBtn) {
            const last = parseInt(localStorage.getItem('fadd_col_nav_last') || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem('fadd_col_nav_last', now.toString());
            console.log('[coliseum] новый бой');
            forceClick(newFightBtn);
            return true;
        }

        // ── 3. Встать в очередь ────────────────────────────────────────────────
        const enterBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes('/coliseum/enterFight/') &&
            (a.textContent || '').includes('Встать в очередь')
        );
        if (enterBtn) {
            const last = parseInt(localStorage.getItem('fadd_col_nav_last') || '0', 10);
            if (now - last < 1500) return true;
            localStorage.setItem('fadd_col_nav_last', now.toString());
            console.log('[coliseum] встаём в очередь');
            forceClick(enterBtn);
            return true;
        }

        // ── 4. Ждём в очереди — кликаем "Обновить" раз в 700 мс ──────────────
        const refreshBtn = Array.from(document.querySelectorAll('a.btn')).find(a =>
            (a.getAttribute('href') || '').includes('/coliseum/') &&
            (a.textContent || '').trim() === 'Обновить'
        );
        if (refreshBtn) {
            const last = parseInt(localStorage.getItem(COL_REFRESH_LAST_KEY) || '0', 10);
            if (now - last >= 700) {
                localStorage.setItem(COL_REFRESH_LAST_KEY, now.toString());
                console.log('[coliseum] обновляем очередь');
                forceClick(refreshBtn);
            }
            return true;
        }

        // ── 5. Идёт бой ───────────────────────────────────────────────────────
        const attackBtn = document.querySelector('a[href*="/coliseum/atk/"]');
        if (!attackBtn) return true; // Страница ещё грузится

        const hp = getColiseumHP();
        console.log('[coliseum] HP:', hp);

        // Уворот — если HP упал с прошлой проверки и нет кд (15 сек)
        if (hp !== null) {
            const prevHp = parseFloat(localStorage.getItem(COL_HP_LAST_KEY) || '');
            if (!isNaN(prevHp) && hp < prevHp) {
                const dodgeBtn = document.querySelector('a[href*="/coliseum/dodge/"]');
                if (dodgeBtn) {
                    const last = parseInt(localStorage.getItem(COL_DODGE_LAST_KEY) || '0', 10);
                    if (now - last >= 15000) {
                        localStorage.setItem(COL_DODGE_LAST_KEY, now.toString());
                        console.log(`[coliseum] уворот (HP упал: ${prevHp}% → ${hp}%)`);
                        forceClick(dodgeBtn);
                    }
                }
            }
            localStorage.setItem(COL_HP_LAST_KEY, hp.toString());
        }

        // Настойка — при HP ≤ 20%, кд 90 сек
        if (hp !== null && hp <= 20) {
            const healBtn = document.querySelector('a[href*="/coliseum/heal/"]');
            if (healBtn) {
                const last = parseInt(localStorage.getItem(COL_HEAL_LAST_KEY) || '0', 10);
                if (now - last >= 90000) {
                    localStorage.setItem(COL_HEAL_LAST_KEY, now.toString());
                    console.log('[coliseum] настойка (HP', hp, '%)');
                    forceClick(healBtn);
                }
            }
        }

        // Трава — при HP ≤ 80% (но > 20%), кд 60 сек
        if (hp !== null && hp <= 80 && hp > 20) {
            const grassBtn = document.querySelector('a[href*="/coliseum/grass/"]');
            if (grassBtn) {
                const last = parseInt(localStorage.getItem(COL_GRASS_LAST_KEY) || '0', 10);
                if (now - last >= 60000) {
                    localStorage.setItem(COL_GRASS_LAST_KEY, now.toString());
                    console.log('[coliseum] трава (HP', hp, '%)');
                    forceClick(grassBtn);
                }
            }
        }

        // Камень — если HP > 80% (атакуем в полную силу), кд 60 сек
        if (hp !== null && hp > 80) {
            const stoneBtn = document.querySelector('a[href*="/coliseum/stone/"]');
            if (stoneBtn) {
                const last = parseInt(localStorage.getItem(COL_STONE_LAST_KEY) || '0', 10);
                if (now - last >= 60000) {
                    localStorage.setItem(COL_STONE_LAST_KEY, now.toString());
                    console.log('[coliseum] камень (HP', hp, '%)');
                    forceClick(stoneBtn);
                }
            }
        }

        // Атака — раз в 5 сек
        const lastAtk = parseInt(localStorage.getItem(COL_ATTACK_LAST_KEY) || '0', 10);
        if (now - lastAtk >= 5000) {
            localStorage.setItem(COL_ATTACK_LAST_KEY, now.toString());
            console.log('[coliseum] атака');
            forceClick(attackBtn);
        }

        return true;
    }

    // ── КАЗНА КЛАНА ────────────────────────────────────────────────────────────

    const TREASURY_NAV_KEY   = 'fadd_treasury_nav_last';
    const TREASURY_ACTION_KEY = 'fadd_treasury_action_last';
    const TREASURY_CLAN_ID   = '41140';
    const TREASURY_STEP_KEY  = 'fadd_treasury_step';
    const TREASURY_STEP_AT   = 'fadd_treasury_step_at';

    function treasuryReset() {
        localStorage.setItem(TREASURY_STEP_KEY, 'idle');
        localStorage.removeItem(TREASURY_STEP_AT);
    }

    function runTreasury(force = false) {
        const url = window.location.href;
        const now = Date.now();

        // Не на странице казны — переходим
        if (!url.includes('/money/')) {
            const last = parseInt(localStorage.getItem(TREASURY_NAV_KEY) || '0', 10);
            if (now - last < 3000) return true;
            localStorage.setItem(TREASURY_NAV_KEY, now.toString());
            localStorage.setItem(TREASURY_STEP_KEY, 'waiting_page');
            localStorage.setItem(TREASURY_STEP_AT, now.toString());
            const dest = `https://tiwar.ru/clan/${TREASURY_CLAN_ID}/money/`;
            console.log('[treasury] переходим на', dest);
            window.location.href = dest;
            return true;
        }

        const step = localStorage.getItem(TREASURY_STEP_KEY) || 'idle';
        const stepAt = parseInt(localStorage.getItem(TREASURY_STEP_AT) || '0', 10);

        // ── ШАГ 1: ждём 1 сек после загрузки страницы ────────────────────────
        if (step === 'idle' || step === 'waiting_page') {
            if (step === 'idle') {
                localStorage.setItem(TREASURY_STEP_KEY, 'waiting_page');
                localStorage.setItem(TREASURY_STEP_AT, now.toString());
                console.log('[treasury] прибыли на страницу, ждём 1 сек...');
                return true;
            }
            if (now - stepAt < 1000) {
                console.log('[treasury] ждём 1 сек...');
                return true;
            }
            // 1 сек прошла — вводим число
            const pageText = document.body?.textContent || '';
            const silverMatch = pageText.match(/Доступно пополнение казны сегодня[\s\S]*?Серебро:[^\d]*(\d+)/);
            const available = silverMatch ? parseInt(silverMatch[1], 10) : 0;
            console.log('[treasury] доступно серебра:', available);

            if (available <= 0) {
                console.log('[treasury] серебра нет, идём дальше');
                treasuryReset();
                return false;
            }

            const normalForm = Array.from(document.querySelectorAll('form')).find(f => {
                const t = f.querySelector('input[name="type"]');
                return t && t.value === 'normal';
            });

            if (!normalForm) {
                console.log('[treasury] форма не найдена, ждём ещё...');
                return true;
            }

            const silverInput = normalForm.querySelector('input[name="silver"]');
            if (silverInput) {
                silverInput.value = available;
                silverInput.dispatchEvent(new Event('input', { bubbles: true }));
                silverInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[treasury] число введено:', available);
            }

            localStorage.setItem(TREASURY_STEP_KEY, 'waiting_submit');
            localStorage.setItem(TREASURY_STEP_AT, now.toString());
            return true;
        }

        // ── ШАГ 2: ждём 1 сек после ввода, затем жмём Пополнить ─────────────
        if (step === 'waiting_submit') {
            if (now - stepAt < 1000) {
                console.log('[treasury] ждём 1 сек перед кликом...');
                return true;
            }

            // Ищем кнопку Пополнить: input[type="submit"] со значением "Пополнить"
            const submitBtn = Array.from(document.querySelectorAll('input[type="submit"]'))
                .find(el => (el.value || '').includes('Пополнить'));

            if (submitBtn) {
                console.log('[treasury] жмём Пополнить');
                submitBtn.click();
            } else {
                // Запасной вариант — сабмит формы
                const normalForm = Array.from(document.querySelectorAll('form')).find(f => {
                    const t = f.querySelector('input[name="type"]');
                    return t && t.value === 'normal';
                });
                if (normalForm) {
                    console.log('[treasury] кнопка не найдена, сабмитим форму');
                    normalForm.submit();
                }
            }

            localStorage.setItem(TREASURY_STEP_KEY, 'waiting_done');
            localStorage.setItem(TREASURY_STEP_AT, now.toString());
            return true;
        }

        // ── ШАГ 3: ждём 2 сек после клика, затем идём дальше ────────────────
        if (step === 'waiting_done') {
            if (now - stepAt < 2000) {
                console.log('[treasury] ждём 2 сек после Пополнить...');
                return true;
            }
            console.log('[treasury] готово, идём дальше');
            treasuryReset();
            return false;
        }

        treasuryReset();
        return false;
    }

    function initUtilityTab() {
        const statusEl = document.getElementById('utility-status');

        function showStatus(msg, color = '#ff4444') {
            if (!statusEl) return;
            statusEl.style.color = color;
            statusEl.textContent = msg;
            statusEl.style.display = 'block';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }

        function hidePageImages() {
            let count = 0;
            document.querySelectorAll('img').forEach(img => {
                const src = img.getAttribute('src') || '';
                if (src.includes('/images/') && !src.includes('/images/icon/')) {
                    img.style.display = 'none';
                    count++;
                }
            });
            document.querySelectorAll('[style*="background-image"]').forEach(el => {
                const style = el.getAttribute('style') || '';
                if (style.includes('/images/') && !style.includes('/images/icon/')) {
                    el.style.backgroundImage = 'none';
                    count++;
                }
            });
            return count;
        }

        // Применяем при загрузке если включено
        const hideEnabled = localStorage.getItem('fadd_hide_images') === '1';
        if (hideEnabled) {
            hidePageImages();
        }

        // Фон страницы
        function applyPageBg() {
            document.documentElement.style.setProperty('background', '#0d0000', 'important');
            document.body.style.setProperty('background', 'linear-gradient(160deg,#0d0000 0%,#1a0000 60%,#0d0000 100%)', 'important');
            // Красим все серые/белые фоновые блоки
            const selectors = ['table', 'td', 'tr', 'div', 'body'];
            const greyRe = /^(#[0-9a-f]{3,6}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|grey|gray|white|silver)$/i;
            document.querySelectorAll('*:not(#fadd-menu):not(#fadd-menu *)').forEach(el => {
                const bg = window.getComputedStyle(el).backgroundColor;
                if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return;
                // Парсим rgb
                const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (!m) return;
                const r = +m[1], g = +m[2], b = +m[3];
                // Серые/белые — где R≈G≈B и яркость > 30
                const isGrey = Math.abs(r-g) < 20 && Math.abs(g-b) < 20 && Math.abs(r-b) < 20 && r > 30;
                if (isGrey) {
                    // Тонируем в тёмно-красный, сохраняя относительную яркость
                    const brightness = (r / 255);
                    const nr = Math.round(13 + brightness * 30);
                    const ng = 0;
                    const nb = 0;
                    el.style.setProperty('background-color', `rgb(${nr},${ng},${nb})`, 'important');
                }
            });
        }

        function resetPageBg() {
            document.documentElement.style.removeProperty('background');
            document.body.style.removeProperty('background');
            document.querySelectorAll('*:not(#fadd-menu):not(#fadd-menu *)').forEach(el => {
                el.style.removeProperty('background-color');
            });
        }

        const bgEnabled = localStorage.getItem('fadd_custom_bg') === '1';
        if (bgEnabled) applyPageBg();

        const bgToggle = document.getElementById('utility-bg-toggle');
        if (bgToggle) {
            bgToggle.checked = bgEnabled;
            bgToggle.addEventListener('change', () => {
                if (bgToggle.checked) {
                    localStorage.setItem('fadd_custom_bg', '1');
                    applyPageBg();
                    showStatus('✓ Фон применён');
                } else {
                    localStorage.setItem('fadd_custom_bg', '0');
                    resetPageBg();
                    showStatus('Фон сброшен, обновите страницу', '#884444');
                }
            });
        }

        // Чекбокс
        const toggle = document.getElementById('utility-hide-images-toggle');
        if (toggle) {
            toggle.checked = hideEnabled;
            toggle.addEventListener('change', () => {
                if (toggle.checked) {
                    localStorage.setItem('fadd_hide_images', '1');
                    const count = hidePageImages();
                    showStatus(`✓ Скрыто ${count} изображений`);
                } else {
                    localStorage.setItem('fadd_hide_images', '0');
                    showStatus('Изображения будут видны после перезагрузки', '#aaa');
                }
            });
        }

        // Кнопка "Очистить кеш"
        const clearCacheBtn = document.getElementById('utility-clear-cache');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                // Принудительная перезагрузка без кеша (аналог Ctrl+Shift+R)
                window.location.reload(true);
            });
        }
    }


    // ── МУЗЫКАЛЬНЫЙ ПЛЕЕР ─────────────────────────────────────────────────────

    const MUSIC_PLAYLIST = [
        { title: 'Tokyo Ghoul OP1 — Unravel (TK)', url: 'https://files.catbox.moe/lrwcuu.mp3' },
    ];

    const MUSIC_VOL_KEY   = 'fadd_music_volume';
    const MUSIC_IDX_KEY   = 'fadd_music_index';

    let _musicAudio   = null;
    let _musicIdx     = 0;
    let _musicPlaying = false;

    function fmtTime(sec) {
        if (!isFinite(sec) || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function musicRenderPlaylist() {
        const playlistEl = document.getElementById('music-playlist');
        if (!playlistEl) return;

        // Очищаем и пересоздаём элементы (без innerHTML чтобы клики работали)
        playlistEl.innerHTML = '';
        MUSIC_PLAYLIST.forEach((t, i) => {
            const active = i === _musicIdx;
            const el = document.createElement('div');
            el.style.cssText = `cursor:pointer;padding:2px 4px;border-radius:3px;
                background:${active ? '#2a0000' : 'transparent'};
                color:${active ? '#ff4444' : '#884444'};
                border-left:${active ? '2px solid #ff2222' : '2px solid transparent'};
                margin-bottom:2px;user-select:none;`;
            el.textContent = (active ? '▶ ' : '') + t.title;
            el.addEventListener('click', () => {
                _musicIdx = i;
                musicLoad(true);
            });
            playlistEl.appendChild(el);
        });
    }

    function musicUpdateUI() {
        const titleEl = document.getElementById('music-title');
        const playBtn = document.getElementById('music-play');
        const fillEl  = document.getElementById('music-progress-fill');
        const curEl   = document.getElementById('music-time-cur');
        const durEl   = document.getElementById('music-time-dur');

        const track = MUSIC_PLAYLIST[_musicIdx];
        if (titleEl) titleEl.textContent = track ? track.title : '—';
        if (playBtn) playBtn.textContent = _musicPlaying ? '⏸' : '▶';

        if (_musicAudio && isFinite(_musicAudio.duration)) {
            const pct = (_musicAudio.currentTime / _musicAudio.duration) * 100;
            if (fillEl) fillEl.style.width = pct + '%';
            if (curEl)  curEl.textContent  = fmtTime(_musicAudio.currentTime);
            if (durEl)  durEl.textContent  = fmtTime(_musicAudio.duration);
        } else {
            if (fillEl) fillEl.style.width = '0%';
            if (curEl)  curEl.textContent  = '0:00';
            if (durEl)  durEl.textContent  = '0:00';
        }
    }

    function musicLoad(autoplay = false) {
        const track = MUSIC_PLAYLIST[_musicIdx];
        if (!track) return;

        localStorage.setItem(MUSIC_IDX_KEY, _musicIdx.toString());

        if (_musicAudio) {
            _musicAudio.pause();
            _musicAudio.src = '';
            _musicAudio = null;
        }

        _musicPlaying = false;
        musicUpdateUI();
        musicRenderPlaylist();

        const titleEl = document.getElementById('music-title');
        if (titleEl) titleEl.textContent = track.title;

        console.log('[music] загружаем напрямую:', track.url);

        _musicAudio = new Audio(track.url);
        _musicAudio.crossOrigin = 'anonymous';
        _musicAudio.volume = parseFloat(localStorage.getItem(MUSIC_VOL_KEY) || '0.5');

        _musicAudio.addEventListener('timeupdate', musicUpdateUI);
        _musicAudio.addEventListener('loadedmetadata', () => {
            console.log('[music] loadedmetadata, длительность:', _musicAudio.duration);
            musicUpdateUI();
        });
        _musicAudio.addEventListener('ended', () => {
            _musicIdx = (_musicIdx + 1) % MUSIC_PLAYLIST.length;
            musicLoad(true);
        });
        _musicAudio.addEventListener('error', (e) => {
            console.warn('[music] audio error:', e, _musicAudio && _musicAudio.error);
            // CORS fallback: убираем crossOrigin и пробуем ещё раз
            if (_musicAudio && _musicAudio.crossOrigin) {
                console.log('[music] CORS fallback: пробуем без crossOrigin');
                _musicAudio.pause();
                const fallback = new Audio(track.url);
                fallback.volume = parseFloat(localStorage.getItem(MUSIC_VOL_KEY) || '0.5');
                fallback.addEventListener('timeupdate', musicUpdateUI);
                fallback.addEventListener('loadedmetadata', musicUpdateUI);
                fallback.addEventListener('ended', () => {
                    _musicIdx = (_musicIdx + 1) % MUSIC_PLAYLIST.length;
                    musicLoad(true);
                });
                fallback.addEventListener('error', () => {
                    if (titleEl) titleEl.textContent = '❌ Ошибка: ' + track.title;
                });
                _musicAudio = fallback;
                if (autoplay) {
                    fallback.play().then(() => { _musicPlaying = true; musicUpdateUI(); musicRenderPlaylist(); }).catch(() => {
                        if (titleEl) titleEl.textContent = '▶ Нажми Play: ' + track.title;
                    });
                }
            } else {
                if (titleEl) titleEl.textContent = '❌ Ошибка: ' + track.title;
            }
        });

        if (autoplay) {
            _musicAudio.play().then(() => {
                console.log('[music] play() успешно');
                _musicPlaying = true;
                musicUpdateUI();
                musicRenderPlaylist();
            }).catch((err) => {
                console.warn('[music] play() отклонён:', err);
                if (titleEl) titleEl.textContent = '▶ Нажми Play: ' + track.title;
            });
        }

        musicUpdateUI();
        musicRenderPlaylist();
    }

    function initMusicTab() {
        const playBtn    = document.getElementById('music-play');
        const prevBtn    = document.getElementById('music-prev');
        const nextBtn    = document.getElementById('music-next');
        const volSlider  = document.getElementById('music-volume');
        const volVal     = document.getElementById('music-volume-val');
        const progressWrap = document.getElementById('music-progress-wrap');

        // Восстанавливаем индекс
        _musicIdx = parseInt(localStorage.getItem(MUSIC_IDX_KEY) || '0', 10);
        if (_musicIdx >= MUSIC_PLAYLIST.length) _musicIdx = 0;

        // Громкость
        const savedVol = parseFloat(localStorage.getItem(MUSIC_VOL_KEY) || '0.5');
        if (volSlider) {
            volSlider.value = Math.round(savedVol * 100);
            if (volVal) volVal.textContent = volSlider.value + '%';
            volSlider.addEventListener('input', () => {
                const v = parseInt(volSlider.value) / 100;
                localStorage.setItem(MUSIC_VOL_KEY, v.toFixed(2));
                if (volVal) volVal.textContent = volSlider.value + '%';
                if (_musicAudio) _musicAudio.volume = v;
            });
        }

        // Play/Pause
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (!_musicAudio) {
                    musicLoad(true);
                    return;
                }
                if (_musicPlaying) {
                    _musicAudio.pause();
                    _musicPlaying = false;
                } else {
                    _musicAudio.play().then(() => { _musicPlaying = true; musicUpdateUI(); }).catch(() => {});
                }
                musicUpdateUI();
            });
        }

        // Предыдущий
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                _musicIdx = (_musicIdx - 1 + MUSIC_PLAYLIST.length) % MUSIC_PLAYLIST.length;
                musicLoad(_musicPlaying);
            });
        }

        // Следующий
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                _musicIdx = (_musicIdx + 1) % MUSIC_PLAYLIST.length;
                musicLoad(_musicPlaying);
            });
        }

        // Перемотка по клику на прогресс-бар
        if (progressWrap) {
            progressWrap.addEventListener('click', (e) => {
                if (!_musicAudio || !isFinite(_musicAudio.duration)) return;
                const rect = progressWrap.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                _musicAudio.currentTime = pct * _musicAudio.duration;
                musicUpdateUI();
            });
        }

        // Обновляем прогресс каждую секунду (только таймер/бар, не плейлист)
        setInterval(musicUpdateUI, 1000);

        // Рендерим плейлист один раз при старте
        musicUpdateUI();
        musicRenderPlaylist();
    }

    function initFadd() {
        // Разморозить задачи которые новые (не были в старом сохранённом порядке)
        // чтобы они не оказались замороженными по умолчанию
        try {
            const savedOrder = JSON.parse(localStorage.getItem('fadd_custom_order') || 'null');
            if (Array.isArray(savedOrder)) {
                const frozen = getFrozenTasks();
                let changed = false;
                SEQUENTIAL_DEFAULT_ORDER.forEach(task => {
                    // Если задачи не было в старом сохранённом порядке — разморозить
                    if (!savedOrder.includes(task) && frozen.has(task)) {
                        frozen.delete(task);
                        changed = true;
                    }
                });
                if (changed) {
                    localStorage.setItem('fadd_frozen_tasks', JSON.stringify([...frozen]));
                }
            }
        } catch (e) {}

        createMenu();

        initUtilityTab();
        initNotifications();
        initMusicTab();

        // Если при старте страницы идёт сканирование таймеров — немедленно продолжаем
        if (localStorage.getItem(TIMER_SCAN_ACTIVE_KEY) === '1') {
            console.log('[timer-scan] продолжаем сканирование после перехода на страницу');
            setTimeout(() => {
                runTimerRefreshScan();
            }, 800);
        }

        if (!timerInitialized && document.body) {
            timerInitialized = true;
            window._fadd_alive = true;
            setInterval(runAutoHunt, 600);
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', initFadd);
    } else {
        initFadd();
    }
})();
