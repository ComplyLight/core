// Author: Preston Lee

import { Ajv } from 'ajv';
import { Coding } from 'fhir/r5.js';
import { Binding } from '../model/binding.js';

export abstract class AbstractSensitivityRuleProvider {

    static REDACTION_OBLIGATION = {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "REDACT"
    }

    rules: Binding[] = []; // = this.initializeRules();

    AJV = new Ajv();
    validator = this.rulesSchema() ? this.AJV.compile(this.rulesSchema()) : null;

    constructor() {
        // this.reinitialize();
    }


    abstract rulesSchema(): any;

    abstract loadBindings(): Binding[];


    reinitialize() {
        const bindingsArray = this.loadBindings();
        this.rules = bindingsArray.map((n: any) => { return Object.assign(new Binding, n) });
        console.info('Loaded rules:');
        this.rules.forEach(r => {
            const categoryPurpose = r.category && r.purpose ? ` [Category: ${r.category}, Purpose: ${r.purpose}]` : '';
            console.info(`\t${r.id} : (${r.allCodeObjects().length} total codes, Basis: ${r.basis.display}, Labels: ${r.labels.map(l => { return l.code + ' - ' + l.display }).join(', ')})${categoryPurpose}`);
        });
    }


    validateRuleFile(data: string) {
        const ajv = new Ajv();
        if (!this.validator) {
            console.info('No validator found. All validations will pass without errors.');
            return null;
        }
        else if (this.validator(data)) {
            return null;
        } else {
            return this.validator.errors;
        }
    }


    applicableRulesFor(codings: Coding[], allRules: Binding[], threshold: number): Binding[] {
        let rules = allRules.filter(rule => {
            return rule.allCodeObjects().some(coding => {
                let found = false;
                for (let i = 0; i < codings.length; i++) {
                    if (coding.system == codings[i].system && coding.code == codings[i].code) {
                        if (coding.confidence >= threshold) {
                            found = true;
                            break;
                        }
                    }
                }
                return found;
            })
        })
        return rules;
    }

    applicableRulesForAll(codings: Coding[], threshold: number): Binding[] {
        return this.applicableRulesFor(codings, this.rules, threshold);
    }

}