/**
 * Parche de traza para SCORMs LLM.
 * Versión Global.
 */
(function() {
    window.getLLMTracePatch = function() {
        return `
        <script>
        (function() {
            console.log('[MultiTrace-LLM] Inyectando parche de persistencia...');
            let api = null;
            let lastKnownProgress = 0;
            let saveInterval = null;

            function findAPI() {
                let currentWindow = window;
                while (currentWindow.parent !== currentWindow && !api) {
                    if (typeof currentWindow.parent.LMSAPI !== 'undefined') api = currentWindow.parent.LMSAPI;
                    else if (typeof currentWindow.parent.API !== 'undefined') api = currentWindow.parent.API;
                    else if (typeof currentWindow.parent.API_148T_1100 !== 'undefined') api = currentWindow.parent.API_148T_1100;
                    currentWindow = currentWindow.parent;
                }
                if (!api) {
                    if (typeof LMSAPI !== 'undefined') api = LMSAPI;
                    else if (typeof API !== 'undefined') api = API;
                    else if (typeof API_148T_1100 !== 'undefined') api = API_148T_1100;
                }
                return api;
            }

            function initSCORM() {
                if (!findAPI()) return false;
                try {
                    if (api.LMSInitialize) api.LMSInitialize();
                    
                    // Recuperar progreso máximo anterior
                    let storedProgress = 0;
                    if (api.GetValue) {
                        // Intento SCORM 2004
                        let p = api.GetValue('cmi.progress_measure');
                        if (p && p !== "") storedProgress = parseFloat(p);
                        
                        // Fallback suspend_data
                        let s = api.GetValue('cmi.suspend_data');
                        if (s) {
                            try {
                                let d = JSON.parse(s);
                                if (d.maxProgress > storedProgress) storedProgress = d.maxProgress;
                            } catch(e){}
                        }
                        // Intento SCORM 1.2
                        if (!storedProgress) {
                            let score = api.GetValue('cmi.core.score.raw');
                            if(score && score !== "") storedProgress = parseFloat(score);
                            let s12 = api.GetValue('cmi.suspend_data');
                            if (s12) {
                                try {
                                    let d = JSON.parse(s12);
                                    if (d.maxProgress > storedProgress) storedProgress = d.maxProgress;
                                } catch(e){}
                            }
                        }
                    }
                    
                    lastKnownProgress = storedProgress;
                    console.log('[MultiTrace-LLM] Progreso recuperado:', lastKnownProgress);

                    // Guardado automático cada 5s
                    if (saveInterval) clearInterval(saveInterval);
                    saveInterval = setInterval(forceSave, 5000);
                    return true;
                } catch (e) {
                    console.error('[MultiTrace-LLM] Error init:', e);
                    return false;
                }
            }

            function forceSave() {
                if (!api) return;
                try {
                    const dataToSave = { maxProgress: lastKnownProgress, timestamp: new Date().getTime() };
                    if (api.SetValue) {
                        api.SetValue('cmi.suspend_data', JSON.stringify(dataToSave));
                        if (api.LMSCommit) api.LMSCommit();
                    }
                } catch (e) { console.warn('[MultiTrace-LLM] Error save:', e); }
            }

            // Hooks para finalización
            window.finishSCORM = (function(orig) {
                return function() { forceSave(); if(orig) return orig.apply(this, arguments); if(api && api.LMSFinish) return api.LMSFinish(); };
            })(window.finishSCORM);
            
            window.endSCORM = (function(orig) {
                return function() { forceSave(); if(orig) return orig.apply(this, arguments); };
            })(window.endSCORM);

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initSCORM);
            } else {
                initSCORM();
            }
            window.MultiTraceForceSave = forceSave;
        })();
        </script>`;
    };
})();
