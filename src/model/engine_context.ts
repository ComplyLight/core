// Author: Preston Lee

import { Bundle, Consent } from "fhir/r5.js";
import { SystemValue, SystemCode } from "../cds/data_sharing_cds_hook_request.js";
import { ProcessableDocument } from "../document_processor/types/processable_document.js";

export class DataSharingEngineContext {

    public static HEADER_CDS_REDACTION_ENABLED = 'CDS-Redaction-Enabled';
    public static HEADER_CDS_CREATE_AUDIT_EVENT_ENABLED = 'CDS-Create-Audit-Event';
    public static HEADER_CDS_CONFIDENCE_THRESHOLD = 'CDS-Confidence-Threshold';
    public static HEADER_CDS_RULES_FILE = 'CDS-Rules-File';

    /** Identifiers of the actor */
    actor: SystemValue[] = [];

    purposeOfUse?: string[] | string = [];

    /**
     * Categories of applicable consents to the workflow context
     */
    category?: SystemCode[] = [];
    /**
     * Identity of the patient whose consent is being considered
     */
    patientId: SystemValue[] = [];

    /**
     * Content classes being requested
     */
    class?: SystemCode[] = [];

    /**
     * FHIR data to be evaluated.
     * @deprecated Use contentDocument for format-agnostic processing
     */
    content?: Bundle;

    /**
     * Format-agnostic processable document content.
     * The engine will use this if present, otherwise fall back to content (FHIR Bundle).
     */
    contentDocument?: ProcessableDocument;

    /**
     * Raw document content before processing (for format detection).
     */
    contentRaw?: unknown;

    /**
     * Optional Consent directives to use in leui of any that may be retrieved by, or known to, the engine.
     */
    consent?: Consent[] = [];

}
