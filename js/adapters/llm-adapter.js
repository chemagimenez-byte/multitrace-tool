/**
 * Adaptador para SCORMs generados por LLM
 */
(function() {
    // Aseguramos que las dependencias globales existan
    if (!window.LLMDetector || !window.getLLMTracePatch) {
        console.error("Faltan dependencias para LLMAdapter (Detector o Patch).");
        return;
    }

    class LLMAdapter {
        constructor() {
            this.name = 'LLM Generated SCORM';
            this.id = 'llm-scorm';
        }

        supports(zipContents, manifest) {
            return window.LLMDetector.detect(zipContents, manifest);
        }

        async process(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            const patchScript = window.getLLMTracePatch();
            const filesToModify = [];

            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            for (let i = 0; i < resources.length; i++) {
                const isMain = resources[i].getAttribute('identifier') === 'scorm' || 
                               resources[i].getAttribute('href') === 'index.html' ||
                               resources[i].getAttribute('href') === 'index.htm';
                
                if (isMain) {
                    launchFile = resources[i].getAttribute('href');
                    break;
                }
            }

            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                throw new Error('No se pudo identificar el archivo de lanzamiento en el SCORM LLM.');
            }

            filesToModify.push(launchFile);

            for (const filePath of filesToModify) {
                if (zipContents[filePath]) {
                    let content = zipContents[filePath];
                    if (content.includes('</head>')) {
                        content = content.replace('</head>', `${patchScript}\n</head>`);
                    } else if (content.includes('</body>')) {
                        content = content.replace('</body>', `${patchScript}\n</body>`);
                    } else {
                        content = content + `\n${patchScript}`;
                    }
                    zipContents[filePath] = content;
                    console.log(`[MultiTrace] Parche inyectado en: ${filePath}`);
                }
            }

            return zipContents;
        }
    }

    // Exponer globalmente para que register-adapters.js lo encuentre
    window.MultiTraceLLMAdapter = LLMAdapter;
})();
