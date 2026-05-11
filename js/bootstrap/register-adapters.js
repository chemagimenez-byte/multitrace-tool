(function () {
  const registry = window.MultiTraceRegistry;

  if (!registry) {
    throw new Error("MultiTraceRegistry no está disponible.");
  }

  if (window.MultiTraceRiseAdapter) {
    registry.register(window.MultiTraceRiseAdapter);
  }

  if (window.MultiTraceStorylineAdapter) {
    registry.register(window.MultiTraceStorylineAdapter);
  }

  if (window.MultiTraceExeLearningAdapter) {
    registry.register(window.MultiTraceExeLearningAdapter);
  }

  // NUEVO: registrar adaptador para SCORMs de LLM
  if (window.MultiTraceLLMAdapter) {
    console.log("[DEBUG] Registrando adaptador LLM...");
    registry.register(window.MultiTraceLLMAdapter);
    
    // --- TEST DE DIAGNÓSTICO ---
    // Simulamos una llamada directa para ver si el detector responde
    console.warn("[DIAGNÓSTICO] Probando detector LLM manualmente con datos ficticios...");
    // No podemos probar sin un ZIP real, pero verificamos que la función existe y es callable
    if (typeof window.MultiTraceLLMAdapter.supports === 'function') {
        console.log("[DIAGNÓSTICO] Función supports() encontrada y es válida.");
    } else {
        console.error("[DIAGNÓSTICO] ERROR: supports() no es una función.", window.MultiTraceLLMAdapter);
    }
    // ---------------------------
  }
  
  // Listar todos los adaptadores registrados
  console.log("[DEBUG] Adaptadores registrados en total:", registry.list().length);
  registry.list().forEach((adapter, index) => {
      console.log(`  ${index + 1}. ${adapter.id} (${adapter.name})`);
  });
})();
