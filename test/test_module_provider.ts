// Author: Preston Lee

import { AbstractDataSegmentationModuleProvider } from '../src/module_provider/abstract_data_segmentation_module_provider.js';
import { DataSegmentationModuleRegistry } from '../src/core/data_segmentation_module_registry.js';

/**
 * Test module provider that loads bindings from registered modules.
 */
export class TestDataSegmentationModuleProvider extends AbstractDataSegmentationModuleProvider {
    
    constructor(moduleRegistry: DataSegmentationModuleRegistry) {
        super(moduleRegistry);
        this.reinitialize();
    }

    /**
     * Refresh bindings from modules (call after module changes).
     */
    refreshBindings(): void {
        this.reinitialize();
    }
}

