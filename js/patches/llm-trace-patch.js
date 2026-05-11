/**
 * Parche de traza para SCORMs generados por LLM.
 * Patrón: Función global que retorna string (igual que Rise/Storyline)
 */
(function() {
    console.log("[DEBUG] Cargando patch LLM...");

    window.getLLMTracePatch = function() {
        return `
        <script>
        (function() {
            console.log('[MultiTrace-LLM] Inyectando parche de persistencia...');

            let api = null;
            let lastSavedProgress = 0;
            let saveInterval = null;

            // Buscar API SCORM
            function findAPI() {
                let current = window;
                while (current.parent !== current && !api) {
                    if (current.parent.LMSAPI) api = current.parent.LMSAPI;
                    else if (current.parent.API) api = current.parent.API;
                    else if (current.parent.API_148T_1100) api = current.parent.API_148T_1100;
                    current = current.parent;
                }
                if (!api) {
                    if (window.LMSAPI) api = window.LMSAPI;
                    else if (window.API) api = window.API;
                    else if (window.API_148T_1100) api = window.API_148T_1100;
                }
                return !!api;
            }

            function getStoredProgress() {
                if (!api) return 0;
                try {
                    // Intento SCORM 2004
                    let val = api.GetValue('cmi.progress_measure');
                    if (val && val !== "") return parseFloat(val);

                    // Intento SCORM 1.2
                    val = api.GetValue('cmi.core.score.raw');
                    if (val && val !== "") return parseFloat(val);

                    // Fallback: suspend_data
                    const suspend = api.GetValue('cmi.suspend_data');
                    if (suspend) {
                        const data = JSON.parse(suspend);
                        return data.maxProgress || 0;
                    }
                } catch (e) {
                    console.warn('[MultiTrace-LLM] Error leyendo progreso:', e);
                }
                return 0;
            }

            function saveProgress(progress) {
                if (!api) return;
                try {
                    const data = { maxProgress: progress, timestamp: Date.now() };
                    const json = JSON.stringify(data);

                    // Guardar en suspend_data (funciona en 1.2 y 2004)
                    api.SetValue('cmi.suspend_data', json);
                    
                    // Actualizar progress_measure si existe (SCORM 2004)
                    if (typeof api.SetValue('cmi.progress_measure', progress) !== 'undefined') {
                         // OK
                    }
                    
                    // Commit explícito
                    if (api.LMSCommit) api.LMSCommit();
                    
                    lastSavedProgress = progress;
                    console.log('[MultiTrace-LLM] Progreso guardado:', progress + '%');
                } catch (e) {
                    console.error('[MultiTrace-LLM] Error guardando:', e);
                }
            }

            function init() {
                if (!findAPI()) {
                    console.warn('[MultiTrace-LLM] API no encontrada.');
                    return;
                }

                // Recuperar máximo histórico
                const stored = getStoredProgress();
                lastSavedProgress = stored;
                console.log('[MultiTrace-LLM] Progreso inicial recuperado:', stored + '%');

                // Auto-guardado cada 5s
                saveInterval = setInterval(() => {
                    // Forzamos guardar el último conocido o un mínimo si no ha cambiado
                    // Esto soluciona el problema de Claude/Qwen que no envían datos
                    if (api) {
                         // Leemos el progreso actual del SCORM (si el SCORM lo actualiza internamente)
                         // Si el SCORM no lo actualiza, al menos mantenemos vivo el commit
                         api.LMSCommit(); 
                    }
                }, 5000);

                // Sobrescribir funciones de finalización comunes
                const originalFinish = window.finishSCORM || window.endSCORM;
                const newFinish = function() {
                    saveProgress(lastSavedProgress); // Asegurar guardado final
                    if (originalFinish) return originalFinish.apply(this, arguments);
                    if (api && api.LMSFinish) return api.LMSFinish();
                };
                window.finishSCORM = newFinish;
                window.endSCORM = newFinish;
                
                // Hook para actualizaciones de progreso (si el SCORM llama a SetValue)
                // Esto es más complejo de interceptar sin romper el SCORM, 
                // así que nos basamos en el commit periódico y el guardado al cerrar.
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        })();
        </script>
        `;
    };

    console.log("[DEBUG] Patch LLM definido en window.getLLMTracePatch");
})();
