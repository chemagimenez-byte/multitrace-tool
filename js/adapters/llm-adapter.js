/**
 * Adaptador para SCORMs generados por LLM.
 * Versión Global (sin imports).
 */
(function() {
    class LLMAdapter {
        constructor() {
            this.name = 'LLM Generated SCORM';
            this.id = 'llm-scorm';
        }

        supports(zipContents, manifest) {
            // Usar el detector global
            if (!window.LLMDetector) return false;
            return window.LLMDetector.detect(zipContents, manifest);
        }

        async process(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            if (!window.getLLMTracePatch) {
                throw new Error("El parche LLM no está cargado.");
            }
            
            const patchScript = window.getLLMTracePatch();
            const filesToModify = [];

            // Identificar launch file
            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = (resources[i].getAttribute('identifier') || '').toLowerCase();
                
                if (identifier === 'scorm' || href === 'index.html' || href === 'index.htm') {
                    launchFile = href;
                    break;
                }
            }

            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                throw new Error('No se encontró el archivo de lanzamiento.');
            }

            filesToModify.push(launchFile);

            // Inyectar
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
