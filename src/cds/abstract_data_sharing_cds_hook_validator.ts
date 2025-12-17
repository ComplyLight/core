// Author: Preston Lee

import { Ajv } from 'ajv';

export abstract class AbstractDataSharingCDSHookValidator {

    static AJV = new Ajv();
    
    requestValidator = AbstractDataSharingCDSHookValidator.AJV.compile(this.requestSchema());
    responseValidator = AbstractDataSharingCDSHookValidator.AJV.compile(this.responseSchema());

    constructor() {
    }

    // FIXME Race condition here! Needs a mutex or similar.
    validateRequest(data: string) {
        if (this.requestValidator(data)) {
            return null;
        } else {
            return this.requestValidator.errors;
        }
    }

    validateResponse(data: string) {
        if (this.responseValidator(data)) {
            return null;
        } else {
            return this.responseValidator.errors;
        }
    }

    abstract requestSchema(): any;
    abstract responseSchema(): any;

}