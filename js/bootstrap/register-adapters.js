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

  // NUEVO: registrar adaptador de eXeLearning
  if (window.MultiTraceExeLearningAdapter) {
    registry.register(window.MultiTraceExeLearningAdapter);
  }

  // NUEVO: registrar adaptador de LLM (Debe ir el último, es la red de seguridad)
  if (window.MultiTraceLLMAdapter) {
    registry.register(window.MultiTraceLLMAdapter);
  }
})();
