// Author: Preston Lee

export class InformationCategorySetting {

    public static ACT_CODE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
    public static ACT_CODE_TREATMENT_CODE = 'HIPAAConsentCD';
    public static ACT_CODE_TREATMENT_NAME = 'Treatment';
    public static ACT_CODE_TREATMENT_DISPLAY = 'For the purposes of providing or supporting care.';
    public static ACT_CODE_RESEARCH_CODE = 'RESEARCH';
    public static ACT_CODE_RESEARCH_NAME = 'Research';
    public static ACT_CODE_RESEARCH_DISPLAY = 'Scientific and academic research intended to benefit others.';

    // public static ACT_REASON_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActReason';
    // public static ACT_REASON_42CFRPART2_CODE = '42CFRPart2';
    // public static ACT_REASON_42CFRPART2_DISPLAY = '42 CFR Part2';
    // public static ACT_REASON_RESEARCH_CODE = 'RESCH'
    // public static ACT_REASON_RESEARCH_DISPLAY = 'Research Purposes';

    public enabled: boolean = true;
    public act_code: string;
    public system: string = InformationCategorySetting.ACT_CODE_SYSTEM;
    public name: string;
    public description: string;
    public parent?: InformationCategorySetting;
    public parentCode?: string; // For JSON deserialization

    constructor(act_code: string, name: string, description: string, parent?: InformationCategorySetting) {
        this.act_code = act_code;
        this.name = name;
        this.description = description;
        this.parent = parent;
    }

    /**
     * Get all ancestors of this category, traversing up the tree.
     * @returns Array of ancestor categories, starting with immediate parent
     */
    getAncestors(): InformationCategorySetting[] {
        const ancestors: InformationCategorySetting[] = [];
        let current: InformationCategorySetting | undefined = this.parent;
        while (current) {
            ancestors.push(current);
            current = current.parent;
        }
        return ancestors;
    }

    /**
     * Get all descendants (children) of this category from a given list of categories.
     * @param allCategories - All categories to search for descendants
     * @returns Array of descendant categories
     */
    getDescendants(allCategories: InformationCategorySetting[]): InformationCategorySetting[] {
        return allCategories.filter(cat => cat.isDescendantOf(this));
    }

    /**
     * Check if this category is a descendant of the given category.
     * @param category - The potential ancestor category
     * @returns True if this category is a descendant of the given category
     */
    isDescendantOf(category: InformationCategorySetting): boolean {
        let current: InformationCategorySetting | undefined = this.parent;
        while (current) {
            if (current.act_code === category.act_code && current.system === category.system) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    /**
     * Create an InformationCategorySetting from JSON data.
     * @param json - JSON object with category/purpose data
     * @param parentMap - Map of code to InformationCategorySetting for resolving parent references
     * @returns New InformationCategorySetting instance
     */
    static fromJson(json: any, parentMap: Map<string, InformationCategorySetting>): InformationCategorySetting {
        const category = new InformationCategorySetting(
            json.code,
            json.name,
            json.description || ''
        );
        
        if (json.system) {
            category.system = json.system;
        }
        
        if (json.parent) {
            category.parentCode = json.parent;
            const parent = parentMap.get(json.parent);
            if (parent) {
                category.parent = parent;
            }
        }
        
        return category;
    }

}