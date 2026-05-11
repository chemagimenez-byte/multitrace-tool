(function() {
    console.log("[DEBUG] Creando objeto Adaptador LLM...");

    // CORRECCIÓN: Usar el nombre exacto definido en el detector (MultiTraceLLMDetector)
    const Detector = window.MultiTraceLLMDetector;
    const getPatch = window.getLLMTracePatch;

    if (!Detector || !getPatch) {
        console.error("[ERROR] Faltan dependencias del adaptador LLM (Detector o Patch).");
        console.error("Detector encontrado:", !!Detector, "| Patch encontrado:", !!getPatch);
        return;
    }

    // Definimos el adaptador como un OBJETO LITERAL, igual que Rise y Storyline
    window.MultiTraceLLMAdapter = {
        id: 'llm-scorm',
        name: 'LLM Generated SCORM',
        
        /**
         * Comprueba si el paquete es un SCORM genérico (LLM)
         */
        supports: function(zipContents, manifest) {
            try {
                return Detector.detect(zipContents, manifest);
            } catch (e) {
                console.warn("[LLM Adapter] Error en detección:", e);
                return false;
            }
        },

        /**
         * Inyecta la traza en el archivo principal
         */
        process: async function(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            const patchScript = getPatch();
            const resources = manifest.getElementsByTagName('resource');
            let launchFile = null;

            // 1. Buscar archivo principal (launch file)
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                if (href === 'index.html' || href === 'index.htm' || identifier === 'scorm') {
                    launchFile = href;
                    break;
                }
            }

            // 2. Fallback: buscar index.html directamente en el ZIP
            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }

            if (!launchFile) {
                console.warn("[LLM Adapter] No se encontró launch file, se omite inyección.");
                return zipContents;
            }

            // 3. Inyectar el parche
            if (zipContents[launchFile]) {
                let content = zipContents[launchFile];
                
                // Inyectar antes de </head> o </body>
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `${patchScript}\n</head>`);
                } else if (content.includes('</body>')) {
                    content = content.replace('</body>', `${patchScript}\n</body>`);
                } else {
                    content += `\n${patchScript}`;
                }

                zipContents[launchFile] = content;
                console.log(`[MultiTrace] Parche LLM inyectado en: ${launchFile}`);
            } else {
                console.warn(`[LLM Adapter] El archivo ${launchFile} no existe en el ZIP.`);
            }

            return zipContents;
        }
    };

    console.log("[DEBUG] Adaptador LLM creado exitosamente:", window.MultiTraceLLMAdapter);
})();
