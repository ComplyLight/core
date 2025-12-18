// Author: Preston Lee

import { Coding } from 'fhir/r5.js';
import { Binding } from '../model/binding.js';
import { DataSegmentationModuleRegistry } from '../core/data_segmentation_module_registry.js';

/**
 * Abstract provider for extracting and managing bindings from data segmentation modules.
 * Provides bindings from enabled modules in the registry and matches them against resource codings.
 */
export abstract class AbstractDataSegmentationModuleProvider {

    static REDACTION_OBLIGATION = {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "REDACT"
    }

    protected moduleRegistry: DataSegmentationModuleRegistry;
    bindings: Binding[] = [];

    constructor(moduleRegistry: DataSegmentationModuleRegistry) {
        this.moduleRegistry = moduleRegistry;
    }

    /**
     * Reinitialize bindings from enabled modules in the registry.
     */
    reinitialize(): void {
        const allBindings: Binding[] = [];
        const enabledModules = this.moduleRegistry.getEnabledModules();
        
        enabledModules.forEach(module => {
            if (module.rules && module.rules.bindings) {
                module.rules.bindings.forEach(binding => {
                    allBindings.push(binding);
                });
            }
        });

        this.bindings = allBindings.map((n: any) => { return Object.assign(new Binding, n) });
        console.info('Loaded bindings from modules:');
        this.bindings.forEach(b => {
            const categoryPurpose = b.category && b.purpose ? ` [Category: ${b.category}, Purpose: ${b.purpose}]` : '';
            console.info(`\t${b.id} : (${b.allCodeObjects().length} total codes, Basis: ${b.basis.display}, Labels: ${b.labels.map(l => { return l.code + ' - ' + l.display }).join(', ')})${categoryPurpose}`);
        });
    }

    /**
     * Find applicable bindings for given codings based on threshold.
     * @param codings - Array of codings found in the resource
     * @param allBindings - All bindings to search through
     * @param threshold - Minimum confidence threshold
     * @returns Array of applicable bindings
     */
    applicableBindingsFor(codings: Coding[], allBindings: Binding[], threshold: number): Binding[] {
        return allBindings.filter(binding => {
            return binding.allCodeObjects().some(coding => {
                for (let i = 0; i < codings.length; i++) {
                    if (coding.system == codings[i].system && coding.code == codings[i].code) {
                        if (coding.confidence >= threshold) {
                            return true;
                        }
                    }
                }
                return false;
            });
        });
    }

    /**
     * Find applicable bindings from all loaded bindings.
     * @param codings - Array of codings found in the resource
     * @param threshold - Minimum confidence threshold
     * @returns Array of applicable bindings
     */
    applicableBindingsForAll(codings: Coding[], threshold: number): Binding[] {
        return this.applicableBindingsFor(codings, this.bindings, threshold);
    }

}

