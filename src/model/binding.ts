// Author: Preston Lee

import * as uuid from 'uuid';
import { CodeSet } from './code_set.js';
import { CodingWithPolicies } from './coding_with_policies.js';
import { Policy } from './policy.js';

export class Binding {

    id: string = '';
    basis: CodingWithPolicies = new CodingWithPolicies();
    labels: CodingWithPolicies[] = [];
    codeSets: CodeSet[] = [];
    category?: string; // Reference to category code (required in bindings)
    purpose?: string; // Reference to purpose code (required in bindings)
    policies: Policy[] = []; // Required array of policy objects

    static fromTemplate() {
        const r = new Binding();
        r.id = 'binding-' + uuid.v4().substring(0, 6);
        r.basis = Binding.basisFromTemplate();
        r.labels.push(Binding.labelFromTemplate());
        r.codeSets.push(Binding.codeSetFromTemplate());
        r.policies = []; // Initialize empty policies array
        return r;
    }

    static basisFromTemplate(): CodingWithPolicies {
        const b = new CodingWithPolicies();
        b.system = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
        b.code = '42CFRPart2';
        b.display = '42 CFR Part2';
        return b;
    }

    static labelFromTemplate(): CodingWithPolicies {
        const c = new CodingWithPolicies();
        c.system = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
        c.code = 'X';
        c.display = 'Description of X';
        return c;
    }

    static codeSetFromTemplate(): CodeSet {
        const cs = new CodeSet();
        cs.groupID = 'Group-' + uuid.v4()
        return cs;
    }


    allCodeObjects() {
        return this.codeSets.map(cs => { return cs.codes }).flat();
    }

}

