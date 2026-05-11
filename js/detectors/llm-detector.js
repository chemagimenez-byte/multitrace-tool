/**
 * Detector para SCORMs generados por LLM
 */
var LLMDetector = (function () {
    console.log("[DEBUG] Cargando detector LLM...");

    class LLMDetectorClass {
        static detect(zipContents, manifest) {
            if (!manifest) return false;

            // 1. Comprobar si YA es detectado por otros sistemas (para no solaparnos)
            // Si Rise, Storyline o eXe lo detectaron, nosotros nos apartamos.
            // Esto se hace asumiendo que el orden de registro importa, 
            // pero como fallback, buscamos huellas negativas.
            
            const resources = manifest.getElementsByTagName('resource');
            
            // Heurística: SCORMs de LLM suelen tener estructuras muy limpias o nombres genéricos
            // y carecen de las marcas de agua masivas de JS de Articulate/Adobe.
            
            let hasLLMFingerprints = false;
            
            // Buscar archivos comunes en SCORMs de LLM (index.html simple)
            const hasIndex = zipContents['index.html'] !== undefined;
            
            // Comprobar contenido de JS para descartar vendors conocidos
            let isVendorKnown = false;
            for (let file in zipContents) {
                if (file.endsWith('.js')) {
                    const content = zipContents[file];
                    if (content.includes('SCORMAdapter') && content.includes('Articulate')) {
                        isVendorKnown = true; break;
                    }
                    if (content.includes('eXeLearning')) {
                        isVendorKnown = true; break;
                    }
                    if (content.includes('Storyline')) {
                        isVendorKnown = true; break;
                    }
                }
            }

            if (isVendorKnown) return false;

            // Si tiene index.html, no es vendor conocido y tiene un manifest válido, es candidato LLM
            // Ajusta esta lógica si ves falsos positivos
            if (hasIndex && resources.length > 0) {
                console.log("[DEBUG] Posible SCORM LLM detectado (Estructura limpia).");
                return true;
            }

            return false;
        }
    }

    // Exponer globalmente
    window.LLMDetector = LLMDetectorClass;
    return LLMDetectorClass;
})();
