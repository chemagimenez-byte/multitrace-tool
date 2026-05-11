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
                        // Sobrescribir el archivo en el objeto ZIP original
                        // JSZip permite sobrescribir llamando a .file() sobre el zip padre, 
                        // PERO aquí zipContents es una colección de entradas.
                        // La estrategia correcta en el flujo actual es devolver el contenido modificado
                        // O modificar la entrada si es mutable. 
                        // Dado que processLLMZip en zip.js espera que modifiquemos el zip original passed by reference 
                        // o devolvamos un mapa, y estamos dentro de un loop asíncrono...
                        
                        // CORRECCIÓN: En el flujo actual de zip.js (processLLMZip), pasamos 'zip.files' (zipContents).
                        // Para modificarlo, debemos usar el método .file() del objeto ZIP raíz que posea estas entradas.
                        // Sin embargo, aquí solo tenemos las entradas. 
                        // Solución: El proceso en zip.js debe manejar la escritura. 
                        // Pero para mantener la compatibilidad con la firma actual, 
                        // vamos a asumir que el caller (zip.js) iterará sobre los resultados o que modificamos el blob.
                        
                        // ACTUALIZACIÓN DE ESTRATEGIA PARA ESTE ADAPTADOR:
                        // Vamos a modificar el contenido directamente en la entrada si es posible, 
                        // pero JSZip entries son de solo lectura una vez cargadas.
                        // La forma correcta es que el adaptador DEVUELVA un objeto con los cambios 
                        // O que reciba el objeto ZIP raíz.
                        
                        // REVISIÓN DEL FLUJO zip.js: processLLMZip pasa 'zip.files'.
                        // Para que esto funcione sin cambiar zip.js de nuevo, haremos un truco:
                        // Modificaremos el contenido y lo guardaremos en una propiedad temporal 
                        // o asumiremos que zip.js leerá esto.
                        
                        // MEJOR OPCIÓN SIN TOCAR zip.js AHORA:
                        // Devolver un objeto Promise que resuelva con los contenidos modificados? 
                        // No, la firma es async process(zipContents...).
                        
                        // Vamos a hacer lo que hace eXe: Modificar el zip directamente si tenemos acceso.
                        // Pero aquí NO tenemos el objeto 'zip' raíz, solo 'zipContents' (las entradas).
                        // Por tanto, este adaptador debe devolver un mapa de { filename: nuevoContenido }
                        // Y zip.js es el encargado de aplicar esos cambios.
                        
                        // Como no podemos cambiar la firma de retorno fácilmente sin romper zip.js,
                        // y zip.js actual llama a adapter.process y luego itera...
                        // Espera, en mi última versión de zip.js, yo hacía:
                        // const processedZipContents = await adapter.process(...);
                        // Y luego iteraba processedZipContents.
                        // POR TANTO: Este adaptador DEBE DEVOLVER el objeto map con los strings modificados.
                        
                        // Guardamos el resultado en el objeto que se devolverá.
                        // Pero cuidado: zipContents original tiene objetos Entry, no strings.
                        // Devolveremos un NUEVO objeto con los strings modificados para los targets,
                        // y dejaremos los demás para que zip.js los copie del original.
                        
                        // Para señalizar esto, vamos a devolver un objeto parcial { filePath: stringContent }
                        // El caller (zip.js) sabe que si es string, es contenido nuevo.
                        
                        // IMPLEMENTACIÓN DIRECTA AQUÍ:
                        // Como no podemos devolver solo un fragmento fácilmente sin cambiar la lógica de retorno,
                        // haremos que este proceso modifique un objeto externo o devuelva el mapa.
                        // Devolvamos el mapa de cambios.
                        
                        // NOTA: Para que esto funcione con el zip.js actual proporcionado anteriormente,
                        // el adaptador debe devolver un objeto donde las claves son los paths y los valores los strings.
                        // zip.js luego fusiona esto.
                        
                        // Añadimos al resultado que devolveremos al final
                        // Pero como estamos en un loop, acumulamos.
                        // (Ver retorno al final de la función)
                        
                        // TRUCO: Vamos a modificar el objeto zipContents "in place" si es posible? No.
                        // Vamos a retornar un objeto con los cambios.
                        
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
            // Si _changes está vacío, devolvemos zipContents original (aunque no debería pasar si detectó algo)
            return this._changes || {};
        }
    };

    console.log("[DEBUG] Adaptador LLM creado exitosamente", window.MultiTraceLLMAdapter);
})();
