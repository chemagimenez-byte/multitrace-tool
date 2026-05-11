import { LLMDetector } from '../detectors/llm-detector.js';
import { getLLMTracePatch } from '../patches/llm-trace-patch.js';

/**
 * Adaptador para SCORMs generados por LLM.
 * Actúa como red de seguridad para paquetes SCORM estándar que no son de autores conocidos.
 */
export class LLMAdapter {
    constructor() {
        this.name = 'LLM Generated SCORM';
        this.id = 'llm-scorm';
    }

    /**
     * El detector ahora necesita saber qué han dicho los otros adaptadores.
     * Sin embargo, la interfaz estándar del sistema pasa (zip, manifest).
     * Haremos la comprobación de "otros adaptadores" dentro del proceso si es necesario,
     * o asumiremos que si llegamos aquí, es porque los otros fallaron.
     */
    supports(zipContents, manifest) {
        // Nota: La detección fina de exclusiones se hace idealmente en el orquestador,
        // pero aquí hacemos una comprobación básica de validez.
        if (!manifest) return false;
        return true; // Confiamos en que el orquestador solo llama a esto si los otros fallaron.
    }

    async process(zipContents, manifest, options = {}) {
        console.log(`[MultiTrace] Detectado paquete genérico/LLM. Aplicando parche de persistencia...`);
        
        const patchScript = getLLMTracePatch();
        let launchFile = null;

        // 1. Identificar el archivo principal
        const resources = manifest.getElementsByTagName('resource');
        
        // Buscar el recurso con atributo 'launch' o el primero que sea HTML
        for (let i = 0; i < resources.length; i++) {
            const isLaunch = resources[i].getAttribute('launch'); // SCORM 2004 a veces usa esto
            const href = resources[i].getAttribute('href');
            
            if (isLaunch) {
                launchFile = isLaunch;
                break;
            }
            if (href && (href.endsWith('.html') || href.endsWith('.htm'))) {
                // Priorizar index.html si hay varios
                if (!launchFile || href === 'index.html' || href === 'index.htm') {
                    launchFile = href;
                }
            }
        }

        if (!launchFile) {
            console.warn('[MultiTrace] No se encontró archivo HTML de lanzamiento en el manifiesto.');
            return zipContents; // Devolver sin cambios si no encontramos dónde inyectar
        }

        // 2. Inyectar el parche
        if (zipContents[launchFile]) {
            let content = zipContents[launchFile];
            
            // Intentar inyectar en </head>
            if (content.includes('</head>')) {
                content = content.replace('</head>', `${patchScript}\n</head>`);
            } 
            // Fallback a </body>
            else if (content.includes('</body>')) {
                content = content.replace('</body>', `${patchScript}\n</body>`);
            } 
            // Fallback final: al principio del archivo (dentro de un script si es posible, o al final)
            else {
                content = `${patchScript}\n${content}`;
            }

            zipContents[launchFile] = content;
            console.log(`[MultiTrace] ÉXITO: Parche LLM inyectado en '${launchFile}'`);
        } else {
            console.error(`[MultiTrace] ERROR: El archivo '${launchFile}' no existe en el ZIP.`);
        }

        return zipContents;
    }
}
