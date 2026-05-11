/**
 * Detector para SCORMs generados por LLM (ChatGPT, Claude, Qwen, etc.)
 * Actúa como "red de seguridad": si no es Rise, Storyline ni eXe, y es un SCORM válido, es LLM.
 */
(function() {
    console.log("[DEBUG] Cargando detector LLM...");

    window.MultiTraceLLMDetector = {
        id: 'llm-scorm',
        name: 'LLM Generated SCORM Detector',

        detect: function(zipContents, manifest) {
            if (!manifest) return false;

            // 1. Comprobaciones NEGATIVAS (Descartar vendors conocidos)
            // Si el archivo tiene huellas claras de otros autores, NO es LLM.
            for (const path in zipContents) {
                // Huellas de Articulate Rise
                if (path.includes('story_content/') || path.includes('html5/data/')) return false;
                // Huellas de Adobe Captivate (común en falsos positivos)
                if (path.includes('cp.min.js') || path.includes('lms/API.js')) return false;
                // Huellas de iSpring
                if (path.includes('presenter.js')) return false;
            }

            // 2. Comprobaciones POSITIVAS (Estructura básica SCORM)
            const resources = manifest.getElementsByTagName('resource');
            if (resources.length === 0) return false;

            // Buscar un archivo de lanzamiento común
            let hasLaunch = false;
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                if (href === 'index.html' || href === 'index.htm' || href === 'scorm.html' || href === 'main.html') {
                    hasLaunch = true;
                    break;
                }
            }

            // Si tiene manifest válido, tiene un index.html físico en el ZIP, 
            // y no tiene huellas de vendors conocidos -> Es LLM.
            const hasIndexFile = !!zipContents['index.html'] || !!zipContents['./index.html'];

            if (hasLaunch && hasIndexFile) {
                console.log("[LLM Detector] Paquete identificado como SCORM Genérico/LLM.");
                return true;
            }

            return false;
        }
    };

    console.log("[DEBUG] Detector LLM definido en window.MultiTraceLLMDetector");
})();
