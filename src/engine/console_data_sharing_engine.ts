// Author: Preston Lee

import { Consent, Coding } from "fhir/r5.js";
import { AbstractDataSharingEngine } from "./abstract_data_sharing_engine.js";
import { DataSharingEngineContext } from "../model/engine_context.js";
import { AbstractDataSegmentationModuleProvider } from "../module_provider/abstract_data_segmentation_module_provider.js";
import { DataSegmentationModuleRegistry } from "../core/data_segmentation_module_registry.js";

export class ConsoleDataSharingEngine extends AbstractDataSharingEngine {

    constructor(moduleProvider: AbstractDataSegmentationModuleProvider,
        threshold: number,
        redaction_enabled: boolean,
        create_audit_event: boolean,
        moduleRegistry: DataSegmentationModuleRegistry) {
        super(moduleProvider, threshold, redaction_enabled, create_audit_event, moduleRegistry);
    }

    createAuditEvent(consents: Consent[], engineContext: DataSharingEngineContext, outcodeCode: Coding): void {
        console.info('WebDataSharingEngine.createAuditEvent', consents, engineContext, outcodeCode);
    }

}