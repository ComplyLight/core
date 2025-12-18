// Author: Preston Lee

import { Bundle, FhirResource } from "fhir/r5.js";
import { AbstractDocumentProcessor } from "../abstract_document_processor.js";
import { ProcessableDocument } from "../types/processable_document.js";
import { DocumentType } from "../types/document_type.js";
import { FhirBundleDocument } from "./fhir_bundle_document.js";

/**
 * Document processor for FHIR Bundles.
 */
export class FhirBundleProcessor extends AbstractDocumentProcessor {
    canProcess(document: unknown): boolean {
        return (
            typeof document === 'object' &&
            document !== null &&
            'resourceType' in document &&
            document.resourceType === 'Bundle' &&
            'entry' in document
        );
    }

    process(rawDocument: unknown): ProcessableDocument | null {
        if (!this.canProcess(rawDocument)) {
            return null;
        }
        return new FhirBundleDocument(rawDocument as Bundle<FhirResource>);
    }

    getDocumentType(): DocumentType {
        return DocumentType.FHIR_BUNDLE;
    }
}

