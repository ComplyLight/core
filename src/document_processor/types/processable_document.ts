// Author: Preston Lee

import { CodingWithPolicies } from "../../model/coding_with_policies.js";
import { LabelableUnit } from "./labelable_unit.js";
import { DocumentType } from "./document_type.js";

/**
 * Represents a normalized document that can be processed by the engine.
 * Abstracts away format-specific details (FHIR vs CDA).
 */
export interface ProcessableDocument {
    /**
     * Extract all coding elements from the entire document.
     * @returns Array of all coding elements found in the document
     */
    extractCodings(): CodingWithPolicies[];

    /**
     * Get all units within the document that can have security labels applied.
     * @returns Array of labelable units (resources, sections, entries, etc.)
     */
    getLabelableUnits(): LabelableUnit[];

    /**
     * Apply security labels to a specific unit within the document.
     * @param unitId - Unique identifier of the unit to label
     * @param labels - Security labels to apply
     */
    applySecurityLabelsToUnit(unitId: string, labels: CodingWithPolicies[]): void;

    /**
     * Get existing security labels for a specific unit.
     * @param unitId - Unique identifier of the unit
     * @returns Array of security labels currently applied to the unit
     */
    getSecurityLabelsForUnit(unitId: string): CodingWithPolicies[];

    /**
     * Check if a unit should be redacted based on redaction labels.
     * @param unitId - Unique identifier of the unit to check
     * @param redactionLabels - Labels that indicate redaction is required
     * @returns True if the unit should be redacted, false otherwise
     */
    shouldRedactUnit(unitId: string, redactionLabels: CodingWithPolicies[]): boolean;

    /**
     * Create a deep clone of this document for modification.
     * @returns A new ProcessableDocument instance with cloned content
     */
    clone(): ProcessableDocument;

    /**
     * Get the document type identifier.
     * @returns Document type enum value
     */
    getDocumentType(): DocumentType;
}

