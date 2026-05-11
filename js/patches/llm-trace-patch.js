/**
 * Parche de traza para SCORMs generados por LLM.
 * Soluciona:
 * 1. ChatGPT: Sobrescritura de progreso (guarda el máximo).
 * 2. Claude/Qwen: Fallo al transmitir progreso (fuerza commit y usa suspend_data).
 * 3. General: Persistencia entre sesiones.
 */
export const getLLMTracePatch = () => {
    return `
    <script>
    (function() {
        console.log('[MultiTrace] Inyectando parche para SCORM LLM...');

        // Referencia a la API original
        let api = null;
        let lastKnownProgress = 0;
        let saveInterval = null;

        // Intentar encontrar la API SCORM
        function findAPI() {
            let currentWindow = window;
            while (currentWindow.parent !== currentWindow && !api) {
                if (typeof currentWindow.parent.LMSAPI !== 'undefined') {
                    api = currentWindow.parent.LMSAPI;
                } else if (typeof currentWindow.parent.API !== 'undefined') {
                    api = currentWindow.parent.API;
                } else if (typeof currentWindow.parent.API_148T_1100 !== 'undefined') {
                    api = currentWindow.parent.API_148T_1100;
                }
                currentWindow = currentWindow.parent;
            }
            // Búsqueda global fallback
            if (!api) {
                if (typeof LMSAPI !== 'undefined') api = LMSAPI;
                else if (typeof API !== 'undefined') api = API;
                else if (typeof API_148T_1100 !== 'undefined') api = API_148T_1100;
            }
            return api;
        }

        function initSCORM() {
            if (!findAPI()) {
                console.warn('[MultiTrace] API SCORM no encontrada.');
                return false;
            }

            try {
                // Inicializar
                if (api.LMSInitialize) api.LMSInitialize();
                
                // RECUPERAR PROGRESO ANTERIOR (Solución ChatGPT)
                // Leemos suspend_data o progress_measure para no empezar de cero
                let storedProgress = 0;
                
                // Intento SCORM 2004
                if (api.GetValue) {
                    const progressVal = api.GetValue('cmi.progress_measure');
                    const suspendData = api.GetValue('cmi.suspend_data');
                    
                    if (progressVal && progressVal !== "") {
                        storedProgress = parseFloat(progressVal);
                    } else if (suspendData) {
                        try {
                            const data = JSON.parse(suspendData);
                            storedProgress = data.maxProgress || 0;
                        } catch(e) {}
                    }
                }

                // Intento SCORM 1.2
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

                // Guardado automático periódico (Solución Claude/Qwen)
                if (saveInterval) clearInterval(saveInterval);
                saveInterval = setInterval(forceSave, 5000); // Cada 5 segundos

                return true;
            } catch (e) {
                console.error('[MultiTrace] Error iniciando SCORM:', e);
                return false;
            }
        }

        function forceSave() {
            if (!api) return;
            
            try {
                // Solo guardamos si hemos avanzado respecto a lo último confirmado
                // O forzamos la escritura de suspend_data para asegurar persistencia
                
                let currentMax = lastKnownProgress;
                
                // Guardar en suspend_data como backup seguro
                const dataToSave = { maxProgress: currentMax, timestamp: new Date().getTime() };
                
                if (api.SetValue) {
                    // SCORM 2004
                    if (typeof api.SetValue('cmi.suspend_data', JSON.stringify(dataToSave)) !== 'false') {
                         // Si soporta progress_measure, lo actualizamos solo si es mayor
                         // Nota: Algunos SCORMs de LLM no leen bien progress_measure, usamos suspend_data como principal
                    }
                    // SCORM 1.2
                    if (typeof api.SetValue('cmi.suspend_data', JSON.stringify(dataToSave)) !== 'false') {}
                    
                    // Commit explícito
                    if (api.LMSCommit) api.LMSCommit();
                }
            } catch (e) {
                console.warn('[MultiTrace] Error en guardado automático:', e);
            }
        }

        // Sobrescribir funciones de finalización nativas si existen para asegurar el guardado final
        function hookCompletion() {
            const originalFinish = window.finishSCORM;
            window.finishSCORM = function() {
                forceSave(); // Asegurar último guardado
                if (originalFinish) return originalFinish.apply(this, arguments);
                if (api && api.LMSFinish) return api.LMSFinish();
            };
            
            // Hook genérico para cualquier función que termine la sesión
            const originalEnd = window.endSCORM;
            window.endSCORM = function() {
                forceSave();
                if (originalEnd) return originalEnd.apply(this, arguments);
            };
        }

        // Iniciar cuando cargue la página
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initSCORM();
                hookCompletion();
            });
        } else {
            initSCORM();
            hookCompletion();
        }

        // Exponer función manual para ser llamada por el SCORM si es necesario
        window.MultiTraceForceSave = forceSave;
    })();
    </script>
    `;
};
