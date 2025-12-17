// Author: Preston Lee

import { Binding } from "./binding.js";

/**
 * Represents the rules object in a data segmentation module.
 * Contains bindings that link sensitivity rules to categories and purposes.
 */
export class Rules {

    public bindings: Binding[] = [];

    /**
     * Get all bindings.
     * @returns Array of Binding objects
     */
    getBindings(): Binding[] {
        return this.bindings;
    }

}

