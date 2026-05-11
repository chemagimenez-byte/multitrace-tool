(function () {
  function buildOutputName(originalName) {
    if (/\.zip$/i.test(originalName)) {
      return originalName.replace(/\.zip$/i, "_traza.zip");
    }
    return `${originalName}_traza.zip`;
  }

  async function processRiseZip(file, options) {
    console.log("[DEBUG] zip.js processRiseZip()");

    const zip = await JSZip.loadAsync(file);
    const detector = window.MultiTraceRiseDetector;
    const patcher = window.MultiTraceRisePatch;

    if (!detector) {
      throw new Error("No se ha cargado el detector de Rise.");
    }

    if (!patcher) {
      throw new Error("No se ha cargado el parche de Rise.");
    }

    const indexPath = detector.findPreferredIndex(zip);
    if (!indexPath) {
      throw new Error("No se ha encontrado index.html en el paquete.");
    }

    const pkgInfo = await detector.detect(zip, indexPath);
    detector.validate(pkgInfo);

    const zipEntry = zip.file(indexPath);
    if (!zipEntry) {
      throw new Error("No se ha podido abrir index.html.");
    }

    let html = await zipEntry.async("string");
    const alreadyPatched = patcher.hasExistingPatch(html);

    if (alreadyPatched && !options.force) {
      return {
        blob: null,
        outputName: null,
        message: "El paquete ya estaba trazado. No se ha modificado.",
        already: true,
        downloadable: false,
        packageType: pkgInfo.type,
        systemLabel: "Rise / Moodle"
      };
    }

    if (alreadyPatched && options.force) {
      html = patcher.removeExistingPatch(html);
    }

    const patch = patcher.buildPatch(options.debug);
    const injectedHtml = patcher.injectIntoHtml(html, patch);

    if (!injectedHtml) {
      throw new Error("No se ha encontrado un punto de inyección válido.");
    }

    zip.file(indexPath, injectedHtml);

    const outputBlob = await zip.generateAsync({ type: "blob" });

    return {
      blob: outputBlob,
      outputName: buildOutputName(file.name),
      message: alreadyPatched
        ? `Traza reinyectada en ${indexPath}`
        : `Trazado inyectado en ${indexPath}`,
      already: false,
      downloadable: true,
      packageType: pkgInfo.type,
      systemLabel: "Rise / Moodle"
    };
  }

  async function processStorylineZip(file, options) {
    const zip = await JSZip.loadAsync(file);
    const detector = window.MultiTraceStorylineDetector;
    const patcher = window.MultiTraceStorylinePatch;

    if (!detector) {
      throw new Error("No se ha cargado el detector de Storyline.");
    }

    if (!patcher) {
      throw new Error("No se ha cargado el parche de Storyline.");
    }

    const entryPath = detector.findPreferredEntry(zip);
    if (!entryPath) {
      throw new Error("No se ha encontrado story.html en el paquete.");
    }

    const pkgInfo = await detector.detect(zip, entryPath);
    detector.validate(pkgInfo);

    const entry = zip.file(entryPath);
    if (!entry) {
      throw new Error("No se ha podido abrir story.html.");
    }

    let html = await entry.async("string");
    const alreadyPatched = patcher.hasExistingPatch(html);

    if (alreadyPatched && !options.force) {
      return {
        blob: null,
        outputName: null,
        message: "El paquete ya estaba trazado. No se ha modificado.",
        already: true,
        downloadable: false,
        packageType: pkgInfo.type,
        systemLabel: "Storyline 360"
      };
    }

    if (alreadyPatched && options.force) {
      html = patcher.removeExistingPatch(html);
    }

    const injectedHtml = patcher.injectIntoHtml(html);
    if (!injectedHtml) {
      throw new Error("No se ha encontrado un punto de inyección válido en story.html.");
    }

    zip.file(entryPath, injectedHtml);
    zip.file(patcher.patchFilePath, patcher.buildPatch(options.debug));

    const outputBlob = await zip.generateAsync({ type: "blob" });

    return {
      blob: outputBlob,
      outputName: buildOutputName(file.name),
      message: alreadyPatched
        ? `Traza Storyline reinyectada en ${entryPath}`
        : `Traza Storyline inyectada en ${entryPath}`,
      already: false,
      downloadable: true,
      packageType: pkgInfo.type,
      systemLabel: "Storyline 360"
    };
  }

  // NUEVA FUNCIÓN para eXeLearning
  async function processExeLearningZip(file, options) {
    const zip = await JSZip.loadAsync(file);
    const detector = window.MultiTraceExeLearningDetector;
    const patcher = window.MultiTraceExeLearningPatch;

    if (!detector) throw new Error("No se ha cargado el detector de eXeLearning.");
    if (!patcher) throw new Error("No se ha cargado el parche de eXeLearning.");

    // Leer imsmanifest.xml para obtener todas las páginas HTML
    let manifestFile = zip.file("imsmanifest.xml");
    if (!manifestFile) throw new Error("No se encuentra imsmanifest.xml");

    let manifestXml = await manifestFile.async("string");
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(manifestXml, "application/xml");

    // Obtener recursos de tipo webcontent que tengan href .html
    let resources = xmlDoc.querySelectorAll("resource[type='webcontent']");
    let htmlFiles = [];
    for (let res of resources) {
      let href = res.getAttribute("href");
      if (href && href.match(/\.html?$/i)) {
        htmlFiles.push(href);
      }
    }
    // Fallback: buscar todos los .html en el ZIP
    if (htmlFiles.length === 0) {
      htmlFiles = Object.keys(zip.files).filter(name => name.match(/\.html?$/i) && !name.includes("/_"));
    }

    const totalPages = htmlFiles.length;
    if (totalPages === 0) throw new Error("No se encontraron archivos HTML en el paquete.");

    // Procesar cada archivo HTML inyectando el mismo script (pero con su ID)
    for (let htmlPath of htmlFiles) {
      let entry = zip.file(htmlPath);
      if (!entry) continue;

      let html = await entry.async("string");
      let alreadyPatched = patcher.hasExistingPatch(html);

      if (alreadyPatched && !options.force) {
        continue; // Saltar si ya tiene parche y no se fuerza
      }

      if (alreadyPatched && options.force) {
        html = patcher.removeExistingPatch(html);
      }

      // Construir parche con totalPages y el identificador de esta página (su ruta)
      const patch = patcher.buildPatch(options.debug, totalPages, htmlPath);
      const injectedHtml = patcher.injectIntoHtml(html, patch);
      if (!injectedHtml) {
        console.warn(`No se pudo inyectar en ${htmlPath}, se omite.`);
        continue;
      }

      zip.file(htmlPath, injectedHtml);
    }

    const outputBlob = await zip.generateAsync({ type: "blob" });

    return {
      blob: outputBlob,
      outputName: buildOutputName(file.name),
      message: `Traza eXeLearning inyectada en ${totalPages} páginas (seguimiento por páginas únicas visitadas).`,
      already: false,
      downloadable: true,
      packageType: "exelearning",
      systemLabel: "eXeLearning"
    };
  }

  // NUEVA FUNCIÓN para SCORMs generados por LLM
  async function processLLMZip(file, options) {
    console.log("[DEBUG] zip.js processLLMZip()");
    
    const zip = await JSZip.loadAsync(file);
    const adapter = window.MultiTraceLLMAdapter;

    if (!adapter) {
      throw new Error("No se ha cargado el adaptador LLM.");
    }

    // Leer manifiesto
    let manifestFile = zip.file("imsmanifest.xml");
    if (!manifestFile) throw new Error("No se encuentra imsmanifest.xml en el paquete LLM.");
    
    let manifestXml = await manifestFile.async("string");
    let parser = new DOMParser();
    let xmlDoc = parser.parseFromString(manifestXml, "application/xml");

    // Usar el método process del adaptador
    try {
      const processedZipContents = await adapter.process(zip.files, xmlDoc, options);
      
      // Reconstruir el objeto ZIP con los contenidos modificados
      // Nota: zip.files es solo lectura en JSZip, debemos crear uno nuevo o modificar entradas existentes
      const newZip = new JSZip();
      
      for (const [filename, fileData] of Object.entries(processedZipContents)) {
        if (typeof fileData === 'string') {
            newZip.file(filename, fileData);
        } else {
            // Si es un objeto file de JSZip original (no modificado), copiar su contenido binario
            // Pero como adapter.process devuelve strings modificados y pasa los originales,
            // necesitamos manejar la copia de binarios si el adaptador no los tocó.
            // Simplificación: El adaptador debería devolver todo el contenido necesario o 
            // trabajamos directamente sobre el zip original modificando solo los targets.
            
            // CORRECCIÓN DE ESTRATEGIA: 
            // El adaptador LLM modifica el objeto zip.files directamente (por referencia) o devuelve una mappa.
            // Si devuelve una mappa con strings, rellenamos newZip. 
            // Si hay archivos que no están en la mappa (binarios), debemos copiarlos del original.
        }
      }
      
      // Estrategia simplificada y robusta:
      // Iterar sobre el ZIP original. Si el filename está en processedZipContents, usar ese contenido.
      // Si no, copiar el original.
      for (const [filename, originalEntry] of Object.entries(zip.files)) {
          if (processedZipContents[filename]) {
              // Ya fue procesado/modificado por el adaptador
              newZip.file(filename, processedZipContents[filename]);
          } else {
              // Copiar tal cual (usando async para obtener el blob/string si fuera necesario, 
              // pero JSZip permite pasar la entrada directa si es compatible, o mejor leer y reescribir)
              // Para asegurar integridad, leemos y reescribimos.
              const content = await originalEntry.async("uint8array");
              newZip.file(filename, content);
          }
      }

      const outputBlob = await newZip.generateAsync({ type: "blob" });

      return {
        blob: outputBlob,
        outputName: buildOutputName(file.name),
        message: "Traza LLM inyectada correctamente (gestión de progreso y persistencia).",
        already: false,
        downloadable: true,
        packageType: "llm-scorm",
        systemLabel: "SCORM Genérico (LLM)"
      };

    } catch (e) {
      console.error("Error procesando SCORM LLM:", e);
      throw new Error("Error al inyectar traza en SCORM LLM: " + e.message);
    }
  }

  async function detectPackageType(zip) {
    const riseDetector = window.MultiTraceRiseDetector;
    const storylineDetector = window.MultiTraceStorylineDetector;
    const exeDetector = window.MultiTraceExeLearningDetector;
    // No usamos detector LLM aquí de forma estricta como los otros, 
    // porque actúa como fallback. Pero podemos hacer una comprobación rápida si quisiéramos.
    // La lógica principal de fallback está en processZip.

    if (riseDetector) {
      const riseIndex = riseDetector.findPreferredIndex(zip);
      if (riseIndex) {
        const riseInfo = await riseDetector.detect(zip, riseIndex);
        if (riseInfo.looksLikeRise) {
          return { type: "rise" };
        }
      }
    }

    if (storylineDetector) {
      const storyEntry = storylineDetector.findPreferredEntry(zip);
      if (storyEntry) {
        const storyInfo = await storylineDetector.detect(zip, storyEntry);
        if (storyInfo.looksLikeStoryline) {
          return { type: "storyline" };
        }
      }
    }

    if (exeDetector) {
      const exeIndex = exeDetector.findPreferredIndex(zip);
      if (exeIndex) {
        const exeInfo = await exeDetector.detect(zip, exeIndex);
        if (exeInfo.looksLikeExe) {
          return { type: "exelearning" };
        }
      }
    }

    // Si nada coincide, devolvemos unknown para que processZip intente el fallback LLM
    return { type: "unknown" };
  }

  async function processZip(file, options) {
    console.log("[DEBUG] zip.js processZip()");

    const zip = await JSZip.loadAsync(file);
    const detected = await detectPackageType(zip);

    if (detected.type === "rise") {
      return processRiseZip(file, options);
    }
    if (detected.type === "storyline") {
      return processStorylineZip(file, options);
    }
    if (detected.type === "exelearning") {
      return processExeLearningZip(file, options);
    }

    // FALLBACK: Intentar con adaptador LLM si los otros fallaron
    console.log("[DEBUG] Paquete no identificado como Rise/Story/eXe. Intentando detección LLM...");
    const llmAdapter = window.MultiTraceLLMAdapter;
    const llmDetector = window.MultiTraceLLMDetector;

    if (llmAdapter && llmDetector) {
        // Leer manifiesto para pasar al detector
        const manifestFile = zip.file("imsmanifest.xml");
        if (manifestFile) {
            const manifestXml = await manifestFile.async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(manifestXml, "application/xml");
            
            // Ejecutar detección explícita
            if (llmDetector.detect(zip.files, xmlDoc)) {
                console.log("[DEBUG] ¡Detectado como SCORM LLM! Procesando...");
                return processLLMZip(file, options);
            } else {
                console.warn("[DEBUG] El paquete no pasó la detección LLM.");
            }
        }
    }

    throw new Error("El paquete no corresponde a un formato compatible todavía.");
  }

  window.MultiTraceZip = {
    buildOutputName,
    processRiseZip,
    processStorylineZip,
    processExeLearningZip,
    processLLMZip,   // exportamos la nueva función
    processZip
  };
})();
