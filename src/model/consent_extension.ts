// Author: Preston Lee

import { Bundle, FhirResource } from "fhir/r5.js";
import { ConsentDecision } from "./consent_decision.js";
import { ProcessableDocument } from "../document_processor/types/processable_document.js";
import { DocumentType } from "../document_processor/types/document_type.js";

export class ConsentExtension {

    decision: ConsentDecision = ConsentDecision.NO_CONSENT;
    obligations: { id: { system: string, code: string }, parameters: { codes: Array<{ system: string, code: string }> } }[] = [];
    
    /**
     * FHIR Bundle content (for backward compatibility).
     * @deprecated Use contentDocument for format-agnostic processing
     */
    content: Bundle<FhirResource> | null = null;
    
    /**
     * Format-agnostic processable document content.
     */
    contentDocument?: ProcessableDocument;
    
    basedOn: string = '';

    constructor(requestContent: Bundle | ProcessableDocument | null) {
        if (requestContent) {
            if ('getDocumentType' in requestContent) {
                // It's a ProcessableDocument
                this.contentDocument = requestContent.clone();
                // For backward compatibility, try to extract FHIR Bundle if it's a FHIR document
                if (requestContent.getDocumentType() === DocumentType.FHIR_BUNDLE) {
                    const fhirDoc = requestContent as any;
                    if (fhirDoc.getBundle) {
                        this.content = fhirDoc.getBundle();
                    }
                }
            } else {
                // Legacy: FHIR Bundle
                this.content = structuredClone(requestContent as Bundle);
            }
        }
    }
}