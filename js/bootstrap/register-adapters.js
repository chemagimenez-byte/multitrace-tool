(function () {
  const registry = window.MultiTraceRegistry;

  if (!registry) {
    throw new Error("MultiTraceRegistry no está disponible.");
  }

  // Registramos los objetos directamente, sin 'new'
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
    console.log("[DEBUG] Registrando adaptador LLM...", window.MultiTraceLLMAdapter);
    registry.register(window.MultiTraceLLMAdapter);
  }
})();
