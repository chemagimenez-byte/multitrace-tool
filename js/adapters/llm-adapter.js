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
        
        /**
         * Detecta si un paquete es compatible.
         */
        supports: function(zipContents, manifest) {
            // Llamamos al detector global
            return Detector.detect(zipContents, manifest);
        },

        /**
         * Procesa el paquete inyectando la traza en TODOS los archivos HTML encontrados.
         */
        process: async function(zipContents, manifest, options = {}) {
            console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
            
            const patchScript = getPatch();
            const resources = manifest.getElementsByTagName('resource');
            const htmlFilesToProcess = [];

            // 1. Identificar TODOS los archivos HTML referenciados en el manifiesto
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                
                // Filtrar solo archivos .html o .htm
                if (href.match(/\.html?$/i)) {
                    // Normalizar ruta (quitar ./ inicial si existe para coincidir con JSZip)
                    const normalizedHref = href.replace(/^\.\//, '');
                    htmlFilesToProcess.push(normalizedHref);
                }
            }

            // Fallback de seguridad: Si el manifiesto está vacío o mal formado, buscar index.html en raíz
            if (htmlFilesToProcess.length === 0) {
                if (zipContents['index.html']) {
                    console.warn("[LLM Adapter] No se encontraron recursos en el manifiesto. Usando fallback: index.html");
                    htmlFilesToProcess.push('index.html');
                } else {
                    // Búsqueda exhaustiva en todo el ZIP si falla lo anterior
                    for (const fileName in zipContents) {
                        if (fileName.match(/\.html?$/i) && !fileName.includes('/_')) {
                            htmlFilesToProcess.push(fileName);
                        }
                    }
                }
            }

            if (htmlFilesToProcess.length === 0) {
                throw new Error("No se encontró ningún archivo HTML válido para inyectar la traza.");
            }

            console.log(`[LLM Adapter] Se van a procesar ${htmlFilesToProcess.length} archivos HTML:`, htmlFilesToProcess);

            let modifiedCount = 0;

            // 2. Iterar e inyectar el parche en CADA archivo HTML
            for (const filePath of htmlFilesToProcess) {
                const zipEntry = zipContents[filePath];
                
                if (!zipEntry) {
                    console.warn(`[LLM Adapter] El archivo ${filePath} está en el manifiesto pero no existe en el ZIP. Se omite.`);
                    continue;
                }

                try {
                    // Leer contenido como string
                    let content = await zipEntry.async("string");
                    
                    // Comprobar si ya tiene parche (opcional, basado en options.force)
                    if (content.includes('[MultiTrace-LLM]') && !options.force) {
                        console.log(`[LLM Adapter] ${filePath} ya tiene la traza. Saltando...`);
                        continue;
                    }

                    // Forzar reinyección si se solicita
                    if (content.includes('[MultiTrace-LLM]') && options.force) {
                         // Eliminar parche anterior simple (si fuera necesario en el futuro)
                         // Por ahora, simplemente lo dejamos o sobrescribimos al final.
                         console.log(`[LLM Adapter] Forzando reinyección en ${filePath}...`);
                    }

                    // Inyectar script
                    let injectedContent = null;
                    if (content.includes('</head>')) {
                        injectedContent = content.replace('</head>', `${patchScript}\n</head>`);
                    } else if (content.includes('</body>')) {
                        injectedContent = content.replace('</body>', `${patchScript}\n</body>`);
                    } else {
                        injectedContent = content + `\n${patchScript}`;
                    }

                    if (injectedContent) {
                        // Acumulamos cambios en un objeto temporal
                        if (!this._changes) this._changes = {};
                        this._changes[filePath] = injectedContent;
                        
                        modifiedCount++;
                        console.log(`[MultiTrace] Parche LLM preparado para: ${filePath}`);
                    }
                } catch (e) {
                    console.error(`[LLM Adapter] Error procesando ${filePath}:`, e);
                }
            }

            console.log(`[MultiTrace] Preparados ${modifiedCount} archivos para inyección.`);
            
            // Devolvemos el objeto con los cambios. 
            // zip.js (processLLMZip) debe esperar recibir este objeto de cambios.
            return this._changes || {};
        }
    };

    console.log("[DEBUG] Adaptador LLM creado exitosamente", window.MultiTraceLLMAdapter);
})();
