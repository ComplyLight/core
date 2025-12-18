// Author: Preston Lee

import { FhirResource } from "fhir/r5.js";
import { JSONPath } from "jsonpath-plus";
import { LabelableUnit } from "../types/labelable_unit.js";
import { CodingWithPolicies } from "../../model/coding_with_policies.js";

/**
 * Labelable unit representing a FHIR resource within a Bundle.
 */
export class FhirResourceUnit implements LabelableUnit {
    constructor(
        public id: string,
        public type: string,
        private resource: FhirResource
    ) {}

    extractCodings(): CodingWithPolicies[] {
        // Find all Coding elements anywhere within the resource tree
        const codings = JSONPath({ path: "$..coding", json: this.resource }).flat();
        return codings.map((c: any) => {
            const coding = new CodingWithPolicies();
            coding.system = c.system || '';
            coding.code = c.code || '';
            coding.display = c.display || '';
            return coding;
        });
    }
}

