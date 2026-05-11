/**
 * Generador del parche de traza para SCORMs LLM
 */
(function() {
    function getLLMTracePatch() {
        return `
        <script>
        (function() {
            console.log('[MultiTrace-LLM] Inyectando lógica de persistencia...');
            
            let api = null;
            let saveInterval = null;
            let maxProgressSaved = 0;

            function findAPI() {
                let currentWindow = window;
                while (currentWindow.parent !== currentWindow && !api) {
                    if (currentWindow.parent.LMSAPI) api = currentWindow.parent.LMSAPI;
                    else if (currentWindow.parent.API) api = currentWindow.parent.API;
                    else if (currentWindow.parent.API_148T_1100) api = currentWindow.parent.API_148T_1100;
                    currentWindow = currentWindow.parent;
                }
                if (!api) {
                    if (window.LMSAPI) api = window.LMSAPI;
                    else if (window.API) api = window.API;
                    else if (window.API_148T_1100) api = window.API_148T_1100;
                }
                return api;
            }

            function init() {
                if (!findAPI()) {
                    console.warn('[MultiTrace-LLM] API no encontrada.');
                    return;
                }

                try {
                    // Inicializar
                    if (api.LMSInitialize) api.LMSInitialize();

                    // RECUPERAR MÁXIMO PROGRESO (Solución ChatGPT)
                    let storedMax = 0;
                    
                    // Intentar leer suspend_data
                    let suspendData = "";
                    if (api.GetValue) {
                        suspendData = api.GetValue('cmi.suspend_data') || "";
                    }

                    if (suspendData) {
                        try {
                            const data = JSON.parse(suspendData);
                            storedMax = data.maxProgress || 0;
                        } catch(e) {}
                    }
                    
                    // Si es SCORM 2004, intentar progress_measure también
                    if (api.GetValue) {
                        const progress = api.GetValue('cmi.progress_measure');
                        if (progress && parseFloat(progress) > storedMax) {
                            storedMax = parseFloat(progress);
                        }
                    }
                    
                    // Si es SCORM 1.2, intentar score
                    if (api.GetValue) {
                        const score = api.GetValue('cmi.core.score.raw');
                        if (score && parseFloat(score) > storedMax) {
                            storedMax = parseFloat(score);
                        }
                    }

                    maxProgressSaved = storedMax;
                    console.log('[MultiTrace-LLM] Progreso máximo recuperado:', maxProgressSaved + '%');

                    // GUARDADO PERIÓDICO (Solución Claude/Qwen)
                    if (saveInterval) clearInterval(saveInterval);
                    saveInterval = setInterval(forceCommit, 5000);

                } catch (e) {
                    console.error('[MultiTrace-LLM] Error en init:', e);
                }
            }

            function forceCommit() {
                if (!api) return;
                try {
                    // Guardar el máximo alcanzado en suspend_data como backup
                    const dataToSave = { maxProgress: maxProgressSaved, timestamp: Date.now() };
                    const jsonStr = JSON.stringify(dataToSave);

                    if (api.SetValue) {
                        api.SetValue('cmi.suspend_data', jsonStr);
                        // Si existe progress_measure, actualizarlo solo si tenemos un valor válido
                        // Pero cuidado: algunos SCORMs de LLM fallan si seteamos cosas que no esperan.
                        // Lo seguro es guardar en suspend_data y hacer commit.
                    }

                    if (api.LMSCommit) {
                        api.LMSCommit();
                        console.log('[MultiTrace-LLM] Commit realizado. Max: ' + maxProgressSaved);
                    }
                } catch (e) {
                    console.warn('[MultiTrace-LLM] Error en commit:', e);
                }
            }

            // Hook para cuando el SCORM intente finalizar
            function hookFinish() {
                const originalFinish = window.finishSCORM || window.endSCORM;
                
                const newFinish = function() {
                    forceCommit(); // Asegurar guardado final
                    if (originalFinish) return originalFinish.apply(this, arguments);
                    if (api && api.LMSFinish) return api.LMSFinish();
                };

                window.finishSCORM = newFinish;
                window.endSCORM = newFinish;
            }

            // Ejecutar al cargar
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    init();
                    hookFinish();
                });
            } else {
                init();
                hookFinish();
            }

            // Exponer para depuración
            window.MultiTraceLLMDebug = { 
                getProgress: () => maxProgressSaved, 
                forceSave: forceCommit 
            };
        })();
        </script>
        `;
    }

    // Exponer globalmente
    window.getLLMTracePatch = getLLMTracePatch;
    console.log('[DEBUG] getLLMTracePatch cargado');
})();
