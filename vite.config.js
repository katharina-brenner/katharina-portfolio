import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        work: resolve(import.meta.dirname, "work/index.html"),
        bioProcessTrainer: resolve(import.meta.dirname, "bioprocesstrainer/index.html"),
        cultivatedMeatCaseStudy: resolve(import.meta.dirname, "work/cultivated-meat-process-model/index.html"),
        bioreactorTechnicalAnalysis: resolve(import.meta.dirname, "work/bioreactor-technical-analysis/index.html"),
        approach: resolve(import.meta.dirname, "approach/index.html"),
        publications: resolve(import.meta.dirname, "publications/index.html"),
        openSource: resolve(import.meta.dirname, "open-source/index.html"),
        contact: resolve(import.meta.dirname, "contact/index.html"),
      },
    },
  },
});
