// Author: Preston Lee

import { Consent, Coding } from "fhir/r5.js";
import { AbstractDataSharingEngine } from "./abstract_data_sharing_engine.js";
import { DataSharingEngineContext } from "../model/engine_context.js";
import { AbstractSensitivityRuleProvider } from "../rules/abstract_sensitivity_rule_provider.js";
import { DataSegmentationModuleRegistry } from "../core/data_segmentation_module_registry.js";

export class ConsoleDataSharingEngine extends AbstractDataSharingEngine {

    constructor(ruleProvider: AbstractSensitivityRuleProvider,
        threshold: number,
        redaction_enabled: boolean,
        create_audit_event: boolean,
        moduleRegistry: DataSegmentationModuleRegistry) {
        super(ruleProvider, threshold, redaction_enabled, create_audit_event, moduleRegistry);
    }

    createAuditEvent(consents: Consent[], engineContext: DataSharingEngineContext, outcodeCode: Coding): void {
        console.info('WebDataSharingEngine.createAuditEvent', consents, engineContext, outcodeCode);
    }

}