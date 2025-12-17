// Author: Preston Lee

import { Binding } from "../model/binding.js";
import { AbstractSensitivityRuleProvider } from "./abstract_sensitivity_rule_provider.js";


export class DummyRuleProvider extends AbstractSensitivityRuleProvider {

    rulesSchema() {
        return null;
    }
    loadBindings(): Binding[] {
        return [];
    }


}