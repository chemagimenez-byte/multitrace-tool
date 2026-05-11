(function() {
    console.log("[DEBUG] Creando objeto Adaptador LLM...");

    // Asegurarnos de que el detector y el patch están disponibles globalmente
    const Detector = window.LLMDetector;
    const getPatch = window.getLLMTracePatch;

    if (!Detector || !getPatch) {
        console.error("[ERROR] Faltan dependencias del adaptador LLM (Detector o Patch).");
        return;
    }

    // Definimos el adaptador como un OBJETO LITERAL, no como una clase
    window.MultiTraceLLMAdapter = {
        id: 'llm-scorm',
        name: 'LLM Generated SCORM',
        
        supports: function(zipContents, manifest) {
            return Detector.detect(zipContents, manifest);
        },

        process: async function(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            const patchScript = getPatch();
            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            // Buscar archivo principal
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                if (href === 'index.html' || href === 'index.htm' || identifier === 'scorm') {
                    launchFile = href;
                    break;
                }
            }

            // Fallback
            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                console.warn("[LLM Adapter] No se encontró launch file, se omite inyección.");
                return zipContents;
            }

            if (zipContents[launchFile]) {
                let content = zipContents[launchFile];
                
                // Inyectar script
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `${patchScript}\n</head>`);
                } else if (content.includes('</body>')) {
                    content = content.replace('</body>', `${patchScript}\n</body>`);
                } else {
                    content += `\n${patchScript}`;
                }

                zipContents[launchFile] = content;
                console.log(`[MultiTrace] Parche LLM inyectado en: ${launchFile}`);
            }

            return zipContents;
        }
    };

    console.log("[DEBUG] Adaptador LLM creado y asignado a window.MultiTraceLLMAdapter", window.MultiTraceLLMAdapter);
})();
