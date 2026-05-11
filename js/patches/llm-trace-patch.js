/**
 * Generador del parche para LLM
 */
var getLLMTracePatch = (function () {
    console.log("[DEBUG] Cargando patch LLM...");

    function getLLMTracePatch() {
        return `
        <script>
        (function() {
            console.log('[MultiTrace-LLM] Inicializando parche de traza...');
            
            let api = null;
            let maxProgressSaved = 0;
            let autoSaveInterval = null;

            function findAPI() {
                if (api) return api;
                // Búsqueda estándar
                const win = window;
                if (win.API) api = win.API;
                else if (win.API_148T_1100) api = win.API_148T_1100;
                else if (win.LMSAPI) api = win.LMSAPI;
                
                // Búsqueda en padre (iframe)
                if (!api && win.parent) {
                    if (win.parent.API) api = win.parent.API;
                    else if (win.parent.API_148T_1100) api = win.parent.API_148T_1100;
                }
                return api;
            }

            function init() {
                if (!findAPI()) {
                    console.warn('[MultiTrace-LLM] API no encontrada aún, reintentando...');
                    setTimeout(init, 500);
                    return;
                }

                try {
                    // Inicializar
                    if (api.LMSInitialize) api.LMSInitialize();
                    
                    // RECUPERAR MÁXIMO PROGRESO (Solución ChatGPT/Claude)
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
                    
                    // Fallback para SCORM 1.2 score
                    if (!storedMax && api.GetValue) {
                        const score = api.GetValue('cmi.core.score.raw');
                        if(score) storedMax = parseFloat(score);
                    }

                    maxProgressSaved = storedMax;
                    console.log('[MultiTrace-LLM] Progreso máximo recuperado:', maxProgressSaved);

                    // Configurar guardado automático cada 5s
                    autoSaveInterval = setInterval(forceCommit, 5000);

                    // Interceptar finalización nativa
                    const originalFinish = window.finishSCORM || window.endSCORM;
                    const newFinish = function() {
                        forceCommit(true); // Forzar guardado final
                        if (originalFinish) return originalFinish.apply(this, arguments);
                        if (api && api.LMSFinish) return api.LMSFinish();
                    };
                    window.finishSCORM = newFinish;
                    window.endSCORM = newFinish;

                } catch (e) {
                    console.error('[MultiTrace-LLM] Error en init:', e);
                }
            }

            function forceCommit(isFinal = false) {
                if (!api) return;
                try {
                    // Preparar datos
                    const dataToSave = { maxProgress: maxProgressSaved, timestamp: Date.now() };
                    const jsonStr = JSON.stringify(dataToSave);

                    // Guardar en suspend_data
                    if (api.SetValue) {
                        api.SetValue('cmi.suspend_data', jsonStr);
                        
                        // Si es SCORM 2004 y tenemos progress_measure, actualizarlo solo si es mayor
                        // (Esto evita el problema de sobrescritura hacia abajo)
                        // Nota: No leemos el valor actual para evitar bucles, confiamos en nuestro maxProgressSaved
                        // Solo escribimos si sabemos que hemos avanzado (lógica externa debería actualizar maxProgressSaved)
                        // Aquí forzamos la persistencia de lo que tenemos.
                    }
                    
                    // Commit explícito
                    if (api.LMSCommit) {
                        api.LMSCommit();
                        if(isFinal) console.log('[MultiTrace-LLM] Commit final realizado.');
                    }
                } catch (e) {
                    console.warn('[MultiTrace-LLM] Error al guardar:', e);
                }
            }

            // Exponer método para que el SCORM actualice el progreso si lo desea
            window.updateLLMProgress = function(progress) {
                const p = parseFloat(progress);
                if (p > maxProgressSaved) {
                    maxProgressSaved = p;
                    console.log('[MultiTrace-LLM] Nuevo máximo registrado:', maxProgressSaved);
                    forceCommit();
                }
            };

            // Arrancar
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        })();
        </script>
        `;
    }

    window.getLLMTracePatch = getLLMTracePatch;
    return getLLMTracePatch;
})();
