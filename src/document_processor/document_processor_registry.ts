// Author: Preston Lee

import { AbstractDocumentProcessor } from "./abstract_document_processor.js";
import { FhirBundleProcessor } from "./fhir/fhir_bundle_processor.js";
import { CdaDocumentProcessor } from "./cda/cda_document_processor.js";

/**
 * Registry for managing document processors.
 * Similar pattern to DataSegmentationModuleRegistry.
 */
export class DocumentProcessorRegistry {
    private processors: AbstractDocumentProcessor[] = [];

    /**
     * Register a document processor.
     * @param processor - The processor to register
     */
    register(processor: AbstractDocumentProcessor): void {
        this.processors.push(processor);
    }

    /**
     * Find a processor that can handle the given document.
     * @param document - The document to find a processor for
     * @returns The processor if found, null otherwise
     */
    findProcessor(document: unknown): AbstractDocumentProcessor | null {
        return this.processors.find(p => p.canProcess(document)) || null;
    }

    /**
     * Get all registered processors.
     * @returns Array of all registered processors
     */
    getAllProcessors(): AbstractDocumentProcessor[] {
        return [...this.processors];
    }

    /**
     * Create a default registry with FHIR and CDA processors.
     * @returns A new registry with default processors registered
     */
    static createDefault(): DocumentProcessorRegistry {
        const registry = new DocumentProcessorRegistry();
        registry.register(new FhirBundleProcessor());
        registry.register(new CdaDocumentProcessor());
        return registry;
    }
}
