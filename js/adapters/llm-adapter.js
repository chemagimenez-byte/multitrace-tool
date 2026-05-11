(function() {
    // Asegurarnos de que las dependencias existen
    if (!window.LLMDetector || !window.getLLMTracePatch) {
        console.error('[ERROR] Faltan dependencias para LLMAdapter (Detector o Patch).');
        return;
    }

    class LLMAdapter {
        constructor() {
            // ESTO ES LO QUE FALLABA ANTES: Definir ID y NAME explícitamente
            this.id = 'llm-scorm'; 
            this.name = 'LLM Generated SCORM';
        }

        supports(zipContents, manifest) {
            return window.LLMDetector.detect(zipContents, manifest);
        }

        async process(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            const patchScript = window.getLLMTracePatch();
            const filesToModify = [];

            // 1. Identificar launch file
            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                if (identifier === 'scorm' || href === 'index.html' || href === 'index.htm') {
                    launchFile = href;
                    break;
                }
            }

            // Fallback
            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                throw new Error('No se encontró el archivo de lanzamiento (index.html) en el SCORM LLM.');
            }

            filesToModify.push(launchFile);

            // 2. Inyectar parche
            for (const filePath of filesToModify) {
                if (zipContents[filePath]) {
                    let content = zipContents[filePath];
                    
                    // Inyectar antes de </head>
                    if (content.includes('</head>')) {
                        content = content.replace('</head>', `${patchScript}\n</head>`);
                    } else if (content.includes('</body>')) {
                        content = content.replace('</body>', `${patchScript}\n</body>`);
                    } else {
                        content += `\n${patchScript}`;
                    }

                    zipContents[filePath] = content;
                    console.log(`[MultiTrace] Parche inyectado en: ${filePath}`);
                }
            }

            return zipContents;
        }
    }

    // Exponer la clase (no una instancia) para que register-adapters.js pueda instanciarla
    window.MultiTraceLLMAdapter = LLMAdapter;
    console.log('[DEBUG] MultiTraceLLMAdapter cargado con ID:', new LLMAdapter().id);
})();
