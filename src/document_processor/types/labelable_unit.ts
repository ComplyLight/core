// Author: Preston Lee

import { CodingWithPolicies } from "../../model/coding_with_policies.js";

/**
 * Represents a unit within a document that can have security labels applied.
 * Examples: FHIR Resource, CDA Section, CDA Entry
 */
export interface LabelableUnit {
    /** Unique identifier for this unit within the document */
    id: string;
    /** Type of unit (e.g., "Resource", "Section", "Entry") */
    type: string;
    /** Extract all coding elements from this unit */
    extractCodings(): CodingWithPolicies[];
}

