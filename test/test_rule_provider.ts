// Author: Preston Lee

import { AbstractSensitivityRuleProvider } from '../src/rules/abstract_sensitivity_rule_provider.js';
import { Binding } from '../src/model/binding.js';
import { DataSegmentationModuleRegistry } from '../src/core/data_segmentation_module_registry.js';

/**
 * Test rule provider that loads rules from registered modules.
 */
export class TestRuleProvider extends AbstractSensitivityRuleProvider {
    
    private moduleRegistry: DataSegmentationModuleRegistry;

    constructor(moduleRegistry: DataSegmentationModuleRegistry) {
        super();
        this.moduleRegistry = moduleRegistry;
        this.reinitialize();
    }

    rulesSchema(): any {
        return null; // No schema validation for tests
    }

    loadBindings(): Binding[] {
        const allBindings: Binding[] = [];

        // Collect all bindings from enabled modules
        const enabledModules = this.moduleRegistry.getEnabledModules();
        enabledModules.forEach(module => {
            if (module.rules && module.rules.bindings) {
                module.rules.bindings.forEach(binding => {
                    allBindings.push(binding);
                });
            }
        });

        return allBindings;
    }

    /**
     * Reinitialize rules from modules (call after module changes).
     */
    refreshRules(): void {
        this.reinitialize();
    }
}

