// Author: Preston Lee

/**
 * Represents a policy that references a regulatory control, rule, or other policy.
 * Policies are defined at the module level and can be referenced by bindings.
 */
export class Policy {
    public id: string = '';
    public name: string = '';
    public control_authority: string = '';
    public control_id: string = '';

    constructor(id?: string, name?: string, control_authority?: string, control_id?: string) {
        if (id !== undefined) this.id = id;
        if (name !== undefined) this.name = name;
        if (control_authority !== undefined) this.control_authority = control_authority;
        if (control_id !== undefined) this.control_id = control_id;
    }

    /**
     * Create a Policy from JSON data.
     * @param json - JSON object with policy data
     * @returns New Policy instance
     */
    static fromJson(json: any): Policy {
        const policy = new Policy();
        policy.id = json.id || '';
        policy.name = json.name || '';
        policy.control_authority = json.control_authority || '';
        policy.control_id = json.control_id || '';
        return policy;
    }

    /**
     * Create a deep copy of this Policy.
     * @returns A new Policy instance with copied values
     */
    clone(): Policy {
        const cloned = new Policy();
        cloned.id = this.id;
        cloned.name = this.name;
        cloned.control_authority = this.control_authority;
        cloned.control_id = this.control_id;
        return cloned;
    }
}

