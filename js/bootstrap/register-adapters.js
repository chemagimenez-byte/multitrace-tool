(function () {
  const registry = window.MultiTraceRegistry;

  if (!registry) {
    throw new Error("MultiTraceRegistry no está disponible.");
  }

  if (window.MultiTraceRiseAdapter) {
    registry.register(new window.MultiTraceRiseAdapter());
  }

  if (window.MultiTraceStorylineAdapter) {
    registry.register(new window.MultiTraceStorylineAdapter());
  }

  // NUEVO: registrar adaptador de eXeLearning
  if (window.MultiTraceExeLearningAdapter) {
    registry.register(new window.MultiTraceExeLearningAdapter());
  }

  // NUEVO: registrar adaptador para SCORMs de LLM
  if (window.MultiTraceLLMAdapter) {
    console.log("[DEBUG] Registrando adaptador LLM...");
    registry.register(new window.MultiTraceLLMAdapter());
  }
})();
