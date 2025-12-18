// Author: Preston Lee

import { Bundle, FhirResource } from "fhir/r5.js";
import { JSONPath } from "jsonpath-plus";
import { ProcessableDocument } from "../types/processable_document.js";
import { DocumentType } from "../types/document_type.js";
import { LabelableUnit } from "../types/labelable_unit.js";
import { CodingWithPolicies } from "../../model/coding_with_policies.js";
import { Policy } from "../../model/policy.js";
import { FhirResourceUnit } from "./fhir_resource_unit.js";

/**
 * ProcessableDocument implementation for FHIR Bundles.
 */
export class FhirBundleDocument implements ProcessableDocument {
    constructor(private bundle: Bundle<FhirResource>) {}

    extractCodings(): CodingWithPolicies[] {
        const allCodings: CodingWithPolicies[] = [];
        if (this.bundle.entry) {
            this.bundle.entry.forEach((e: any) => {
                if (e.resource) {
                    const codings = JSONPath({ path: "$..coding", json: e.resource }).flat();
                    codings.forEach((c: any) => {
                        const coding = new CodingWithPolicies();
                        coding.system = c.system || '';
                        coding.code = c.code || '';
                        coding.display = c.display || '';
                        allCodings.push(coding);
                    });
                }
            });
        }
        return allCodings;
    }

    getLabelableUnits(): LabelableUnit[] {
        const units: LabelableUnit[] = [];
        if (this.bundle.entry) {
            this.bundle.entry.forEach((e: any, index: number) => {
                if (e.resource) {
                    // Use resource ID if available, otherwise use index
                    const unitId = e.resource.id || `resource-${index}`;
                    const unitType = e.resource.resourceType || 'Resource';
                    units.push(new FhirResourceUnit(unitId, unitType, e.resource));
                }
            });
        }
        return units;
    }

    applySecurityLabelsToUnit(unitId: string, labels: CodingWithPolicies[]): void {
        if (!this.bundle.entry) return;

        // Find the resource with matching ID
        // Handle both explicit IDs and generated IDs (resource-{index})
        for (let i = 0; i < this.bundle.entry.length; i++) {
            const e = this.bundle.entry[i];
            if (e.resource) {
                const resourceId = e.resource.id || `resource-${i}`;
                if (resourceId === unitId) {
                // Initialize meta if needed
                if (!e.resource.meta) {
                    e.resource.meta = {};
                }
                if (!e.resource.meta.security) {
                    e.resource.meta.security = [];
                }

                // Apply each label
                labels.forEach(label => {
                    // Check if label already exists
                    const existingLabel = e.resource!.meta!.security!.find(
                        (s: any) => s.system === label.system && s.code === label.code
                    ) as any; // Cast to any to allow policies property

                    if (!existingLabel) {
                        // New label: add it with policies
                        const labelToAdd: any = {
                            system: label.system,
                            code: label.code,
                            display: label.display
                        };
                        if (label.policies && label.policies.length > 0) {
                            labelToAdd.policies = label.policies.map(p => p.clone());
                        }
                        e.resource!.meta!.security!.push(labelToAdd);
                    } else {
                        // Existing label: merge policies
                        if (label.policies && label.policies.length > 0) {
                            if (!existingLabel.policies) {
                                existingLabel.policies = [];
                            }
                            // Add policies that aren't already present (deduplicate by ID)
                            label.policies.forEach(policy => {
                                if (!existingLabel.policies!.some((existing: any) => existing.id === policy.id)) {
                                    existingLabel.policies!.push(policy.clone());
                                }
                            });
                        }
                    }
                });
                break;
                }
            }
        }
    }

    getSecurityLabelsForUnit(unitId: string): CodingWithPolicies[] {
        if (!this.bundle.entry) return [];

        // Handle both explicit IDs and generated IDs (resource-{index})
        for (let i = 0; i < this.bundle.entry.length; i++) {
            const e = this.bundle.entry[i];
            if (e.resource) {
                const resourceId = e.resource.id || `resource-${i}`;
                if (resourceId === unitId) {
                if (e.resource.meta?.security) {
                    return e.resource.meta.security.map((s: any) => {
                        const coding = new CodingWithPolicies();
                        coding.system = s.system || '';
                        coding.code = s.code || '';
                        coding.display = s.display || '';
                        if (s.policies) {
                            coding.policies = s.policies.map((p: any) => {
                                const policy = new Policy();
                                policy.id = p.id || '';
                                policy.name = p.name || '';
                                policy.control_authority = p.control_authority || '';
                                policy.control_id = p.control_id || '';
                                return policy;
                            });
                        }
                        return coding;
                    });
                }
                }
            }
        }
        return [];
    }

    shouldRedactUnit(unitId: string, redactionLabels: CodingWithPolicies[]): boolean {
        if (redactionLabels.length === 0) {
            return false;
        }
        const unitLabels = this.getSecurityLabelsForUnit(unitId);
        
        // Check if any unit label matches any redaction label
        return unitLabels.some(unitLabel =>
            redactionLabels.some(redactionLabel =>
                unitLabel.system === redactionLabel.system &&
                unitLabel.code === redactionLabel.code
            )
        );
    }

    clone(): ProcessableDocument {
        return new FhirBundleDocument(structuredClone(this.bundle));
    }

    getDocumentType(): DocumentType {
        return DocumentType.FHIR_BUNDLE;
    }

    /**
     * Get the underlying FHIR Bundle (for backward compatibility).
     * @returns The FHIR Bundle
     */
    getBundle(): Bundle<FhirResource> {
        return this.bundle;
    }
}

