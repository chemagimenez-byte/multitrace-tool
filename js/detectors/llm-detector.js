/**
 * Detector para SCORMs generados por LLM.
 * Estrategia: "Último recurso".
 * 1. Verifica que sea un SCORM válido (tiene manifest).
 * 2. Asume que es LLM si NO ha sido detectado por los adaptadores específicos (Rise, Storyline, eXe).
 */
export class LLMDetector {
    static detect(zipContents, manifest, otherAdaptersResults = {}) {
        if (!manifest) return false;

        // 1. Comprobación básica de SCORM válido
        const resources = manifest.getElementsByTagName('resource');
        if (resources.length === 0) return false;

        // 2. EXCLUSIÓN EXPLÍCITA DE SISTEMAS CONOCIDOS
        // Si Rise, Storyline o eXe ya detectaron este paquete, NO lo tocamos.
        // Esto evita conflictos y dobles inyecciones.
        if (otherAdaptersResults.rise === true || 
            otherAdaptersResults.storyline === true || 
            otherAdaptersResults.exelearning === true) {
            return false;
        }

        // 3. HEURÍSTICA OPCIONAL (Para evitar falsos positivos con SCORMs muy antiguos o raros)
        // Buscamos señales típicas de generación por código (nombres genéricos, estructura plana)
        let score = 0;
        
        // Punto extra si el archivo de entrada es index.html (muy común en LLMs)
        for (let i = 0; i < resources.length; i++) {
            const href = resources[i].getAttribute('href') || '';
            if (href === 'index.html' || href === 'scorm.html') score++;
            
            const identifier = resources[i].getAttribute('identifier') || '';
            if (identifier.toLowerCase().includes('scorm') || identifier === 'resource1') score++;
        }

        // Si tiene estructura básica y no es de un vendor conocido, lo aceptamos.
        // Incluso si el score es bajo, si pasó el filtro de "no es conocido", es candidato fuerte.
        return true;
    }
}
