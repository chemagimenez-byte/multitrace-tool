/**
 * Adaptador para SCORMs generados por LLM
 * DEBE SER UNA CLASE GLOBAL PARA QUE 'new' FUNCIONE
 */
var MultiTraceLLMAdapter = (function () {
    console.log("[DEBUG] Definiendo clase Adaptador LLM...");

    // Definición de la clase
    class LLMAdapter {
        constructor() {
            this.id = 'llm-scorm'; // CRUCIAL: El ID que pide el registry
            this.name = 'LLM Generated SCORM';
            console.log("[DEBUG] Instancia de LLMAdapter creada con ID:", this.id);
        }

        supports(zipContents, manifest) {
            if (!window.LLMDetector) {
                console.warn("[DEBUG] Detector LLM no cargado aún.");
                return false;
            }
            return window.LLMDetector.detect(zipContents, manifest);
        }

        async process(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            if (!window.getLLMTracePatch) {
                throw new Error("El parche LLM no está cargado.");
            }

            const patchScript = window.getLLMTracePatch();
            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            // Buscar launch file
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href');
                if (href && (href === 'index.html' || href === 'index.htm' || href === 'scorm.html')) {
                    launchFile = href;
                    break;
                }
            }

            // Fallback
            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                throw new Error('No se encontró archivo de lanzamiento.');
            }

            console.log(`[MultiTrace] Inyectando traza en: ${launchFile}`);
            
            let content = zipContents[launchFile];
            if (content.includes('</head>')) {
                content = content.replace('</head>', `${patchScript}</head>`);
            } else if (content.includes('</body>')) {
                content = content.replace('</body>', `${patchScript}</body>`);
            } else {
                content += patchScript;
            }

            zipContents[launchFile] = content;
            return zipContents;
        }
    }

    // Asignar la CLASE (no una instancia) a la ventana global
    window.MultiTraceLLMAdapter = LLMAdapter;
    
    return LLMAdapter;
})();
