// Author: Preston Lee

import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { ProcessableDocument } from "../types/processable_document.js";
import { DocumentType } from "../types/document_type.js";
import { LabelableUnit } from "../types/labelable_unit.js";
import { CodingWithPolicies } from "../../model/coding_with_policies.js";
import { CdaDocumentStructure, CdaSection, CdaEntry, CdaConfidentialityCode } from "./cda_types.js";
import { CdaUnit } from "./cda_unit.js";

/**
 * ProcessableDocument implementation for CDA documents.
 */
export class CdaDocument implements ProcessableDocument {
    private parser: XMLParser;
    private builder: XMLBuilder;
    private documentStructure: CdaDocumentStructure;
    private unitCounter: number = 0;

    constructor(xmlStringOrObject: string | CdaDocumentStructure) {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: false,
            trimValues: true
        });
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            format: true
        });

        if (typeof xmlStringOrObject === 'string') {
            this.documentStructure = this.parser.parse(xmlStringOrObject) as CdaDocumentStructure;
        } else {
            this.documentStructure = xmlStringOrObject;
        }
    }

    extractCodings(): CodingWithPolicies[] {
        const codings: CodingWithPolicies[] = [];
        this.extractCodingsFromElement(this.documentStructure, codings);
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

    getLabelableUnits(): LabelableUnit[] {
        const units: LabelableUnit[] = [];
        this.unitCounter = 0;

        const clinicalDoc = this.documentStructure.ClinicalDocument;
        if (!clinicalDoc) return units;

        // Document-level unit
        units.push(new CdaUnit('document', 'ClinicalDocument', this.documentStructure, this.parser));

        // Section-level and entry-level units
        if (clinicalDoc.component?.structuredBody?.component) {
            this.extractUnitsFromSections(clinicalDoc.component.structuredBody.component, units);
        }

        return units;
    }

    private extractUnitsFromSections(components: Array<{ section?: CdaSection }>, units: LabelableUnit[]): void {
        components.forEach((comp) => {
            if (comp.section) {
                const sectionId = `section-${this.unitCounter++}`;
                units.push(new CdaUnit(sectionId, 'Section', comp.section, this.parser));

                // Extract entries within this section
                if (comp.section.entry) {
                    comp.section.entry.forEach((entry) => {
                        const entryId = `entry-${this.unitCounter++}`;
                        // Find the actual entry object (observation, act, procedure, etc.)
                        const entryObject = entry.observation || entry.act || entry.procedure || entry;
                        units.push(new CdaUnit(entryId, 'Entry', entryObject, this.parser));
                    });
                }

                // Recursively process nested sections
                if (comp.section.component) {
                    this.extractUnitsFromSections(comp.section.component, units);
                }
            }
        });
    }

    applySecurityLabelsToUnit(unitId: string, labels: CodingWithPolicies[]): void {
        const element = this.findElementById(unitId);
        if (!element) return;

        // Convert labels to CDA confidentialityCode format
        const confidentialityCodes: CdaConfidentialityCode[] = labels.map(label => ({
            '@_code': label.code,
            '@_codeSystem': label.system,
            '@_displayName': label.display
        }));

        // Apply confidentiality codes (support DS4P for multiple labels)
        // For CDA, we can have multiple confidentialityCode elements
        if (!element.confidentialityCode) {
            element.confidentialityCode = confidentialityCodes.length === 1 ? confidentialityCodes[0] : confidentialityCodes;
        } else {
            // Merge with existing codes (avoid duplicates)
            const existing = Array.isArray(element.confidentialityCode)
                ? element.confidentialityCode
                : [element.confidentialityCode];

            confidentialityCodes.forEach(newCode => {
                const exists = existing.some((existingCode: CdaConfidentialityCode) =>
                    existingCode['@_code'] === newCode['@_code'] &&
                    existingCode['@_codeSystem'] === newCode['@_codeSystem']
                );
                if (!exists) {
                    existing.push(newCode);
                }
            });

            element.confidentialityCode = existing.length === 1 ? existing[0] : existing;
        }
    }

    getSecurityLabelsForUnit(unitId: string): CodingWithPolicies[] {
        const element = this.findElementById(unitId);
        if (!element) return [];

        const labels: CodingWithPolicies[] = [];
        const confidentialityCodes = element.confidentialityCode
            ? (Array.isArray(element.confidentialityCode)
                ? element.confidentialityCode
                : [element.confidentialityCode])
            : [];

        confidentialityCodes.forEach((code: CdaConfidentialityCode) => {
            if (code['@_code'] && code['@_codeSystem']) {
                const label = new CodingWithPolicies();
                label.system = code['@_codeSystem'] || '';
                label.code = code['@_code'] || '';
                label.display = code['@_displayName'] || '';
                labels.push(label);
            }
        });

        return labels;
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
        // Deep clone the document structure
        const cloned = structuredClone(this.documentStructure);
        return new CdaDocument(cloned);
    }

    getDocumentType(): DocumentType {
        return DocumentType.CDA_DOCUMENT;
    }

    /**
     * Find an element by unit ID.
     */
    private findElementById(unitId: string): CdaSection | CdaEntry | CdaDocumentStructure | null {
        if (unitId === 'document') {
            return this.documentStructure;
        }

        const clinicalDoc = this.documentStructure.ClinicalDocument;
        if (!clinicalDoc) return null;

        // Parse unit ID to find the element
        if (unitId.startsWith('section-')) {
            const index = parseInt(unitId.split('-')[1]);
            return this.findSectionByIndex(clinicalDoc, index);
        } else if (unitId.startsWith('entry-')) {
            const index = parseInt(unitId.split('-')[1]);
            return this.findEntryByIndex(clinicalDoc, index);
        }

        return null;
    }

    private findSectionByIndex(doc: any, targetIndex: number): CdaSection | null {
        let currentIndex = 0;
        const findInComponents = (components: Array<{ section?: CdaSection }>): CdaSection | null => {
            for (const comp of components) {
                if (comp.section) {
                    if (currentIndex === targetIndex) {
                        return comp.section;
                    }
                    currentIndex++;
                    if (comp.section.component) {
                        const found = findInComponents(comp.section.component);
                        if (found) return found;
                    }
                }
            }
            return null;
        };

        if (doc.component?.structuredBody?.component) {
            return findInComponents(doc.component.structuredBody.component);
        }
        return null;
    }

    private findEntryByIndex(doc: any, targetIndex: number): CdaEntry | null {
        let currentIndex = 0;
        const findInSections = (components: Array<{ section?: CdaSection }>): CdaEntry | null => {
            for (const comp of components) {
                if (comp.section?.entry) {
                    for (const entry of comp.section.entry) {
                        if (currentIndex === targetIndex) {
                            return entry.observation || entry.act || entry.procedure || entry;
                        }
                        currentIndex++;
                    }
                }
                if (comp.section?.component) {
                    const found = findInSections(comp.section.component);
                    if (found) return found;
                }
            }
            return null;
        };

        if (doc.component?.structuredBody?.component) {
            return findInSections(doc.component.structuredBody.component);
        }
        return null;
    }

    /**
     * Get the CDA document as XML string (for serialization).
     */
    toXmlString(): string {
        return this.builder.build(this.documentStructure);
    }

    /**
     * Get the CDA document structure (for inspection).
     */
    getDocumentStructure(): CdaDocumentStructure {
        return this.documentStructure;
    }
}

