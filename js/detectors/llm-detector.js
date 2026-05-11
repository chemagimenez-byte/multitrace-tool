/**
 * Detector para SCORMs generados por LLM
 */
(function() {
    class LLMDetector {
        static detect(zipContents, manifest) {
            if (!manifest) return false;

            const resources = manifest.getElementsByTagName('resource');
            let genericNamesCount = 0;
            
            for (let i = 0; i < resources.length; i++) {
                const identifier = resources[i].getAttribute('identifier') || '';
                const href = resources[i].getAttribute('href') || '';
                
                if (identifier.toLowerCase().includes('scorm') || 
                    identifier.toLowerCase() === 'index' ||
                    href === 'index.html' || 
                    href === 'scorm.html') {
                    genericNamesCount++;
                }
            }

            const hasSimpleStructure = resources.length <= 5 && genericNamesCount > 0;
            let isKnownAuthor = false;
            const allFiles = Object.keys(zipContents);
            
            for (const file of allFiles) {
                if (file.endsWith('.js')) {
                    try {
                        const content = zipContents[file];
                        if (content.includes('SCORMAdapter') && content.includes('Articulate')) return false;
                        if (content.includes('eXeLearning')) return false;
                        if (content.includes('Storyline')) return false;
                    } catch (e) {}
                }
            }

            return hasSimpleStructure && !isKnownAuthor;
        }
    }

    // Exponer globalmente
    window.LLMDetector = LLMDetector;
})();
