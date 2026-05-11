/**
 * Detector para SCORMs generados por LLM.
 * Versión Global (sin módulos) para compatibilidad con la arquitectura actual.
 */
(function() {
    class LLMDetector {
        static detect(zipContents, manifest) {
            if (!manifest) return false;

            // 1. Descartar si ya fue detectado por otros sistemas conocidos (seguridad)
            // Buscamos huellas específicas de Rise, Storyline o eXe en el JS
            const allFiles = Object.keys(zipContents);
            for (const file of allFiles) {
                if (file.endsWith('.js')) {
                    try {
                        const content = zipContents[file];
                        if (content.includes('SCORMAdapter') && content.includes('Articulate')) return false;
                        if (content.includes('eXeLearning')) return false;
                        if (content.includes('Storyline')) return false;
                    } catch (e) {}
                }
            }

            // 2. Detectar patrones de LLM
            // A. Estructura simple en manifest
            const resources = manifest.getElementsByTagName('resource');
            let hasGenericNames = false;
            
            for (let i = 0; i < resources.length; i++) {
                const identifier = (resources[i].getAttribute('identifier') || '').toLowerCase();
                const href = (resources[i].getAttribute('href') || '').toLowerCase();
                
                if (identifier.includes('scorm') || identifier === 'index' || 
                    href === 'index.html' || href === 'scorm.html') {
                    hasGenericNames = true;
                    break;
                }
            }

            // B. Si tiene estructura genérica y NO es un vendor conocido, es LLM
            // Nota: Para ser más agresivos, podemos detectar cualquier SCORM estándar simple
            // que no haya sido capturado antes.
            
            // Estrategia "Red de seguridad": 
            // Si tiene imsmanifest.xml válido, tiene recursos HTML y no es Rise/Story/eXe -> Es LLM/Otro.
            if (resources.length > 0 && hasGenericNames) {
                return true;
            }
            
            return false;
        }
    }

    // Exponer globalmente
    window.LLMDetector = LLMDetector;
})();
