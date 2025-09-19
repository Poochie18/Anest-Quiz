// Small client-side persistence for quiz progress
// Saves selected answers and basic params to localStorage so users can resume later.
(function () {
    // legacy quiz_progress_v1 removed: do not create or read that key anymore

    function safeGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function safeSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
    function safeRemove(key) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    }

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            mode: params.get('mode'),
            from: params.get('from'),
            themeId: params.get('themeId'),
            count: params.get('count'),
            key: params.get('key') || params.get('session') || null
        };
    }

    function buildParamsSnapshotKey(p) {
        try {
            if (!p) p = getUrlParams();
            // key format: quiz_snapshot::mode=<mode>::themeId=<themeId>::count=<count>::from=<from>
            const parts = ['quiz_snapshot::mode=' + (p.mode || '')];
            parts.push('themeId=' + (p.themeId || ''));
            parts.push('count=' + (p.count || ''));
            parts.push('from=' + (p.from || ''));
            return parts.join('::');
        } catch (e) { return null; }
    }

    // Storage prefixes for random and theme tests. Theme tests will use a separate
    // namespace so they don't collide with random exam keys.
    const MAIN_PREFIX_RANDOM = 'quiz_random_v2::';
    const MAIN_PREFIX_THEME = 'quiz_theme_v1::';

    function makeMainKey(sessionKey, mode) {
        try {
            if (!sessionKey) return null;
            return (mode === 'theme' ? MAIN_PREFIX_THEME : MAIN_PREFIX_RANDOM) + sessionKey;
        } catch (e) { return null; }
    }

    // Given a sessionKey (without prefix), try to detect which main prefix it belongs to
    // by checking presence in localStorage. Returns one of MAIN_PREFIX_THEME, MAIN_PREFIX_RANDOM or null.
    function resolvePrefixForSessionKey(sessionKey) {
        try {
            if (!sessionKey) return null;
            if (safeGet(MAIN_PREFIX_THEME + sessionKey) !== null) return MAIN_PREFIX_THEME;
            if (safeGet(MAIN_PREFIX_RANDOM + sessionKey) !== null) return MAIN_PREFIX_RANDOM;
        } catch (e) { /* ignore */ }
        return null;
    }

    // Try to heuristically find a single session key (random or theme) in localStorage
    // This is a safe fallback when the URL lost the `key` parameter and window.quizSessionKey
    // is not set (for example after a navigation which didn't preserve the param).
    function findSessionKeyFromStorage() {
        try {
            if (!window.localStorage) return null;
            let found = null;
            const prefixes = [MAIN_PREFIX_RANDOM, MAIN_PREFIX_THEME];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                // exclude companion '::state' keys
                if (k.indexOf('::state') !== -1) continue;
                for (const pref of prefixes) {
                    if (k.indexOf(pref) === 0) {
                        const candidate = k.slice(pref.length);
                        if (candidate) {
                            if (found && found !== candidate) return null; // ambiguous
                            found = candidate;
                        }
                    }
                }
            }
            return found;
        } catch (e) { return null; }
    }

    // legacy storageKey function removed. We no longer write full snapshots under
    // quiz_progress_v1::. Persistence now uses quiz_random_v2::<sessionKey> and
    // quiz_random_v2::<sessionKey>::state companion keys.

    function collectAnswersSnapshot() {
        const _cq = (typeof window !== 'undefined' && window.currentQuiz) ? window.currentQuiz : (typeof currentQuiz !== 'undefined' ? currentQuiz : null);
        if (!_cq || !Array.isArray(_cq)) return null;
        const snapshot = {
            timestamp: new Date().toISOString(),
            params: getUrlParams(),
            items: []
        };
        _cq.forEach((q, idx) => {
            const name = `q${q.id}`;
            const inputs = document.querySelectorAll(`input[name="${name}"]:checked`);
            const selected = Array.from(inputs).map(i => i.value);
            snapshot.items.push({ questionId: q.id, index: idx, selected });
        });
        return snapshot;
    }

    function saveState() {
        // If suppression flag is set (clearing in progress), skip saving to avoid recreating keys
    try { if (window.__quizStatePersistSuppress) { try { if (window && window.__QUIET_CONSOLE === false) console.debug('[quizStatePersist] save suppressed'); } catch (e) {} return; } } catch (e) {}
        const snap = collectAnswersSnapshot();
        if (!snap) return;
        // NOTE: intentionally do not write the legacy quiz_progress_v1 snapshot anymore.
        // Persist only to companion per-session key and main quiz_random_v2 list.
        // If we have a random session key, also persist answers into a companion key so
        // admins/users inspecting quiz_random_v2::<key> can optionally find state at
        // quiz_random_v2::<key>::state without changing the array-of-ids shape.
        try {
            const p = getUrlParams();
            let sessionKey = p.key || (window.quizSessionKey || null);
            let paramKey = null;
            if (!sessionKey) {
                sessionKey = findSessionKeyFromStorage();
                if (!sessionKey) {
                    paramKey = buildParamsSnapshotKey(p);
                }
            }
                try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] saveState using sessionKey=', sessionKey); } catch (e) {}
            if (sessionKey || paramKey) {
                // determine which prefix to use for companion/main keys
                let prefix = null;
                if (sessionKey) prefix = resolvePrefixForSessionKey(sessionKey) || (p.mode === 'theme' ? MAIN_PREFIX_THEME : MAIN_PREFIX_RANDOM);
                const companionKey = sessionKey ? (prefix + sessionKey + '::state') : paramKey;
                // Persist only the items and timestamp to keep the object small
                const small = { timestamp: snap.timestamp, items: snap.items };
                safeSet(companionKey, JSON.stringify(small));
                try { if (window && window.__QUIET_CONSOLE === false) console.debug('[quizStatePersist] companion save ->', companionKey, small.items ? small.items.length : 0); } catch (e) {}
                // Also update the main quiz_random_v2::<sessionKey> list to include answered/selected info
                    try {
                        if (sessionKey) {
                            const mainKey = makeMainKey(sessionKey, p.mode) || (resolvePrefixForSessionKey(sessionKey) || MAIN_PREFIX_RANDOM) + sessionKey;
                            let listRaw = safeGet(mainKey);
                        try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] saveState mainKey=', mainKey, 'raw=', !!listRaw); } catch (e) {}
                        let list = [];
                        if (listRaw) {
                            try { list = JSON.parse(listRaw); } catch (e) { list = []; }
                        }
                    // Normalize to object form
                    const norm = list.map(it => {
                        if (it && typeof it === 'object' && it.id !== undefined) return it;
                        return { id: it, answered: false, selected: [] };
                    });
                    // merge snap.items into norm
                    snap.items.forEach(si => {
                        const qid = si.questionId;
                        const foundIdx = norm.findIndex(it => String(it.id) === String(qid));
                        const newObj = { id: qid, answered: (Array.isArray(si.selected) && si.selected.length>0), selected: si.selected || [] };
                        if (foundIdx >= 0) norm[foundIdx] = Object.assign({}, norm[foundIdx], newObj);
                        else norm.push(newObj);
                    });
                        safeSet(mainKey, JSON.stringify(norm));
                    } else {
                        // no sessionKey -> do not update main list
                    }
                } catch (e) { /* ignore main list update errors */ }
            }
        } catch (e) { /* ignore companion save errors */ }
    }

    function clearState() {
        // Clear companion and main session keys when possible
        try {
            const p = getUrlParams();
            const sessionKey = p.key || (window.quizSessionKey || null);
            if (sessionKey) {
                try { safeRemove(MAIN_PREFIX_RANDOM + sessionKey + '::state'); } catch (e) {}
                try { safeRemove(MAIN_PREFIX_RANDOM + sessionKey); } catch (e) {}
                try { safeRemove(MAIN_PREFIX_THEME + sessionKey + '::state'); } catch (e) {}
                try { safeRemove(MAIN_PREFIX_THEME + sessionKey); } catch (e) {}
            }
        } catch (e) { /* ignore */ }
    }

    function restoreState() {
        // Do NOT read legacy quiz_progress_v1 snapshots. Prefer companion session state
        // and main quiz_random_v2 objects.
        let snap = null;

        // discover snapshot (same logic as before)
        try {
            const p = getUrlParams();
            let sessionKey = p.key || (window.quizSessionKey || null);
            let paramKey = null;
            let candidates = [];
            try {
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.indexOf('quiz_random_v2::') === 0 && k.indexOf('::state') === -1) candidates.push(k);
                }
            } catch (e) { candidates = []; }
            if (!sessionKey) {
                sessionKey = findSessionKeyFromStorage();
                if (!sessionKey) paramKey = buildParamsSnapshotKey(p);
            }
                try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] restoreState candidates=', candidates, 'chosenSessionKey=', sessionKey, 'paramKey=', paramKey); } catch (e) {}
                if (sessionKey || paramKey) {
                let prefix = null;
                if (sessionKey) prefix = resolvePrefixForSessionKey(sessionKey) || (p.mode === 'theme' ? MAIN_PREFIX_THEME : MAIN_PREFIX_RANDOM);
                const companionKey = sessionKey ? (prefix + sessionKey + '::state') : paramKey;
                const compRaw = safeGet(companionKey);
                try { if (window && window.__QUIET_CONSOLE === false) console.debug('[quizStatePersist] restoreState: companionKey=', companionKey, 'found=', !!compRaw); } catch (e) {}
                if (compRaw) {
                    let comp = null;
                    try { comp = JSON.parse(compRaw); } catch (e) { comp = null; }
                    try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] companion contents (truncated)=', comp && comp.items ? comp.items.slice(0,10) : comp); } catch (e) {}
                        snap = { timestamp: comp.timestamp || new Date().toISOString(), params: getUrlParams(), items: comp.items || [] };
                } else {
                    try {
                        const mainKey = sessionKey ? (prefix + sessionKey) : null;
                        let mainRaw = null;
                        if (mainKey) mainRaw = safeGet(mainKey);
                        try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] mainKey=', mainKey, 'rawPresent=', !!mainRaw); } catch (e) {}
                        if (mainRaw) {
                            const arr = JSON.parse(mainRaw);
                            const items = (Array.isArray(arr) ? arr.map((it, idx) => {
                                if (it && typeof it === 'object' && it.id !== undefined) return { questionId: it.id, index: idx, selected: it.selected || [] };
                                return { questionId: it, index: idx, selected: [] };
                            }) : []);
                            try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] main contents (truncated)=', Array.isArray(arr) ? arr.slice(0,10) : arr); } catch (e) {}
                            if (items.length) snap = { timestamp: new Date().toISOString(), params: getUrlParams(), items };
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        } catch (e) { /* ignore companion restore errors */ }

        if (!snap) {
            try { if (window && window.__QUIET_CONSOLE === false) console.debug('[quizStatePersist] restoreState -> no snapshot found'); } catch (e) {}
            return false;
        }

        // Build items map (normalize strings)
        const itemsMap = {};
        snap.items.forEach(item => {
            try {
                const key = String(item.questionId);
                const vals = Array.isArray(item.selected) ? item.selected.map(v => String(v)) : [];
                itemsMap[key] = vals;
            } catch (e) { /* ignore malformed item */ }
        });

        // If a restore is already in progress, don't start another
        if (window._quizStatePersistRestoreInProgress) {
            try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] restore already in progress'); } catch (e) {}
            return true;
        }
        window._quizStatePersistRestoreInProgress = true;

        // Attempt to apply selections repeatedly until all items applied or timeout
        const _cq = (typeof window !== 'undefined' && window.currentQuiz) ? window.currentQuiz : (typeof currentQuiz !== 'undefined' ? currentQuiz : null);
        if (!_cq || !Array.isArray(_cq)) {
            window._quizStatePersistRestoreInProgress = false;
            return false;
        }

        const pending = new Set(Object.keys(itemsMap));
        const maxAttempts = 30;
        let attempts = 0;

        const tryApply = function () {
            attempts++;
            try {
                // iterate pending questionIds and try apply when inputs exist
                Array.from(pending).forEach(qid => {
                    const name = `q${qid}`;
                    const inputs = Array.from(document.querySelectorAll(`input[name="${name}"]`));
                    if (!inputs || inputs.length === 0) return; // wait for DOM
                    const saved = itemsMap[String(qid)] || [];
                    // clear first
                    inputs.forEach(i => { i.checked = false; i.disabled = false; });
                    if (!saved || saved.length === 0) {
                        pending.delete(String(qid));
                        return;
                    }
                    let anyApplied = false;
                    saved.forEach(val => {
                        const s = String(val);
                        for (let i = 0; i < inputs.length; i++) {
                            const inp = inputs[i];
                            if (String(inp.value) === s) {
                                inp.checked = true;
                                inp.disabled = true;
                                anyApplied = true;
                                            try { if (window && window.__QUIET_CONSOLE === false) console.info('[quizStatePersist] applied selection for q=', qid, 'value=', s, 'inputId=', inp.id); } catch (e) {}
                            }
                        }
                    });
                    if (anyApplied) pending.delete(String(qid));
                });
            } catch (e) { /* ignore per-iteration errors */ }

            if (pending.size === 0 || attempts >= maxAttempts) {
                // call submitSingleQuestion for those answered
                try {
                    _cq.forEach((q, idx) => {
                        const name = `q${q.id}`;
                        const inputs = document.querySelectorAll(`input[name="${name}"]:checked`);
                        if (inputs && inputs.length > 0 && typeof window.submitSingleQuestion === 'function') {
                            try { window.submitSingleQuestion(idx, q.id); } catch (e) { /* ignore */ }
                        }
                    });
                } catch (e) { /* ignore */ }
                try { if (typeof window.updateProgress === 'function') window.updateProgress(); } catch (e) {}
                window._quizStatePersistRestoreInProgress = false;
            } else {
                setTimeout(tryApply, 200);
            }
        };

        // start attempts
        tryApply();
        return true;
    }

    function wrapSubmit() {
        if (typeof window.submitSingleQuestion !== 'function') return;
        const orig = window.submitSingleQuestion;
        if (orig._wrapped_by_state_persist) return;
        const wrapped = function (index, questionId) {
            const result = orig.apply(this, arguments);
            try { saveState(); } catch (e) {}
            return result;
        };
        wrapped._wrapped_by_state_persist = true;
        window.submitSingleQuestion = wrapped;
    }

    // Debounced helper
    function debounce(fn, wait) {
        let t = null;
        return function () {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    // Save when user changes inputs (so refresh preserves selections even before clicking submit)
    function attachInputListeners() {
        // Use event delegation on document to catch dynamically created inputs
        const handler = debounce(() => {
            try { saveState(); } catch (e) {}
        }, 200);
        document.addEventListener('change', (ev) => {
            const target = ev.target;
            if (!target) return;
            if (target.matches && target.matches('input[name^="q"]')) {
                handler();
            }
        }, { capture: false });
    }

    // Hook save on visibility change, pagehide and beforeunload
    function attachAutoSave() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') saveState();
        });
        window.addEventListener('pagehide', () => saveState());
        window.addEventListener('beforeunload', () => saveState());
    }

    // Public small API (exposed for debugging/tests)
    window.quizStatePersist = {
        save: saveState,
        restore: restoreState,
        clear: clearState,
        // Return a simple map { questionId: [selectedValues] } synchronously if available
        getSnapshotMap: function () {
            try {
                const p = getUrlParams();
                let sessionKey = p.key || (window.quizSessionKey || null);
                let paramKey = null;
                if (!sessionKey) {
                    sessionKey = findSessionKeyFromStorage();
                    if (!sessionKey) paramKey = buildParamsSnapshotKey(p);
                }
                if (!sessionKey && !paramKey) return {};
                const companionKey = sessionKey ? ((resolvePrefixForSessionKey(sessionKey) || (p.mode === 'theme' ? MAIN_PREFIX_THEME : MAIN_PREFIX_RANDOM)) + sessionKey + '::state') : paramKey;
                const compRaw = safeGet(companionKey);
                if (compRaw) {
                    try {
                        const comp = JSON.parse(compRaw);
                        const map = {};
                        (comp.items || []).forEach(it => { try { map[String(it.questionId)] = Array.isArray(it.selected) ? it.selected.map(v => String(v)) : []; } catch (e) {} });
                        return map;
                    } catch (e) { /* fallthrough */ }
                }
                // fallback to main list
                const mainKey = makeMainKey(sessionKey, p.mode) || ((resolvePrefixForSessionKey(sessionKey) || MAIN_PREFIX_RANDOM) + sessionKey);
                const mainRaw = safeGet(mainKey);
                if (mainRaw) {
                    try {
                        const arr = JSON.parse(mainRaw);
                        const map = {};
                        if (Array.isArray(arr)) {
                            arr.forEach((it, idx) => {
                                if (it && typeof it === 'object' && it.id !== undefined) map[String(it.id)] = Array.isArray(it.selected) ? it.selected.map(v => String(v)) : [];
                            });
                        }
                        return map;
                    } catch (e) { /* ignore */ }
                }
            } catch (e) { /* ignore */ }
            return {};
        },
        // Save a single question's selected answers immediately. Used by submitSingleQuestion
        saveAnswer: function (questionId, selectedArray, index) {
            // respect suppression from UI helper
            try { if (window.__quizStatePersistSuppress) { try { if (window && window.__QUIET_CONSOLE === false) console.debug('[quizStatePersist] saveAnswer suppressed'); } catch (e) {} return; } } catch (e) {}
            try {
                // We intentionally no longer write legacy quiz_progress_v1 snapshots here.
                // Instead, persist to companion session state and update the main quiz_random_v2 list.

                // companion session state
                try {
                    const p = getUrlParams();
                    let sessionKey = p.key || (window.quizSessionKey || null);
                    let paramKey = null;
                    if (!sessionKey) {
                        sessionKey = findSessionKeyFromStorage();
                        if (!sessionKey) paramKey = buildParamsSnapshotKey(p);
                    }
                    if (sessionKey || paramKey) {
                        const companionKey = sessionKey ? ((resolvePrefixForSessionKey(sessionKey) || (p.mode === 'theme' ? MAIN_PREFIX_THEME : MAIN_PREFIX_RANDOM)) + sessionKey + '::state') : paramKey;
                        let compRaw = safeGet(companionKey);
                        let comp = null;
                        if (compRaw) {
                            try { comp = JSON.parse(compRaw); } catch (e) { comp = null; }
                        }
                        if (!comp) comp = { timestamp: new Date().toISOString(), items: [] };
                        const existingC = comp.items.findIndex(it => String(it.questionId) === String(questionId));
                        const citem = { questionId: questionId, index: (typeof index === 'number' ? index : (comp.items.length)), selected: Array.isArray(selectedArray) ? selectedArray : [] };
                        if (existingC >= 0) comp.items[existingC] = citem; else comp.items.push(citem);
                        comp.timestamp = new Date().toISOString();
                        safeSet(companionKey, JSON.stringify(comp));
                        // Also update the main quiz_random_v2::<sessionKey> list to include answered/selected info
                        try {
                            if (sessionKey) {
                                const mainKey = makeMainKey(sessionKey, p.mode) || ((resolvePrefixForSessionKey(sessionKey) || MAIN_PREFIX_RANDOM) + sessionKey);
                                let listRaw = safeGet(mainKey);
                                let list = [];
                                if (listRaw) {
                                    try { list = JSON.parse(listRaw); } catch (e) { list = []; }
                                }
                                // Normalize to object form
                                const norm = list.map(it => {
                                    if (it && typeof it === 'object' && it.id !== undefined) return it;
                                    return { id: it, answered: false, selected: [] };
                                });
                                const foundIdx = norm.findIndex(it => String(it.id) === String(questionId));
                                const newObj = { id: questionId, answered: true, selected: Array.isArray(selectedArray) ? selectedArray : [] };
                                if (foundIdx >= 0) norm[foundIdx] = Object.assign({}, norm[foundIdx], newObj);
                                else norm.push(newObj);
                                safeSet(mainKey, JSON.stringify(norm));
                            }
                        } catch (e) { /* ignore main list update errors */ }
                    }
                } catch (e) { /* ignore companion save errors */ }
            } catch (e) { /* ignore */ }
        }
    };

    // Try to initialize after DOM ready. Many quiz globals are created by inline script,
    // so we attempt to wrap and restore shortly after load.
    function init() {
        attachAutoSave();
        attachInputListeners();
        // Try to wrap submit and restore state repeatedly until the quiz code has initialized
        let attempts = 0;
        const maxAttempts = 30; // try for ~6 seconds (30 * 200ms)
        const tryOnce = function () {
            attempts++;
            try { wrapSubmit(); } catch (e) { /* ignore */ }
            const restored = restoreState();
            if (restored) return;
            if (attempts < maxAttempts) {
                setTimeout(tryOnce, 200);
            }
        };
        tryOnce();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
