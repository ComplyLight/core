// Author: Preston Lee

import { AbstractDocumentProcessor } from "../abstract_document_processor.js";
import { ProcessableDocument } from "../types/processable_document.js";
import { DocumentType } from "../types/document_type.js";
import { CdaDocument } from "./cda_document.js";
import { CdaDocumentStructure } from "./cda_types.js";

/**
 * Document processor for CDA documents.
 */
export class CdaDocumentProcessor extends AbstractDocumentProcessor {
    canProcess(document: unknown): boolean {
        if (typeof document === 'string') {
            // Check if it's XML with ClinicalDocument root
            return document.includes('<ClinicalDocument') || document.includes('ClinicalDocument');
        }

        if (typeof document === 'object' && document !== null) {
            // Check if it has ClinicalDocument structure
            const obj = document as any;
            return obj.ClinicalDocument !== undefined || 
                   (obj['@_xmlns'] && obj['@_xmlns'].includes('urn:hl7-org:v3'));
        }

        return false;
    }

    process(rawDocument: unknown): ProcessableDocument | null {
        if (!this.canProcess(rawDocument)) {
            return null;
        }
        return new CdaDocument(rawDocument as string | CdaDocumentStructure);
    }

    getDocumentType(): DocumentType {
        return DocumentType.CDA_DOCUMENT;
    }
}

