// Author: Preston Lee

import * as uuid from 'uuid';
import { CodeSet } from './code_set.js';
import { Coding } from './coding.js';

export class Binding {

    id: string = '';
    basis: Coding = new Coding();
    labels: Coding[] = [];
    codeSets: CodeSet[] = [];
    category?: string; // Reference to category code (required in bindings)
    purpose?: string; // Reference to purpose code (required in bindings)

    static fromTemplate() {
        const r = new Binding();
        r.id = 'binding-' + uuid.v4().substring(0, 6);
        r.basis = Binding.basisFromTemplate();
        r.labels.push(Binding.labelFromTemplate());
        r.codeSets.push(Binding.codeSetFromTemplate());
        return r;
    }

    static basisFromTemplate(): Coding {
        const b = new Coding();
        b.system = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
        b.code = '42CFRPart2';
        b.display = '42 CFR Part2';
        return b;
    }

    static labelFromTemplate(): Coding {
        const c = new Coding();
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

