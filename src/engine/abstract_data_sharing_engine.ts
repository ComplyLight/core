// Author: Preston Lee

import { Coding as FhirCoding, Consent, ConsentProvision, FhirResource } from "fhir/r5.js";
import { ConsentExtension } from "../model/consent_extension.js";
import { AbstractDataSegmentationModuleProvider } from "../module_provider/abstract_data_segmentation_module_provider.js";
import { DataSharingEngineContext } from "../model/engine_context.js";
import { Card } from "../cds/cards/card.js";
import { DenyCard } from "../cds/cards/deny_card.js";
import { NoConsentCard } from "../cds/cards/no_consent_card.js";
import { PermitCard } from "../cds/cards/permit_card.js";
import { ConsentCategorySettings, ConsentDecision, InformationCategorySetting } from "../index.js";
import { DataSegmentationModuleRegistry } from "../core/data_segmentation_module_registry.js";
import { DataSegmentationModule } from "../core/data_segmentation_module.js";
import { Policy } from "../model/policy.js";
import { CodingWithPolicies } from "../model/coding_with_policies.js";
import { DocumentProcessorRegistry } from "../document_processor/document_processor_registry.js";
import { ProcessableDocument } from "../document_processor/types/processable_document.js";
import { DocumentType } from "../document_processor/types/document_type.js";

export abstract class AbstractDataSharingEngine {

    protected moduleRegistry: DataSegmentationModuleRegistry;
    protected documentProcessorRegistry: DocumentProcessorRegistry;

    constructor(public moduleProvider: AbstractDataSegmentationModuleProvider,
        public threshold: number,
        public redaction_enabled: boolean,
        public create_audit_event: boolean,
        moduleRegistry: DataSegmentationModuleRegistry,
        documentProcessorRegistry?: DocumentProcessorRegistry) {
        this.moduleRegistry = moduleRegistry;
        // Use provided registry or create default with FHIR and CDA processors
        this.documentProcessorRegistry = documentProcessorRegistry || DocumentProcessorRegistry.createDefault();
    }


    process(consents: Consent[], engineContext: DataSharingEngineContext): Card {
        // Find and determine the correct card type.
        const filtered = this.filterForApplicableConsents(consents);
        let card: Card = new NoConsentCard();
        if (filtered.length > 0) {
            console.info('Evaluating ' + filtered.length + ' applicable consents.');

            let results = [];
            for (let i = 0; i < filtered.length; i++) {
                const consent = filtered[i];
                results.push(this.consentDecision(consent));

            }

            let permits = results.filter(sr => { return sr == 'permit' });
            let denies = results.filter(sr => { return sr == 'deny' });
            // Any deny decision should trump all permit decisions.
            if (denies.length > 0) {
                card = new DenyCard();
            } else if (permits.length > 0) {
                card = new PermitCard();
            }
        } else {
            console.info("No applicable consent documents.");
        }

        // Get or create ProcessableDocument from context
        let processableDoc: ProcessableDocument | null = null;
        if (engineContext.contentDocument) {
            processableDoc = engineContext.contentDocument;
        } else if (engineContext.content) {
            // Legacy: convert FHIR Bundle to ProcessableDocument
            const processor = this.documentProcessorRegistry.findProcessor(engineContext.content);
            if (processor) {
                processableDoc = processor.process(engineContext.content);
            }
        } else if (engineContext.contentRaw) {
            // Try to process raw content
            const processor = this.documentProcessorRegistry.findProcessor(engineContext.contentRaw);
            if (processor) {
                processableDoc = processor.process(engineContext.contentRaw);
            }
        }

        // Add copy of request content to response, if present.
        if (processableDoc) {
            card.extension = new ConsentExtension(processableDoc);
            card.extension.decision = card.summary;
        } else if (engineContext.content) {
            // Fallback to legacy FHIR Bundle
            card.extension = new ConsentExtension(engineContext.content);
            card.extension.decision = card.summary;
        }

        // Apply security labels
        if (card.extension) {
            this.addSecurityLabels(consents, engineContext, card.extension);
        }

        // Redact resources
        if (this.redaction_enabled && card.extension) {
            this.redactFromLabels(card.extension);
        }

        // Update the number of bundle resource, as it may have changed due to redaction.
        if (card.extension?.contentDocument) {
            const units = card.extension.contentDocument.getLabelableUnits();
            // For FHIR Bundle backward compatibility
            if (card.extension.content?.entry) {
                card.extension.content.total = units.length;
            }
        } else if (card.extension?.content?.entry) {
            card.extension.content.total = card.extension?.content?.entry?.length;
        }

        // Create an AuditEvent with the results.
        let outcodeCode = { code: card.extension.decision, display: card.extension.decision };
        if (this.create_audit_event) {
            this.createAuditEvent(consents, engineContext, outcodeCode);
        }
        return card;
    }

    abstract createAuditEvent(consents: Consent[], engineContext: DataSharingEngineContext, outcodeCode: FhirCoding): void;

    addSecurityLabels(consents: Consent[], engineContext: DataSharingEngineContext, consentExtension: ConsentExtension) {
        // Get ProcessableDocument from extension or context
        let processableDoc: ProcessableDocument | null = null;
        if (consentExtension.contentDocument) {
            processableDoc = consentExtension.contentDocument;
        } else if (consentExtension.content) {
            // Legacy: convert FHIR Bundle to ProcessableDocument
            const processor = this.documentProcessorRegistry.findProcessor(consentExtension.content);
            if (processor) {
                processableDoc = processor.process(consentExtension.content);
                if (processableDoc) {
                    consentExtension.contentDocument = processableDoc;
                }
            }
        }

        if (!processableDoc) {
            return; // No processable document available
        }

        // Get all labelable units
        const units = processableDoc.getLabelableUnits();

        // Track unique bindings to avoid duplicate obligations
        const seenBindings = new Set<string>();

        // Process each unit
        units.forEach(unit => {
            // Extract codings from this specific unit
            const unitCodings = unit.extractCodings();
            const unitBindings = this.moduleProvider.applicableBindingsForAll(unitCodings, this.threshold);

            unitBindings.forEach(binding => {
                // Create unique key for this binding to avoid duplicate obligations
                const bindingKey = `${binding.id || 'binding'}-${binding.labels.map(l => `${l.system}|${l.code}`).join(',')}`;
                
                // Add redaction obligation only once per unique binding
                if (!seenBindings.has(bindingKey)) {
                    seenBindings.add(bindingKey);
                    const ob = {
                        id: AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION,
                        parameters: { codes: binding.labels }
                    };
                    consentExtension.obligations.push(ob);
                }

                // Prepare labels to apply with policies attached
                // The processor will handle duplicate detection and policy merging
                const labelsToApply: CodingWithPolicies[] = binding.labels.map(l => {
                    const label = new CodingWithPolicies();
                    label.system = l.system;
                    label.code = l.code;
                    label.display = l.display;
                    // Attach policies from binding
                    if (binding.policies.length > 0) {
                        label.policies = binding.policies.map(p => p.clone());
                    }
                    return label;
                });

                // Apply labels to the unit (processor handles duplicate detection and merging)
                processableDoc!.applySecurityLabelsToUnit(unit.id, labelsToApply);
            });
        });

        // Update extension with modified document
        consentExtension.contentDocument = processableDoc;
        
        // For backward compatibility, update FHIR Bundle if it's a FHIR document
        if (processableDoc.getDocumentType() === DocumentType.FHIR_BUNDLE) {
            const fhirDoc = processableDoc as any;
            if (fhirDoc.getBundle) {
                consentExtension.content = fhirDoc.getBundle();
            }
        }
    }

    /**
     * Check if a security label is a duplicate of an existing one.
     * @param existing - Array of existing security labels
     * @param candidate - Candidate label to check
     * @returns True if duplicate (same system + code), false otherwise
     */
    isDuplicateSecurityLabel(existing: (FhirCoding | CodingWithPolicies)[], candidate: CodingWithPolicies): boolean {
        return existing.some(existingLabel => 
            existingLabel.system === candidate.system && 
            existingLabel.code === candidate.code
        );
    }

    /**
     * Find an existing security label that matches the candidate.
     * @param existing - Array of existing security labels
     * @param candidate - Candidate label to find
     * @returns The existing label if found, undefined otherwise
     */
    findSecurityLabel(existing: (FhirCoding | CodingWithPolicies)[], candidate: CodingWithPolicies): CodingWithPolicies | undefined {
        const found = existing.find(existingLabel => 
            existingLabel.system === candidate.system && 
            existingLabel.code === candidate.code
        );
        // Cast to our CodingWithPolicies type if found (may already be CodingWithPolicies or FhirCoding)
        return found as CodingWithPolicies | undefined;
    }

    /**
     * Check if a unit should be redacted based on redaction labels in obligations.
     * @param consentExtension - The consent extension containing obligations
     * @param unitId - The ID of the unit to check
     * @param processableDoc - The processable document containing the unit
     * @returns True if the unit should NOT be redacted (i.e., should be kept), false if it should be redacted
     */
    shouldRedactFromLabels(consentExtension: ConsentExtension, unitId: string, processableDoc: ProcessableDocument): boolean {
        // Get redaction labels from obligations
        const redactionLabels: CodingWithPolicies[] = [];
        consentExtension.obligations.forEach(o => {
            if (o.id.code === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code &&
                o.id.system === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system) {
                o.parameters.codes.forEach(code => {
                    const label = new CodingWithPolicies();
                    label.system = code.system;
                    label.code = code.code;
                    redactionLabels.push(label);
                });
            }
        });

        if (redactionLabels.length === 0) {
            return true; // No redaction labels, keep the unit
        }

        // Check if unit should be redacted using format-agnostic method
        return !processableDoc.shouldRedactUnit(unitId, redactionLabels);
    }

    /**
     * Legacy method for backward compatibility with FHIR resources.
     * @deprecated Use shouldRedactFromLabels with ProcessableDocument instead
     */
    shouldRedactFromLabelsLegacy(consentExtension: ConsentExtension, resource: FhirResource): boolean {
        let shouldRedact = false;
        if (resource?.meta?.security) {
            consentExtension.obligations.forEach(o => {
                if (o.id.code == AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code && o.id.system == AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system) {
                    o.parameters.codes.forEach(code => {
                        resource!.meta!.security!.findIndex((c, i, all) => {
                            if (code.code == c.code && code.system == c.system) {
                                shouldRedact = true;
                            }
                        });

                    });
                }
            });
            return !shouldRedact;
        }
        // Will default to false if there are no labels.
        return shouldRedact;
    }

    sharableForPurpose(p: ConsentProvision, c: InformationCategorySetting): boolean {
        let sharable = false;

        if (p.purpose) {
            p.purpose.forEach((purpose) => {
                if (c.system == purpose.system && c.act_code == purpose.code) {
                    sharable = true;
                }
            });
        }
        return sharable;
    }

    shouldShareFromPurposes(r: FhirResource, p: ConsentProvision): boolean {
        let sharable = false;
        const enabledPurposes = this.moduleRegistry.getAllPurposes();
        enabledPurposes.forEach(purpose => {
            if (purpose.enabled && this.sharableForPurpose(p, purpose)) {
                sharable = true;
            }
        });
        return sharable;
    }

    /**
     * Check if a unit should be shared based on purposes (format-agnostic version).
     * @param unitId - The ID of the unit to check
     * @param processableDoc - The processable document
     * @param p - The consent provision
     * @returns True if the unit should be shared
     */
    shouldShareFromPurposesUnit(unitId: string, processableDoc: ProcessableDocument, p: ConsentProvision): boolean {
        let sharable = false;
        const enabledPurposes = this.moduleRegistry.getAllPurposes();
        enabledPurposes.forEach(purpose => {
            if (purpose.enabled && this.sharableForPurpose(p, purpose)) {
                sharable = true;
            }
        });
        return sharable;
    }

    // shouldRedactFromPurposes(consentExtension: ConsentExtension, resource: FhirResource) {}

    redactFromLabels(consentExtension: ConsentExtension) {
        if (consentExtension.contentDocument) {
            // Format-agnostic redaction using ProcessableDocument
            const processableDoc = consentExtension.contentDocument;
            const units = processableDoc.getLabelableUnits();
            
            // Get redaction labels from obligations
            const redactionLabels: CodingWithPolicies[] = [];
            consentExtension.obligations.forEach(o => {
                if (o.id.code === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code &&
                    o.id.system === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system) {
                    o.parameters.codes.forEach(code => {
                        const label = new CodingWithPolicies();
                        label.system = code.system;
                        label.code = code.code;
                        redactionLabels.push(label);
                    });
                }
            });

            // Filter units - keep only those that should not be redacted
            const unitsToKeep = units.filter(unit => 
                !processableDoc.shouldRedactUnit(unit.id, redactionLabels)
            );

            // Create a new document with only non-redacted units
            // Note: This is format-specific, so we need to handle it in the processor
            // For now, we'll mark units for redaction and let the processor handle removal
            // The actual removal will be handled by format-specific logic
            
            // Update the document (processors will handle the actual redaction)
            consentExtension.contentDocument = processableDoc;
            
            // For FHIR Bundle backward compatibility
            if (processableDoc.getDocumentType() === DocumentType.FHIR_BUNDLE && consentExtension.content) {
                // Filter FHIR Bundle entries
                if (consentExtension.content.entry) {
                    consentExtension.content.entry = consentExtension.content.entry.filter((e: any) => {
                        if (e.resource) {
                            const unitId = e.resource.id || `resource-${consentExtension.content!.entry!.indexOf(e)}`;
                            return !processableDoc.shouldRedactUnit(unitId, redactionLabels);
                        }
                        return true;
                    });
                }
            }
        } else if (consentExtension.content?.entry) {
            // Legacy: FHIR Bundle redaction
            consentExtension.content.entry = consentExtension.content.entry.filter((e: any) => {
                if (e.resource) {
                    return this.shouldRedactFromLabelsLegacy(consentExtension, e!.resource);
                }
                return true;
            });
        }
    }


    filterForApplicableConsents(consents: Consent[]): Consent[] {
        return consents.filter(c => { return c.status == 'active' })
            .filter(c => { return !c.period?.start || (c.period?.start && new Date(c.period.start).valueOf() <= Date.now()) })
            .filter(c => { return !c.period?.end || (c.period?.end && new Date(c.period.end).valueOf() >= Date.now()) })
    }

    consentDecision(consent: Consent): 'permit' | 'deny' | 'unspecified' {
        let decision: 'permit' | 'deny' | 'unspecified' = 'unspecified';
        switch (consent.decision) {
            case 'deny':
                decision = 'deny';
                break;
            case 'permit':
                decision = 'permit';
                break;
            default: // undefined
                break;
        }
        if (consent.provision) {
            let provisions_result: 'permit' | 'deny' | 'unspecified' = 'unspecified';
            switch (decision) {
                case 'permit':
                    provisions_result = this.consentDecisionProvisionsRecursive('deny', consent.provision);
                    break;
                case 'deny':
                    provisions_result = this.consentDecisionProvisionsRecursive('permit', consent.provision);
                    break;
                default:
                    // We can't process any provisions because the permit/deny logic is impossible to interpret.
                    break;
            }
            if (provisions_result == 'permit' || provisions_result == 'deny') {
                decision = provisions_result;
            } else {
                // No explicit decision could be made from any recursive provision tree.
            }
        }
        return decision;
    }

    consentDecisionProvisionsRecursive(mode: 'permit' | 'deny', provisions: ConsentProvision[]): 'permit' | 'deny' | 'unspecified' {
        let decision: 'permit' | 'deny' | 'unspecified' = 'unspecified';
        // TODO @preston Implement conditional logic here
        // ...
        // ...
        // ...

        // Check sub-provisions, recursively.
        if (provisions) {
            let sub_results: ('permit' | 'deny' | 'unspecified')[] = [];
            for (let i = 0; i < provisions.length; i++) {
                const sub = provisions[i];
                if (sub.provision) {
                    switch (mode) {
                        case 'permit':
                            sub_results.push(this.consentDecisionProvisionsRecursive('deny', sub.provision))
                            break;
                        case 'deny':
                            sub_results.push(this.consentDecisionProvisionsRecursive('permit', sub.provision));
                            break;
                        default:
                            break;
                    }
                }
            }
            let sub_permits = sub_results.filter(sr => { return sr == 'permit' });
            let sub_denies = sub_results.filter(sr => { return sr == 'deny' });
            // Any deny decision should trump all permit decisions.
            if (sub_denies.length > 0) {
                decision = 'deny';
            } else if (sub_permits.length > 0) {
                decision = 'permit';
            }
        }
        return decision;
    }


    /**
     * Compute consent decisions for resources (legacy FHIR version).
     * @deprecated Use computeConsentDecisionsForDocument with ProcessableDocument instead
     */
    computeConsentDecisionsForResources(labeledResources: FhirResource[], consent: Consent): { [key: string]: Card } {
        let consentDecisions: { [key: string]: Card } = {};
        let shouldShare = false;
        if (consent?.provision) {
            if (consent.decision === undefined) {
                // Making a root denial by default, if undefined, as a reasonable default is necessary.
                consent.decision = 'deny';
            }
            // Create temporary module instance per provision to track enabled categories/purposes
            const tmpModule = DataSegmentationModule.createFromRegistry(this.moduleRegistry);

            consent.provision.forEach((p) => {
                tmpModule.loadAllFromConsentProvision(p);
                labeledResources.forEach((r) => {
                    // Check if resource has labels (meta.security)
                    if (r.meta?.security && r.meta.security.length > 0) {
                        // Labeled resource: apply full purpose-based logic
                        let extension = new ConsentExtension(null);
                        let includeEnabled = consent?.decision == 'permit';
                        extension.obligations.push({
                            id: { system: AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system, code: AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code },
                            parameters: {
                                codes: tmpModule.allCategories()
                                    .filter(c => includeEnabled ? !c.enabled : c.enabled) // Only categories relevant to the consent
                                    .map(c => { return { system: c.system, code: c.act_code } }) // Make it a valid Coding
                            }
                        })
                        shouldShare = this.shouldRedactFromLabelsLegacy(extension, r) && this.shouldShareFromPurposes(r, p);
                    } else {
                        // Unlabeled resource: follow consent's base decision AND consider purpose of use
                        shouldShare = consent?.decision === 'permit' && this.shouldShareFromPurposes(r, p);
                    }
                    if (shouldShare) {
                        consentDecisions[r.id!] = new PermitCard();
                    } else {
                        consentDecisions[r.id!] = new DenyCard();
                    }
                });
            });

        } else {
            labeledResources.forEach((r) => {
                if (consent?.decision == 'deny') {
                    consentDecisions[r.id!] = new DenyCard();
                } else {
                    consentDecisions[r.id!] = new PermitCard();
                }
            });
        }
        return consentDecisions;
    }

    /**
     * Compute consent decisions for a processable document (format-agnostic).
     * @param processableDoc - The processable document
     * @param consent - The consent to evaluate
     * @returns Map of unit IDs to consent decision cards
     */
    computeConsentDecisionsForDocument(processableDoc: ProcessableDocument, consent: Consent): { [key: string]: Card } {
        let consentDecisions: { [key: string]: Card } = {};
        let shouldShare = false;
        const units = processableDoc.getLabelableUnits();

        if (consent?.provision) {
            if (consent.decision === undefined) {
                consent.decision = 'deny';
            }
            const tmpModule = DataSegmentationModule.createFromRegistry(this.moduleRegistry);

            consent.provision.forEach((p) => {
                tmpModule.loadAllFromConsentProvision(p);
                units.forEach((unit) => {
                    const unitLabels = processableDoc.getSecurityLabelsForUnit(unit.id);
                    
                    if (unitLabels.length > 0) {
                        // Labeled unit: apply full purpose-based logic
                        let extension = new ConsentExtension(null);
                        let includeEnabled = consent?.decision == 'permit';
                        extension.obligations.push({
                            id: { system: AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system, code: AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code },
                            parameters: {
                                codes: tmpModule.allCategories()
                                    .filter(c => includeEnabled ? !c.enabled : c.enabled)
                                    .map(c => { return { system: c.system, code: c.act_code } })
                            }
                        });
                        
                        const redactionLabels: CodingWithPolicies[] = [];
                        extension.obligations.forEach(o => {
                            if (o.id.code === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.code &&
                                o.id.system === AbstractDataSegmentationModuleProvider.REDACTION_OBLIGATION.system) {
                                o.parameters.codes.forEach(code => {
                                    const label = new CodingWithPolicies();
                                    label.system = code.system;
                                    label.code = code.code;
                                    redactionLabels.push(label);
                                });
                            }
                        });
                        
                        shouldShare = !processableDoc.shouldRedactUnit(unit.id, redactionLabels) && 
                                     this.shouldShareFromPurposesUnit(unit.id, processableDoc, p);
                    } else {
                        // Unlabeled unit: follow consent's base decision AND consider purpose of use
                        shouldShare = consent?.decision === 'permit' && this.shouldShareFromPurposesUnit(unit.id, processableDoc, p);
                    }
                    
                    if (shouldShare) {
                        consentDecisions[unit.id] = new PermitCard();
                    } else {
                        consentDecisions[unit.id] = new DenyCard();
                    }
                });
            });
        } else {
            units.forEach((unit) => {
                if (consent?.decision == 'deny') {
                    consentDecisions[unit.id] = new DenyCard();
                } else {
                    consentDecisions[unit.id] = new PermitCard();
                }
            });
        }
        return consentDecisions;
    }


    exportDecisionsForCsv(resources: FhirResource[], decisions: { [key: string]: Card }) {
        let data = this.exportCsvData(resources, decisions);
        // let csvContent = 'data:text/csv;charset=utf-8,';
        let csvContent = '';
        data.forEach((row) => {
            let rowContent = row.join(',');
            csvContent += rowContent + "\n";
        });
        return csvContent;
    }

    /**
     * Export CSV data for FHIR resources (legacy version).
     * @deprecated Use exportCsvDataForDocument with ProcessableDocument instead
     */
    exportCsvData(labeledResources: FhirResource[], decisions: { [key: string]: Card; }) {
        let data = [['Resource Type', 'Resource ID', 'Labels', 'Decision']];
        labeledResources.forEach((r) => {
            let labels: string[] = [];
            r.meta?.security?.forEach((s) => {
                if (s.code) {
                    const category = this.moduleRegistry.findCategoryByCode(s.code);
                    let label = category?.name || (s.code + ' (Unknown)');
                    labels.push(label);
                } else {
                    labels.push('(Unknown)');
                }
            });
            if (r.id && decisions[r.id]) {
                let decision = 'Undecided';
                switch (decisions[r.id].summary) {
                    case ConsentDecision.CONSENT_PERMIT:
                        decision = 'Permit';
                        break;
                    case ConsentDecision.CONSENT_DENY:
                        decision = 'Deny';
                    default:
                        break;
                }
                data.push([r.resourceType,
                r.id || 'unknown',
                labels.join('|'),
                    decision]);
            }
        });
        return data;
    }

    /**
     * Export CSV data for a processable document (format-agnostic).
     * @param processableDoc - The processable document
     * @param decisions - Map of unit IDs to consent decision cards
     * @returns Array of CSV rows
     */
    exportCsvDataForDocument(processableDoc: ProcessableDocument, decisions: { [key: string]: Card; }) {
        let data = [['Unit Type', 'Unit ID', 'Labels', 'Decision']];
        const units = processableDoc.getLabelableUnits();
        
        units.forEach((unit) => {
            let labels: string[] = [];
            const unitLabels = processableDoc.getSecurityLabelsForUnit(unit.id);
            unitLabels.forEach((label) => {
                if (label.code) {
                    const category = this.moduleRegistry.findCategoryByCode(label.code);
                    let labelName = category?.name || (label.code + ' (Unknown)');
                    labels.push(labelName);
                } else {
                    labels.push('(Unknown)');
                }
            });
            
            if (decisions[unit.id]) {
                let decision = 'Undecided';
                switch (decisions[unit.id].summary) {
                    case ConsentDecision.CONSENT_PERMIT:
                        decision = 'Permit';
                        break;
                    case ConsentDecision.CONSENT_DENY:
                        decision = 'Deny';
                    default:
                        break;
                }
                data.push([
                    unit.type,
                    unit.id,
                    labels.join('|'),
                    decision
                ]);
            }
        });
        return data;
    }
}