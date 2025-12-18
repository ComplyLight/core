// Author: Preston Lee

import { Policy } from './policy.js';

export class CodingWithPolicies {

    public system: string = '';
    public code: string = '';
    public display: string = '';
    public policies?: Policy[]; // Optional array of policy objects that caused this label to be applied

}

