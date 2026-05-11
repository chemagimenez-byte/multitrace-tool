/**
 * Generador del parche de traza para LLM
 */
(function() {
    window.getLLMTracePatch = function() {
        return `
        <script>
        (function() {
            console.log('[MultiTrace] Inyectando parche para SCORM LLM...');
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
                    let storedProgress = 0;
                    
                    if (api.GetValue) {
                        const progressVal = api.GetValue('cmi.progress_measure');
                        const suspendData = api.GetValue('cmi.suspend_data');
                        if (progressVal && progressVal !== "") storedProgress = parseFloat(progressVal);
                        else if (suspendData) {
                            try {
                                const data = JSON.parse(suspendData);
                                storedProgress = data.maxProgress || 0;
                            } catch(e) {}
                        }
                    }
                    if (!storedProgress && api.GetValue) {
                         const score = api.GetValue('cmi.core.score.raw');
                         if(score && score !== "") storedProgress = parseFloat(score);
                         const suspendData12 = api.GetValue('cmi.suspend_data');
                         if (suspendData12) {
                            try {
                                const data = JSON.parse(suspendData12);
                                if (data.maxProgress > storedProgress) storedProgress = data.maxProgress;
                            } catch(e) {}
                         }
                    }

                    lastKnownProgress = storedProgress;
                    console.log('[MultiTrace] Progreso recuperado:', lastKnownProgress + '%');

                    if (saveInterval) clearInterval(saveInterval);
                    saveInterval = setInterval(forceSave, 5000);
                    return true;
                } catch (e) {
                    console.error('[MultiTrace] Error iniciando SCORM:', e);
                    return false;
                }
            }

            function forceSave() {
                if (!api) return;
                try {
                    let currentMax = lastKnownProgress;
                    const dataToSave = { maxProgress: currentMax, timestamp: new Date().getTime() };
                    
                    if (api.SetValue) {
                        api.SetValue('cmi.suspend_data', JSON.stringify(dataToSave));
                        if (api.LMSCommit) api.LMSCommit();
                    }
                } catch (e) {
                    console.warn('[MultiTrace] Error en guardado automático:', e);
                }
            }

            function hookCompletion() {
                const originalFinish = window.finishSCORM;
                window.finishSCORM = function() {
                    forceSave();
                    if (originalFinish) return originalFinish.apply(this, arguments);
                    if (api && api.LMSFinish) return api.LMSFinish();
                };
                const originalEnd = window.endSCORM;
                window.endSCORM = function() {
                    forceSave();
                    if (originalEnd) return originalEnd.apply(this, arguments);
                };
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => { initSCORM(); hookCompletion(); });
            } else {
                initSCORM();
                hookCompletion();
            }
            window.MultiTraceForceSave = forceSave;
        })();
        </script>
        `;
    };
})();
