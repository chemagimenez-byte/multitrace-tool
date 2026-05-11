/**
 * Detector para SCORMs generados por LLM (ChatGPT, Claude, Qwen, etc.)
 * Detecta patrones comunes en SCORMs generados automáticamente que carecen de gestión de estado robusta.
 */
export class LLMDetector {
    static detect(zipContents, manifest) {
        if (!manifest) return false;

        // Estrategia 1: Buscar recursos con nombres genéricos típicos de LLM
        const resources = manifest.getElementsByTagName('resource');
        let genericNamesCount = 0;
        
        for (let i = 0; i < resources.length; i++) {
            const identifier = resources[i].getAttribute('identifier') || '';
            const href = resources[i].getAttribute('href') || '';
            
            // Patrones comunes en SCORMs de LLM
            if (identifier.toLowerCase().includes('scorm') || 
                identifier.toLowerCase() === 'index' ||
                href === 'index.html' || 
                href === 'scorm.html') {
                genericNamesCount++;
            }
        }

        // Estrategia 2: Comprobar si el manifest es muy simple (típico de generación automática)
        const hasSimpleStructure = resources.length <= 5 && genericNamesCount > 0;

        // Estrategia 3: Buscar ausencia de scripts conocidos de autores (Articulate, Adobe, etc.)
        // Si no detectamos las huellas de los otros adaptadores, es candidato a LLM
        let isKnownAuthor = false;
        const allFiles = Object.keys(zipContents);
        
        for (const file of allFiles) {
            if (file.endsWith('.js')) {
                try {
                    const content = zipContents[file];
                    if (content.includes('SCORMAdapter') && content.includes('Articulate')) return false; // Rise
                    if (content.includes('eXeLearning')) return false; // eXe
                    if (content.includes('Storyline')) return false; // Storyline
                } catch (e) {}
            }
        }

        // Si tiene estructura simple y no es de un autor conocido, asumimos LLM
        // O forzamos detección si el usuario ha etiquetado el paquete específicamente (futuro)
        // Por ahora, usaremos una detección heurística basada en la simplicidad y falta de vendor
        return hasSimpleStructure && !isKnownAuthor;
    }
}
