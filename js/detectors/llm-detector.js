/**
 * Detector para SCORMs generados por LLM (ChatGPT, Claude, Qwen, etc.)
 * Patrón: Objeto literal global (igual que Rise/Storyline)
 */
(function() {
    console.log("[DEBUG] Cargando detector LLM...");

    window.MultiTraceLLMDetector = {
        id: 'llm-scorm',
        name: 'LLM Generated SCORM Detector',

        /**
         * Detecta si un ZIP es un SCORM genérico generado por LLM.
         * @param {Object} zipContents - Contenido del ZIP (objeto JSZip)
         * @param {XMLDocument} manifest - El imsmanifest.xml parseado
         * @returns {boolean}
         */
        detect: function(zipContents, manifest) {
            if (!manifest) return false;

            // 1. Verificar que NO sea un sistema conocido (Rise, Storyline, eXe)
            // Si los detectores específicos ya pasaron, asumimos que no son esos.
            // Pero hacemos una comprobación de seguridad buscando strings únicos.
            const allFiles = Object.keys(zipContents);
            for (const file of allFiles) {
                if (file.endsWith('.js')) {
                    try {
                        // Obtenemos el contenido como texto si es posible (JSZip a veces requiere .async)
                        // Para detección rápida, nos basamos en nombres de archivo o estructura del manifest primero.
                        // Si el detector de Rise ya falló, es seguro asumir que no tiene sus huellas específicas.
                    } catch (e) {}
                }
            }

            // 2. Estrategia principal: Estructura simple y genérica
            const resources = manifest.getElementsByTagName('resource');
            
            // Un SCORM de LLM suele tener pocos recursos y nombres genéricos
            let hasGenericLaunch = false;
            let hasSimpleStructure = resources.length > 0 && resources.length <= 10;

            for (let i = 0; i < resources.length; i++) {
                const href = resources[i].getAttribute('href') || '';
                const identifier = resources[i].getAttribute('identifier') || '';
                
                // Buscamos el archivo de lanzamiento típico
                if (href === 'index.html' || href === 'scorm.html' || href === 'main.html') {
                    hasGenericLaunch = true;
                }
                
                // Identificadores genéricos
                if (identifier.toLowerCase().includes('scorm') || identifier === 'resource1') {
                    hasGenericLaunch = true; 
                }
            }

            // Si tiene lanzamiento genérico y estructura simple, es candidato fuerte
            // IMPORTANTE: Este detector debe ejecutarse DESPUÉS de los específicos.
            // La lógica de "fallback" se maneja en el adaptador o en el orden de registro.
            // Aquí devolvemos true si parece un SCORM "huérfano" sin vendor claro.
            
            // Heurística: Si hay un index.html y el manifest es válido, pero no hemos detectado vendor antes.
            // Como no tenemos contexto de "ya fallaron los otros", usamos una regla simple:
            // ¿Tiene index.html? ¿Es un SCORM válido? -> Lo tratamos como LLM si no tiene carpetas típicas de autor.
            
            const hasIndex = zipContents['index.html'] || zipContents['./index.html'];
            
            if (hasIndex && hasSimpleStructure) {
                // Comprobación negativa: ¿Tiene carpetas de Articulate (rise) o story_content (storyline)?
                // Esto evita falsos positivos si el orden de detección falla.
                for (const path in zipContents) {
                    if (path.includes('story_content') || path.includes('html5/')) return false; // Storyline/Rise hints
                }
                return true;
            }

            return false;
        }
    };

    console.log("[DEBUG] Detector LLM definido en window.MultiTraceLLMDetector");
})();
