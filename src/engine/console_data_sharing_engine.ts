// Author: Preston Lee

import { Consent, Coding as FhirCoding } from "fhir/r5.js";
import { AbstractDataSharingEngine } from "./abstract_data_sharing_engine.js";
import { DataSharingEngineContext } from "../model/engine_context.js";
import { AbstractDataSegmentationModuleProvider } from "../module_provider/abstract_data_segmentation_module_provider.js";
import { DataSegmentationModuleRegistry } from "../core/data_segmentation_module_registry.js";
import { DocumentProcessorRegistry } from "../document_processor/document_processor_registry.js";

export class ConsoleDataSharingEngine extends AbstractDataSharingEngine {

    constructor(moduleProvider: AbstractDataSegmentationModuleProvider,
        threshold: number,
        redaction_enabled: boolean,
        create_audit_event: boolean,
        moduleRegistry: DataSegmentationModuleRegistry,
        documentProcessorRegistry?: DocumentProcessorRegistry) {
        super(moduleProvider, threshold, redaction_enabled, create_audit_event, moduleRegistry, documentProcessorRegistry);
    }

    createAuditEvent(consents: Consent[], engineContext: DataSharingEngineContext, outcodeCode: FhirCoding): void {
        console.info('WebDataSharingEngine.createAuditEvent', consents, engineContext, outcodeCode);
    }

}