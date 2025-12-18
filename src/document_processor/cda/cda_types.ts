// Author: Preston Lee

/**
 * Represents a parsed CDA document structure (as object from fast-xml-parser).
 */
export interface CdaDocumentStructure {
    ClinicalDocument?: {
        '@_xmlns'?: string;
        '@_xmlns:xsi'?: string;
        '@_xmlns:sdtc'?: string;
        confidentialityCode?: CdaConfidentialityCode | CdaConfidentialityCode[];
        component?: {
            structuredBody?: {
                component?: Array<{
                    section?: CdaSection;
                }>;
            };
        };
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/**
 * CDA confidentiality code structure.
 */
export interface CdaConfidentialityCode {
    '@_code'?: string;
    '@_codeSystem'?: string;
    '@_displayName'?: string;
    '@_codeSystemName'?: string;
    [key: string]: unknown;
}

/**
 * CDA section structure.
 */
export interface CdaSection {
    '@_classCode'?: string;
    '@_moodCode'?: string;
    code?: CdaCode;
    confidentialityCode?: CdaConfidentialityCode | CdaConfidentialityCode[];
    entry?: Array<{
        observation?: CdaEntry;
        act?: CdaEntry;
        procedure?: CdaEntry;
        [key: string]: unknown;
    }>;
    component?: Array<{
        section?: CdaSection;
    }>;
    [key: string]: unknown;
}

/**
 * CDA code structure.
 */
export interface CdaCode {
    '@_code'?: string;
    '@_codeSystem'?: string;
    '@_displayName'?: string;
    '@_codeSystemName'?: string;
    [key: string]: unknown;
}

/**
 * CDA entry structure.
 */
export interface CdaEntry {
    code?: CdaCode;
    confidentialityCode?: CdaConfidentialityCode | CdaConfidentialityCode[];
    [key: string]: unknown;
}

