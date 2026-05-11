/**
 * Detector para SCORMs generados por LLM (ChatGPT, Claude, Qwen, etc.)
 */
(function() {
    class LLMDetector {
        static detect(zipContents, manifest) {
            if (!manifest) return false;

            // 1. Verificar que NO sea un sistema conocido (Rise, Storyline, eXe)
            // Esto evita conflictos con detectores más específicos
            const allFiles = Object.keys(zipContents);
            for (const file of allFiles) {
                if (file.endsWith('.js')) {
                    try {
                        // Obtenemos el contenido si es texto (los JS lo suelen ser)
                        // Nota: zipContents puede tener el contenido crudo o procesado dependiendo de tu loader
                        // Asumimos que si podemos leerlo, buscamos patrones.
                        // Si el loader convierte todo a string, bien. Si es Blob, esto fallará silenciosamente y seguiremos.
                        let content = "";
                        if (typeof zipContents[file] === 'string') {
                            content = zipContents[file];
                        } 
                        
                        if (content.length > 0) {
                            if (content.includes('SCORMAdapter') && content.includes('Articulate')) return false; // Rise
                            if (content.includes('eXeLearning')) return false; // eXe
                            if (content.includes('Storyline')) return false; // Storyline
                        }
                    } catch (e) {
                        // Ignorar errores de lectura (archivos binarios dentro del zip)
                    }
                }
                // Check rápido en HTMLs también
                if (file.endsWith('.html') || file.endsWith('.xml')) {
                     try {
                        let content = typeof zipContents[file] === 'string' ? zipContents[file] : "";
                        if (content.includes('imsmanifest')) {
                            // Si el manifest tiene namespaces de herramientas específicas, descartar
                            if (content.includes('adlcp:') && content.includes('scormtype="webcontent"')) {
                                // Genérico, seguir
                            }
                        }
                     } catch(e) {}
                }
            }

            // 2. Estrategia de detección "Genérica Limpia"
            // Los SCORM de LLM suelen tener:
            // - Un manifest muy simple
            // - Pocos recursos
            // - Nombres de archivo genéricos (index.html, scorm.js)
            
            const resources = manifest.getElementsByTagName('resource');
            
            // Si tiene muchos recursos, probablemente sea una herramienta autoría compleja no detectada antes
            // Pero los de LLM suelen ser 1 o 2 recursos máximo.
            if (resources.length > 5) return false;

            let hasGenericLaunch = false;
            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                if (href === 'index.html' || href === 'index.htm' || href === 'scorm.html' || identifier.toLowerCase() === 'scorm') {
                    hasGenericLaunch = true;
                    break;
                }
            }

            // Si es simple, no tiene marcas de agua de otros autores y tiene un launch genérico: ES LLM
            return hasGenericLaunch;
        }
    }

    // Exponer globalmente
    window.LLMDetector = LLMDetector;
    console.log('[DEBUG] LLMDetector cargado');
})();
