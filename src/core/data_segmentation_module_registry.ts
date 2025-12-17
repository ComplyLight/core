// Author: Preston Lee

import { DataSegmentationModule } from "./data_segmentation_module.js";
import { InformationCategorySetting } from "./information_category_setting.js";

/**
 * Registry for managing multiple DataSegmentationModule instances with priority ordering.
 * Starts empty by default - applications must explicitly register modules.
 * Disabled modules are skipped during all search and iteration operations.
 */
export class DataSegmentationModuleRegistry {

    /**
     * Ordered array of modules (index = priority, lower index = higher priority).
     */
    public modules: DataSegmentationModule[] = [];

    /**
     * Initialize registry, optionally with modules in priority order.
     * @param modules - Optional array of modules to initialize with (empty by default)
     */
    constructor(modules: DataSegmentationModule[] = []) {
        this.modules = [...modules];
    }

    /**
     * Add a module to the end of the registry (lowest priority).
     * @param module - Module to add
     */
    addModule(module: DataSegmentationModule): void {
        this.modules.push(module);
    }

    /**
     * Insert a module at a specific priority position.
     * @param module - Module to add
     * @param priority - Priority index (0 = highest priority)
     */
    addModuleAt(module: DataSegmentationModule, priority: number): void {
        if (priority < 0) {
            priority = 0;
        }
        if (priority >= this.modules.length) {
            this.modules.push(module);
        } else {
            this.modules.splice(priority, 0, module);
        }
    }

    /**
     * Remove a module by ID.
     * @param moduleId - ID of the module to remove
     * @returns True if module was found and removed, false otherwise
     */
    removeModule(moduleId: string): boolean {
        const index = this.modules.findIndex(m => m.id === moduleId);
        if (index >= 0) {
            this.modules.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a module by ID.
     * @param moduleId - ID of the module to retrieve
     * @returns The module if found, null otherwise
     */
    getModule(moduleId: string): DataSegmentationModule | null {
        const found = this.modules.find(m => m.id === moduleId);
        return found || null;
    }

    /**
     * Enable a module by ID.
     * @param moduleId - ID of the module to enable
     * @returns True if module was found and enabled, false otherwise
     */
    enableModule(moduleId: string): boolean {
        const module = this.getModule(moduleId);
        if (module) {
            module.enable();
            return true;
        }
        return false;
    }

    /**
     * Disable a module by ID.
     * @param moduleId - ID of the module to disable
     * @returns True if module was found and disabled, false otherwise
     */
    disableModule(moduleId: string): boolean {
        const module = this.getModule(moduleId);
        if (module) {
            module.disable();
            return true;
        }
        return false;
    }

    /**
     * Find a category by code, searching only enabled modules in priority order.
     * First match wins (highest priority enabled module).
     * @param code - Category code to search for
     * @returns The category if found, null otherwise
     */
    findCategoryByCode(code: string): InformationCategorySetting | null {
        for (const module of this.modules) {
            if (module.isEnabled()) {
                const category = module.categoryForCode(code);
                if (category) {
                    return category;
                }
            }
        }
        return null;
    }

    /**
     * Find a purpose by code, searching only enabled modules in priority order.
     * First match wins (highest priority enabled module).
     * @param code - Purpose code to search for
     * @returns The purpose if found, null otherwise
     */
    findPurposeByCode(code: string): InformationCategorySetting | null {
        for (const module of this.modules) {
            if (module.isEnabled()) {
                const purpose = module.purposeForCode(code);
                if (purpose) {
                    return purpose;
                }
            }
        }
        return null;
    }

    /**
     * Get all categories from all enabled modules (for iteration).
     * @returns Array of all categories from enabled modules
     */
    getAllCategories(): InformationCategorySetting[] {
        const allCategories: InformationCategorySetting[] = [];
        for (const module of this.modules) {
            if (module.isEnabled()) {
                allCategories.push(...module.allCategories());
            }
        }
        return allCategories;
    }

    /**
     * Get all purposes from all enabled modules (for iteration).
     * @returns Array of all purposes from enabled modules
     */
    getAllPurposes(): InformationCategorySetting[] {
        const allPurposes: InformationCategorySetting[] = [];
        for (const module of this.modules) {
            if (module.isEnabled()) {
                allPurposes.push(...module.allPurposes());
            }
        }
        return allPurposes;
    }

    /**
     * Get all modules (enabled and disabled).
     * @returns Array of all registered modules
     */
    getModules(): DataSegmentationModule[] {
        return [...this.modules];
    }

    /**
     * Get only enabled modules.
     * @returns Array of enabled modules
     */
    getEnabledModules(): DataSegmentationModule[] {
        return this.modules.filter(m => m.isEnabled());
    }

}

