// Author: Preston Lee

import { XMLParser } from "fast-xml-parser";
import { LabelableUnit } from "../types/labelable_unit.js";
import { CodingWithPolicies } from "../../model/coding_with_policies.js";
import { CdaSection, CdaEntry, CdaDocumentStructure } from "./cda_types.js";

/**
 * Labelable unit representing a CDA document element (document, section, or entry).
 */
export class CdaUnit implements LabelableUnit {
    constructor(
        public id: string,
        public type: string,
        private element: CdaSection | CdaEntry | CdaDocumentStructure,
        private parser: XMLParser
    ) {}

    extractCodings(): CodingWithPolicies[] {
        const codings: CodingWithPolicies[] = [];
        this.extractCodingsFromElement(this.element, codings);
        return codings;
    }

    private extractCodingsFromElement(element: any, codings: CodingWithPolicies[]): void {
        if (!element || typeof element !== 'object') return;

        // Check if this element has a code
        if (element.code) {
            const code = element.code;
            if (code['@_code'] && code['@_codeSystem']) {
                const coding = new CodingWithPolicies();
                coding.system = code['@_codeSystem'] || '';
                coding.code = code['@_code'] || '';
                coding.display = code['@_displayName'] || code['@_codeSystemName'] || '';
                codings.push(coding);
            }
        }

        // Recursively search nested elements
        for (const key in element) {
            if (key !== 'code' && key !== 'confidentialityCode' && Array.isArray(element[key])) {
                element[key].forEach((item: any) => this.extractCodingsFromElement(item, codings));
            } else if (key !== 'code' && key !== 'confidentialityCode' && typeof element[key] === 'object') {
                this.extractCodingsFromElement(element[key], codings);
            }
        }
    }
}

