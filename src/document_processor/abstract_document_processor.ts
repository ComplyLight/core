// Author: Preston Lee

import { ProcessableDocument } from "./types/processable_document.js";
import { DocumentType } from "./types/document_type.js";

/**
 * Abstract base class for processing different document formats.
 * Implementations handle format-specific parsing, coding extraction, and label application.
 */
export abstract class AbstractDocumentProcessor {
    /**
     * Check if this processor can handle the given document.
     * @param document - Raw document (could be JSON object, XML string, etc.)
     * @returns True if this processor can process the document, false otherwise
     */
    abstract canProcess(document: unknown): boolean;

    /**
     * Process a raw document and convert it to a ProcessableDocument.
     * @param rawDocument - Raw document to process
     * @returns ProcessableDocument instance, or null if processing fails
     */
    abstract process(rawDocument: unknown): ProcessableDocument | null;

    /**
     * Get the document type this processor handles.
     * @returns Document type enum value
     */
    abstract getDocumentType(): DocumentType;
}
