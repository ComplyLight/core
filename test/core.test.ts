import { CodingWithPolicies } from '../src/model/coding_with_policies.js';
import { CodeSetCoding } from '../src/model/code_set_coding.js';
import { CodeSet } from '../src/model/code_set.js';
import { ConsentDecision } from '../src/model/consent_decision.js';
import { Binding } from '../src/model/binding.js';
import { Permissions } from '../src/model/permissions.js';
import { ConsentExtension } from '../src/model/consent_extension.js';

describe('Model Classes', () => {

    describe('CodingWithPolicies', () => {
        test('should create instance with default empty values', () => {
            const coding = new CodingWithPolicies();
            expect(coding.system).toBe('');
            expect(coding.code).toBe('');
            expect(coding.display).toBe('');
        });

        test('should allow setting properties', () => {
            const coding = new CodingWithPolicies();
            coding.system = 'http://snomed.info/sct';
            coding.code = '12345';
            coding.display = 'Test Display';

            expect(coding.system).toBe('http://snomed.info/sct');
            expect(coding.code).toBe('12345');
            expect(coding.display).toBe('Test Display');
        });
    });

    describe('CodeSetCoding', () => {
        test('should create instance with default values', () => {
            const codeSetCoding = new CodeSetCoding();
            expect(codeSetCoding.system).toBe('');
            expect(codeSetCoding.code).toBe('');
            expect(codeSetCoding.confidence).toBe(1.0);
        });

        test('should allow setting properties', () => {
            const codeSetCoding = new CodeSetCoding();
            codeSetCoding.system = 'http://loinc.org';
            codeSetCoding.code = '33747-0';
            codeSetCoding.confidence = 0.95;

            expect(codeSetCoding.system).toBe('http://loinc.org');
            expect(codeSetCoding.code).toBe('33747-0');
            expect(codeSetCoding.confidence).toBe(0.95);
        });

        test('should handle confidence values between 0 and 1', () => {
            const codeSetCoding = new CodeSetCoding();
            codeSetCoding.confidence = 0.0;
            expect(codeSetCoding.confidence).toBe(0.0);

            codeSetCoding.confidence = 1.0;
            expect(codeSetCoding.confidence).toBe(1.0);

            codeSetCoding.confidence = 0.5;
            expect(codeSetCoding.confidence).toBe(0.5);
        });
    });

    describe('CodeSet', () => {
        test('should create instance with default values', () => {
            const codeSet = new CodeSet();
            expect(codeSet.groupID).toBe('');
            expect(codeSet.codes).toEqual([]);
        });

        test('should allow setting properties', () => {
            const codeSet = new CodeSet();
            codeSet.groupID = 'test-group-123';
            
            const coding1 = new CodeSetCoding();
            coding1.system = 'http://snomed.info/sct';
            coding1.code = '12345';
            
            const coding2 = new CodeSetCoding();
            coding2.system = 'http://loinc.org';
            coding2.code = '67890';
            
            codeSet.codes = [coding1, coding2];

            expect(codeSet.groupID).toBe('test-group-123');
            expect(codeSet.codes).toHaveLength(2);
            expect(codeSet.codes[0].code).toBe('12345');
            expect(codeSet.codes[1].code).toBe('67890');
        });

        test('codeFromTemplate should return CodeSetCoding with correct defaults', () => {
            const coding = CodeSet.codeFromTemplate();
            
            expect(coding.system).toBe('http://snomed.info/sct');
            expect(coding.code).toBe('');
            expect(coding.confidence).toBe(1.0);
        });
    });

    describe('ConsentDecision', () => {
        test('should have correct enum values', () => {
            expect(ConsentDecision.CONSENT_PERMIT).toBe('CONSENT_PERMIT');
            expect(ConsentDecision.CONSENT_DENY).toBe('CONSENT_DENY');
            expect(ConsentDecision.NO_CONSENT).toBe('NO_CONSENT');
        });

        test('should allow assignment of enum values', () => {
            let decision: ConsentDecision;
            
            decision = ConsentDecision.CONSENT_PERMIT;
            expect(decision).toBe('CONSENT_PERMIT');
            
            decision = ConsentDecision.CONSENT_DENY;
            expect(decision).toBe('CONSENT_DENY');
            
            decision = ConsentDecision.NO_CONSENT;
            expect(decision).toBe('NO_CONSENT');
        });
    });

    describe('Binding', () => {
        test('should create instance with default values', () => {
            const binding = new Binding();
            expect(binding.id).toBe('');
            expect(binding.basis).toBeInstanceOf(CodingWithPolicies);
            expect(binding.labels).toEqual([]);
            expect(binding.codeSets).toEqual([]);
        });

        test('should allow setting properties', () => {
            const binding = new Binding();
            binding.id = 'test-binding-123';
            
            const basis = new CodingWithPolicies();
            basis.system = 'http://test.system';
            basis.code = 'TEST';
            binding.basis = basis;
            
            const label = new CodingWithPolicies();
            label.system = 'http://label.system';
            label.code = 'LABEL';
            binding.labels = [label];
            
            const codeSet = new CodeSet();
            codeSet.groupID = 'test-group';
            binding.codeSets = [codeSet];

            expect(binding.id).toBe('test-binding-123');
            expect(binding.basis.code).toBe('TEST');
            expect(binding.labels).toHaveLength(1);
            expect(binding.codeSets).toHaveLength(1);
        });

        test('fromTemplate should create binding with generated ID and template values', () => {
            const binding = Binding.fromTemplate();
            
            expect(binding.id).toMatch(/^binding-[a-f0-9]{6}$/);
            expect(binding.basis).toBeInstanceOf(CodingWithPolicies);
            expect(binding.labels).toHaveLength(1);
            expect(binding.codeSets).toHaveLength(1);
        });

        test('basisFromTemplate should return CodingWithPolicies with correct values', () => {
            const basis = Binding.basisFromTemplate();
            
            expect(basis.system).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');
            expect(basis.code).toBe('42CFRPart2');
            expect(basis.display).toBe('42 CFR Part2');
        });

        test('labelFromTemplate should return CodingWithPolicies with correct values', () => {
            const label = Binding.labelFromTemplate();
            
            expect(label.system).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');
            expect(label.code).toBe('X');
            expect(label.display).toBe('Description of X');
        });

        test('codeSetFromTemplate should return CodeSet with generated groupID', () => {
            const codeSet = Binding.codeSetFromTemplate();
            
            expect(codeSet.groupID).toMatch(/^Group-[a-f0-9-]{36}$/);
            expect(codeSet.codes).toEqual([]);
        });

        test('allCodeObjects should return flattened array of codes from all codeSets', () => {
            const binding = new Binding();
            
            const codeSet1 = new CodeSet();
            const coding1 = new CodeSetCoding();
            coding1.code = 'code1';
            const coding2 = new CodeSetCoding();
            coding2.code = 'code2';
            codeSet1.codes = [coding1, coding2];
            
            const codeSet2 = new CodeSet();
            const coding3 = new CodeSetCoding();
            coding3.code = 'code3';
            codeSet2.codes = [coding3];
            
            binding.codeSets = [codeSet1, codeSet2];
            
            const allCodes = binding.allCodeObjects();
            
            expect(allCodes).toHaveLength(3);
            expect(allCodes[0].code).toBe('code1');
            expect(allCodes[1].code).toBe('code2');
            expect(allCodes[2].code).toBe('code3');
        });

        test('allCodeObjects should return empty array when no codeSets', () => {
            const binding = new Binding();
            const allCodes = binding.allCodeObjects();
            expect(allCodes).toEqual([]);
        });
    });

    describe('Permissions', () => {
        test('should create instance with default values', () => {
            const permissions = new Permissions();
            expect(permissions.edit).toBe(true);
        });

        test('should allow setting properties', () => {
            const permissions = new Permissions();
            permissions.edit = false;
            expect(permissions.edit).toBe(false);
            
            permissions.edit = true;
            expect(permissions.edit).toBe(true);
        });
    });

    describe('ConsentExtension', () => {
        test('should create instance with default values when no content provided', () => {
            const extension = new ConsentExtension(null);
            
            expect(extension.decision).toBe(ConsentDecision.NO_CONSENT);
            expect(extension.obligations).toEqual([]);
            expect(extension.content).toBeNull();
            expect(extension.basedOn).toBe('');
        });

        test('should create instance with content when provided', () => {
            const mockBundle = { resourceType: 'Bundle', type: 'collection', entry: [] };
            const extension = new ConsentExtension(mockBundle as any);
            
            expect(extension.decision).toBe(ConsentDecision.NO_CONSENT);
            expect(extension.obligations).toEqual([]);
            expect(extension.content).toEqual(mockBundle);
            expect(extension.basedOn).toBe('');
        });

        test('should allow setting properties', () => {
            const extension = new ConsentExtension(null);
            
            extension.decision = ConsentDecision.CONSENT_PERMIT;
            extension.basedOn = 'test-reference';
            
            const obligation = {
                id: { system: 'http://test.system', code: 'TEST' },
                parameters: { codes: [{ system: 'http://param.system', code: 'PARAM' }] }
            };
            extension.obligations = [obligation];
            
            expect(extension.decision).toBe(ConsentDecision.CONSENT_PERMIT);
            expect(extension.basedOn).toBe('test-reference');
            expect(extension.obligations).toHaveLength(1);
            expect(extension.obligations[0].id.code).toBe('TEST');
        });

        test('should handle different consent decisions', () => {
            const extension = new ConsentExtension(null);
            
            extension.decision = ConsentDecision.CONSENT_PERMIT;
            expect(extension.decision).toBe(ConsentDecision.CONSENT_PERMIT);
            
            extension.decision = ConsentDecision.CONSENT_DENY;
            expect(extension.decision).toBe(ConsentDecision.CONSENT_DENY);
            
            extension.decision = ConsentDecision.NO_CONSENT;
            expect(extension.decision).toBe(ConsentDecision.NO_CONSENT);
        });
    });

}); 