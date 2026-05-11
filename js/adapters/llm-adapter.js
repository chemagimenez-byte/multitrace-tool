(function() {
    console.log("[DEBUG] Creando objeto Adaptador LLM...");

    // Asegurarnos de que el detector y el patch están disponibles globalmente
    const Detector = window.MultiTraceLLMDetector;
    const getPatch = window.getLLMTracePatch;

    if (!Detector || !getPatch) {
        console.error("[ERROR] Faltan dependencias del adaptador LLM (Detector o Patch).");
        return;
    }

    // Definimos el adaptador como un OBJETO LITERAL
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

            // 1. Buscar archivo principal (launch file)
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                if (href === 'index.html' || href === 'index.htm' || identifier === 'scorm') {
                    launchFile = href;
                    break;
                }
            }

            // Fallback: buscar index.html si no se encontró por atributos
            if (!launchFile && zipContents['index.html']) {
                launchFile = 'index.html';
            }
            if (!launchFile && zipContents['./index.html']) {
                launchFile = './index.html';
            }

            if (!launchFile) {
                console.warn("[LLM Adapter] No se encontró launch file, se omite inyección.");
                return zipContents;
            }

            console.log(`[LLM Adapter] Archivo objetivo identificado: ${launchFile}`);

            // 2. Obtener el archivo del ZIP
            const fileEntry = zipContents[launchFile];
            if (!fileEntry) {
                throw new Error(`El archivo ${launchFile} no existe en el ZIP.`);
            }

            // 3. LEER CONTENIDO COMO STRING (CRUCIAL: JSZip devuelve objetos, no strings directos)
            let content;
            if (typeof fileEntry.async === 'function') {
                // Es una entrada de JSZip real
                content = await fileEntry.async("string");
            } else {
                // Ya es un string (caso raro o testing)
                content = fileEntry;
            }

            // 4. Inyectar script
            if (content.includes('</head>')) {
                content = content.replace('</head>', `${patchScript}\n</head>`);
            } else if (content.includes('</body>')) {
                content = content.replace('</body>', `${patchScript}\n</body>`);
            } else {
                content += `\n${patchScript}`;
            }

            // 5. Guardar el contenido modificado de vuelta en el objeto zipContents
            // Nota: Al modificar zipContents[launchFile] con un string, 
            // el proceso en zip.js se encargará de escribirlo correctamente al generar el nuevo ZIP.
            zipContents[launchFile] = content;
            
            console.log(`[MultiTrace] Parche LLM inyectado en: ${launchFile}`);

            return zipContents;
        }
    };

    console.log("[DEBUG] Adaptador LLM creado exitosamente", window.MultiTraceLLMAdapter);
})();
