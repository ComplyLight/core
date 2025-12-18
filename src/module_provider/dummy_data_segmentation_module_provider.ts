// Author: Preston Lee

import { AbstractDataSegmentationModuleProvider } from './abstract_data_segmentation_module_provider.js';
import { DataSegmentationModuleRegistry } from '../core/data_segmentation_module_registry.js';

/**
 * Dummy implementation that provides no bindings.
 * Useful for testing or when no module-based labeling is needed.
 */
export class DummyDataSegmentationModuleProvider extends AbstractDataSegmentationModuleProvider {

    constructor(moduleRegistry: DataSegmentationModuleRegistry) {
        super(moduleRegistry);
        // Don't call reinitialize - bindings stay empty
    }

}

