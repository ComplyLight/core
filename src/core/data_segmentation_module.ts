// Author: Preston Lee

import { Coding, ConsentProvision } from "fhir/r5.js";
import { InformationCategorySetting } from "./information_category_setting.js";
import { DataSegmentationModuleRegistry } from "./data_segmentation_module_registry.js";
import { Rules } from "../model/rules.js";
import { Binding } from "../model/binding.js";
import { CodeSet } from "../model/code_set.js";
import { CodeSetCoding } from "../model/code_set_coding.js";
import { Coding as ModelCoding } from "../model/coding.js";
import { readFile } from "fs/promises";

export class DataSegmentationModule {

    public id: string;
    public name: string;
    public version?: string;
    public description?: string;
    public enabled: boolean = true;
    public categories: InformationCategorySetting[] = [];
    public purposes: InformationCategorySetting[] = [];
    public rules?: Rules;

    constructor(id: string, name: string, version?: string, description?: string) {
        this.id = id;
        this.name = name;
        this.version = version;
        this.description = description;
    }

    /**
     * Enable the module.
     */
    enable(): void {
        this.enabled = true;
    }

    /**
     * Disable the module (module remains registered but is skipped during processing).
     */
    disable(): void {
        this.enabled = false;
    }

    /**
     * Check if module is enabled.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Find a category by its code.
     * @param code - The category code to search for
     * @returns The category if found, null otherwise
     */
    categoryForCode(code: string): InformationCategorySetting | null {
        const found = this.categories.find(c => c.act_code === code);
        return found || null;
    }

    /**
     * Find a purpose by its code.
     * @param code - The purpose code to search for
     * @returns The purpose if found, null otherwise
     */
    purposeForCode(code: string): InformationCategorySetting | null {
        const found = this.purposes.find(p => p.act_code === code);
        return found || null;
    }

    /**
     * Get all categories (module enabled status checked by registry).
     * @returns Array of all categories
     */
    allCategories(): InformationCategorySetting[] {
        return [...this.categories];
    }

    /**
     * Get all purposes (module enabled status checked by registry).
     * @returns Array of all purposes
     */
    allPurposes(): InformationCategorySetting[] {
        return [...this.purposes];
    }

    /**
     * Enable categories from FHIR codings.
     * @param codings - Array of FHIR Coding objects
     */
    applyCategoryCodings(codings: Coding[]): void {
        codings.forEach(c => {
            this.applyCategoryCoding(c);
        });
    }

    /**
     * Enable a category from a FHIR coding.
     * @param coding - FHIR Coding object
     */
    applyCategoryCoding(coding: Coding): void {
        this.categories.forEach(c => {
            if (c.act_code === coding.code) {
                c.enabled = true;
            }
        });
    }

    /**
     * Enable purposes from FHIR codings.
     * @param codings - Array of FHIR Coding objects
     */
    applyPurposeCodings(codings: Coding[]): void {
        codings.forEach(c => {
            this.applyPurposeCoding(c);
        });
    }

    /**
     * Enable a purpose from a FHIR coding.
     * @param coding - FHIR Coding object
     */
    applyPurposeCoding(coding: Coding): void {
        this.purposes.forEach(p => {
            if (p.act_code === coding.code) {
                p.enabled = true;
            }
        });
    }

    /**
     * Load categories from a consent provision.
     * @param provision - FHIR ConsentProvision
     */
    loadCategoriesFromConsentProvision(provision: ConsentProvision): void {
        if (!provision.securityLabel) {
            provision.securityLabel = [];
        }
        this.categories.forEach(c => {
            c.enabled = false;
        });
        this.applyCategoryCodings(provision.securityLabel);
    }

    /**
     * Load purposes from a consent provision.
     * @param provision - FHIR ConsentProvision
     */
    loadPurposesFromConsentProvision(provision: ConsentProvision): void {
        if (!provision.purpose) {
            provision.purpose = [];
        }
        this.purposes.forEach(p => {
            p.enabled = false;
        });
        this.applyPurposeCodings(provision.purpose);
    }

    /**
     * Load both categories and purposes from a consent provision.
     * @param provision - FHIR ConsentProvision
     */
    loadAllFromConsentProvision(provision: ConsentProvision): void {
        this.loadCategoriesFromConsentProvision(provision);
        this.loadPurposesFromConsentProvision(provision);
    }

    /**
     * Update a consent provision's security labels based on category enabled state.
     * @param provision - FHIR ConsentProvision to update
     * @param category - Category setting to apply
     */
    updateConsentProvisionCategory(provision: ConsentProvision, category: InformationCategorySetting): void {
        if (category.enabled) {
            let found = false;
            provision?.securityLabel?.forEach(sl => {
                if (category.act_code === sl.code) {
                    found = true;
                }
            });
            if (!found) {
                console.info("ENABLING CATEGORY: " + category.act_code);
                if (!provision.securityLabel) {
                    provision.securityLabel = [];
                }
                provision.securityLabel.push({ 
                    code: category.act_code, 
                    system: category.system, 
                    display: category.description 
                });
            }
        } else { // disabled
            if (provision.securityLabel) {
                let foundAt = -1;
                for (let i = 0; i < provision.securityLabel.length; i++) {
                    if (category.act_code === provision.securityLabel[i].code) {
                        foundAt = i;
                        break;
                    }
                }
                if (foundAt >= 0) {
                    console.info("DISABLING CATEGORY: " + category.act_code);
                    provision.securityLabel.splice(foundAt, 1);
                }
            }
        }
    }

    /**
     * Update a consent provision's purposes based on purpose enabled state.
     * @param provision - FHIR ConsentProvision to update
     * @param purpose - Purpose setting to apply
     */
    updateConsentProvisionPurpose(provision: ConsentProvision, purpose: InformationCategorySetting): void {
        if (purpose.enabled) {
            let found = false;
            provision?.purpose?.forEach(pur => {
                if (purpose.act_code === pur.code) {
                    found = true;
                }
            });
            if (!found) {
                console.info("ENABLING PURPOSE: " + purpose.act_code);
                if (!provision.purpose) {
                    provision.purpose = [];
                }
                provision.purpose.push({ 
                    code: purpose.act_code, 
                    system: purpose.system, 
                    display: purpose.description 
                });
            }
        } else { // disabled
            if (provision.purpose) {
                let foundAt = -1;
                for (let i = 0; i < provision.purpose.length; i++) {
                    if (purpose.act_code === provision.purpose[i].code) {
                        foundAt = i;
                        break;
                    }
                }
                if (foundAt >= 0) {
                    console.info("DISABLING PURPOSE: " + purpose.act_code);
                    provision.purpose.splice(foundAt, 1);
                }
            }
        }
    }

    /**
     * Update a consent provision with all categories and purposes from this module.
     * @param provision - FHIR ConsentProvision to update
     */
    updateConsentProvision(provision: ConsentProvision): void {
        provision.securityLabel = [];
        provision.purpose = [];
        this.categories.forEach(c => {
            this.updateConsentProvisionCategory(provision, c);
        });
        this.purposes.forEach(p => {
            this.updateConsentProvisionPurpose(provision, p);
        });
    }

    /**
     * Create a deep copy of this module.
     * @returns A new DataSegmentationModule instance with copied data
     */
    clone(): DataSegmentationModule {
        const cloned = new DataSegmentationModule(this.id, this.name, this.version, this.description);
        cloned.enabled = this.enabled;
        
        // Deep copy categories with parent references
        const categoryMap = new Map<string, InformationCategorySetting>();
        this.categories.forEach(cat => {
            const clonedCat = new InformationCategorySetting(cat.act_code, cat.name, cat.description);
            clonedCat.enabled = cat.enabled;
            clonedCat.system = cat.system;
            clonedCat.parentCode = cat.parentCode;
            categoryMap.set(cat.act_code, clonedCat);
            cloned.categories.push(clonedCat);
        });
        
        // Set parent references
        this.categories.forEach((cat, index) => {
            if (cat.parent) {
                const parentCode = cat.parent.act_code;
                const clonedParent = categoryMap.get(parentCode);
                if (clonedParent) {
                    cloned.categories[index].parent = clonedParent;
                }
            }
        });
        
        // Deep copy purposes
        this.purposes.forEach(pur => {
            const clonedPur = new InformationCategorySetting(pur.act_code, pur.name, pur.description);
            clonedPur.enabled = pur.enabled;
            clonedPur.system = pur.system;
            cloned.purposes.push(clonedPur);
        });
        
        // Deep copy rules and bindings if present
        if (this.rules) {
            const clonedRules = new Rules();
            this.rules.bindings.forEach(binding => {
                const clonedBinding = new Binding();
                clonedBinding.id = binding.id;
                clonedBinding.category = binding.category;
                clonedBinding.purpose = binding.purpose;
                
                // Clone basis
                clonedBinding.basis = new ModelCoding();
                clonedBinding.basis.system = binding.basis.system;
                clonedBinding.basis.code = binding.basis.code;
                clonedBinding.basis.display = binding.basis.display;
                
                // Clone labels
                clonedBinding.labels = binding.labels.map(label => {
                    const clonedLabel = new ModelCoding();
                    clonedLabel.system = label.system;
                    clonedLabel.code = label.code;
                    clonedLabel.display = label.display;
                    return clonedLabel;
                });
                
                // Clone codeSets
                clonedBinding.codeSets = binding.codeSets.map(codeSet => {
                    const clonedCodeSet = new CodeSet();
                    clonedCodeSet.groupID = codeSet.groupID;
                    clonedCodeSet.codes = codeSet.codes.map(code => {
                        const clonedCode = new CodeSetCoding();
                        clonedCode.system = code.system;
                        clonedCode.code = code.code;
                        clonedCode.confidence = code.confidence;
                        return clonedCode;
                    });
                    return clonedCodeSet;
                });
                
                clonedRules.bindings.push(clonedBinding);
            });
            cloned.rules = clonedRules;
        }
        
        return cloned;
    }

    /**
     * Create a DataSegmentationModule from JSON data.
     * @param json - JSON object with module data
     * @returns New DataSegmentationModule instance
     */
    static fromJson(json: any): DataSegmentationModule {
        const module = new DataSegmentationModule(
            json.id,
            json.name,
            json.version,
            json.description
        );
        
        if (json.enabled !== undefined) {
            module.enabled = json.enabled;
        }
        
        // Build parent map for resolving parent references
        const parentMap = new Map<string, InformationCategorySetting>();
        
        // First pass: create all categories without parents
        if (json.categories) {
            json.categories.forEach((catJson: any) => {
                const category = InformationCategorySetting.fromJson(catJson, parentMap);
                module.categories.push(category);
                parentMap.set(category.act_code, category);
            });
        }
        
        // Second pass: resolve parent references
        if (json.categories) {
            json.categories.forEach((catJson: any, index: number) => {
                if (catJson.parent) {
                    const parent = parentMap.get(catJson.parent);
                    if (parent) {
                        module.categories[index].parent = parent;
                    }
                }
            });
        }
        
        // Create purposes
        if (json.purposes) {
            const purposeParentMap = new Map<string, InformationCategorySetting>();
            json.purposes.forEach((purJson: any) => {
                const purpose = InformationCategorySetting.fromJson(purJson, purposeParentMap);
                module.purposes.push(purpose);
                purposeParentMap.set(purpose.act_code, purpose);
            });
            
            // Resolve purpose parent references
            json.purposes.forEach((purJson: any, index: number) => {
                if (purJson.parent) {
                    const parent = purposeParentMap.get(purJson.parent);
                    if (parent) {
                        module.purposes[index].parent = parent;
                    }
                }
            });
        }
        
        // Load rules and bindings if present
        if (json.rules && json.rules.bindings) {
            const rules = new Rules();
            json.rules.bindings.forEach((bindingJson: any) => {
                const binding = new Binding();
                binding.id = bindingJson.id || '';
                binding.category = bindingJson.category;
                binding.purpose = bindingJson.purpose;
                
                // Load basis
                if (bindingJson.basis) {
                    binding.basis = new ModelCoding();
                    binding.basis.system = bindingJson.basis.system || '';
                    binding.basis.code = bindingJson.basis.code || '';
                    binding.basis.display = bindingJson.basis.display || '';
                }
                
                // Load labels
                if (bindingJson.labels) {
                    binding.labels = bindingJson.labels.map((labelJson: any) => {
                        const label = new ModelCoding();
                        label.system = labelJson.system || '';
                        label.code = labelJson.code || '';
                        label.display = labelJson.display || '';
                        return label;
                    });
                }
                
                // Load codeSets
                if (bindingJson.codeSets) {
                    binding.codeSets = bindingJson.codeSets.map((codeSetJson: any) => {
                        const codeSet = new CodeSet();
                        codeSet.groupID = codeSetJson.groupID || '';
                        if (codeSetJson.codes) {
                            codeSet.codes = codeSetJson.codes.map((codeJson: any) => {
                                const code = new CodeSetCoding();
                                code.system = codeJson.system || '';
                                code.code = codeJson.code || '';
                                code.confidence = codeJson.confidence ?? 1.0;
                                return code;
                            });
                        }
                        return codeSet;
                    });
                }
                
                rules.bindings.push(binding);
            });
            module.rules = rules;
        }
        
        return module;
    }

    /**
     * Load a DataSegmentationModule from a JSON file.
     * @param path - Path to the JSON file
     * @returns Promise resolving to a DataSegmentationModule instance
     */
    static async fromFile(path: string): Promise<DataSegmentationModule> {
        const fileContent = await readFile(path, 'utf-8');
        const json = JSON.parse(fileContent);
        return DataSegmentationModule.fromJson(json);
    }

    /**
     * Factory method to create a temporary module merging all categories/purposes from enabled modules in registry.
     * @param registry - The module registry to merge from
     * @returns New DataSegmentationModule with merged categories and purposes
     */
    static createFromRegistry(registry: DataSegmentationModuleRegistry): DataSegmentationModule {
        const tempModule = new DataSegmentationModule('temp', 'Temporary Module');
        const enabledModules = registry.getEnabledModules();
        
        // Merge all categories from enabled modules
        const categoryMap = new Map<string, InformationCategorySetting>();
        enabledModules.forEach(module => {
            module.categories.forEach(cat => {
                // Use first occurrence (highest priority)
                if (!categoryMap.has(cat.act_code)) {
                    const clonedCat = new InformationCategorySetting(cat.act_code, cat.name, cat.description, cat.parent);
                    clonedCat.enabled = cat.enabled;
                    clonedCat.system = cat.system;
                    categoryMap.set(cat.act_code, clonedCat);
                    tempModule.categories.push(clonedCat);
                }
            });
        });
        
        // Merge all purposes from enabled modules
        const purposeMap = new Map<string, InformationCategorySetting>();
        enabledModules.forEach(module => {
            module.purposes.forEach(pur => {
                // Use first occurrence (highest priority)
                if (!purposeMap.has(pur.act_code)) {
                    const clonedPur = new InformationCategorySetting(pur.act_code, pur.name, pur.description, pur.parent);
                    clonedPur.enabled = pur.enabled;
                    clonedPur.system = pur.system;
                    purposeMap.set(pur.act_code, clonedPur);
                    tempModule.purposes.push(clonedPur);
                }
            });
        });
        
        return tempModule;
    }

}

