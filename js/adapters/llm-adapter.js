import { LLMDetector } from '../detectors/llm-detector.js';
import { getLLMTracePatch } from '../patches/llm-trace-patch.js';

/**
 * Adaptador para SCORMs generados por Inteligencia Artificial (LLMs).
 * Aplica parches de persistencia y recuperación de estado.
 */
export class LLMAdapter {
    constructor() {
        this.name = 'LLM Generated SCORM';
        this.id = 'llm-scorm';
    }

    supports(zipContents, manifest) {
        return LLMDetector.detect(zipContents, manifest);
    }

    async process(zipContents, manifest, options = {}) {
        console.log(`[MultiTrace] Procesando paquete como ${this.name}...`);
        
        const patchScript = getLLMTracePatch();
        const filesToModify = [];

        // 1. Identificar el archivo de entrada principal (launch file)
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

        // Fallback: buscar index.html en la raíz si no se encontró por atributos
        if (!launchFile && zipContents['index.html']) {
            launchFile = 'index.html';
        }

        if (!launchFile) {
            throw new Error('No se pudo identificar el archivo de lanzamiento (launch file) en el SCORM LLM.');
        }

        filesToModify.push(launchFile);

        // 2. Aplicar el parche a los archivos identificados
        for (const filePath of filesToModify) {
            if (zipContents[filePath]) {
                let content = zipContents[filePath];
                
                // Inyectar antes del cierre de </head> o al final del body si no existe head
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
