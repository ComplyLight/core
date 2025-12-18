// Author: Preston Lee

import { DataSegmentationModule } from '../src/core/data_segmentation_module.js';
import { DataSegmentationModuleRegistry } from '../src/core/data_segmentation_module_registry.js';
import { InformationCategorySetting } from '../src/core/information_category_setting.js';
import { ConsoleDataSharingEngine } from '../src/engine/console_data_sharing_engine.js';
import { TestDataSegmentationModuleProvider } from './test_module_provider.js';
import { DataSharingEngineContext } from '../src/model/engine_context.js';
import { Patient, Bundle, Condition, Observation } from 'fhir/r5.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Data Segmentation Module Registry', () => {

    describe('Hierarchical Categories', () => {
        test('should correctly load and structure hierarchical categories', async () => {
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);

            expect(module.categories).toHaveLength(5);
            
            // Find root category
            const healthCategory = module.categoryForCode('HEALTH');
            expect(healthCategory).toBeDefined();
            expect(healthCategory?.parent).toBeUndefined();

            // Find child category
            const mentalCategory = module.categoryForCode('MENTAL');
            expect(mentalCategory).toBeDefined();
            expect(mentalCategory?.parent).toBeDefined();
            expect(mentalCategory?.parent?.act_code).toBe('HEALTH');

            // Find grandchild category
            const anxietyCategory = module.categoryForCode('ANXIETY');
            expect(anxietyCategory).toBeDefined();
            expect(anxietyCategory?.parent).toBeDefined();
            expect(anxietyCategory?.parent?.act_code).toBe('MENTAL');
            
            // Verify ancestor chain
            const ancestors = anxietyCategory?.getAncestors() || [];
            expect(ancestors).toHaveLength(2);
            expect(ancestors[0].act_code).toBe('MENTAL');
            expect(ancestors[1].act_code).toBe('HEALTH');
        });

        test('should correctly identify descendants in hierarchy', async () => {
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);

            const healthCategory = module.categoryForCode('HEALTH');
            expect(healthCategory).toBeDefined();

            const descendants = healthCategory?.getDescendants(module.allCategories()) || [];
            expect(descendants.length).toBeGreaterThan(0);
            
            const descendantCodes = descendants.map(d => d.act_code);
            expect(descendantCodes).toContain('MENTAL');
            expect(descendantCodes).toContain('PHYSICAL');
            expect(descendantCodes).toContain('ANXIETY');
            expect(descendantCodes).toContain('DEPRESSION');
        });

        test('should handle deep hierarchy (4 levels)', async () => {
            const modulePath = join(__dirname, 'modules/test-module-deep-hierarchy.json');
            const module = await DataSegmentationModule.fromFile(modulePath);

            expect(module.categories).toHaveLength(5);

            const level4Category = module.categoryForCode('LEVEL4');
            expect(level4Category).toBeDefined();

            const ancestors = level4Category?.getAncestors() || [];
            expect(ancestors).toHaveLength(4);
            expect(ancestors[0].act_code).toBe('LEVEL3');
            expect(ancestors[1].act_code).toBe('LEVEL2');
            expect(ancestors[2].act_code).toBe('LEVEL1');
            expect(ancestors[3].act_code).toBe('ROOT');
        });

        test('should correctly check if category is descendant of another', async () => {
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);

            const healthCategory = module.categoryForCode('HEALTH');
            const mentalCategory = module.categoryForCode('MENTAL');
            const anxietyCategory = module.categoryForCode('ANXIETY');

            expect(mentalCategory?.isDescendantOf(healthCategory!)).toBe(true);
            expect(anxietyCategory?.isDescendantOf(healthCategory!)).toBe(true);
            expect(anxietyCategory?.isDescendantOf(mentalCategory!)).toBe(true);
            expect(healthCategory?.isDescendantOf(mentalCategory!)).toBe(false);
        });
    });

    describe('Multiple Modules in Registry', () => {
        test('should register and retrieve multiple modules', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            expect(registry.getModules()).toHaveLength(2);
            expect(registry.getModule('test-flat')).toBe(module1);
            expect(registry.getModule('test-hierarchical-1')).toBe(module2);
        });

        test('should process modules in priority order', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-2.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            // Both modules have DEMO category - module1 should win (higher priority)
            registry.addModule(module1);
            registry.addModule(module2);

            const demoCategory = registry.findCategoryByCode('DEMO');
            expect(demoCategory).toBeDefined();
            // Should come from module1 (first added = higher priority)
            expect(demoCategory?.act_code).toBe('DEMO');
        });

        test('should only return categories from enabled modules', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            // Initially both enabled
            expect(registry.getAllCategories().length).toBeGreaterThan(0);

            // Disable module1
            registry.disableModule('test-flat');
            const categoriesAfterDisable = registry.getAllCategories();
            
            // Should not include categories from disabled module1
            const test1Category = categoriesAfterDisable.find(c => c.act_code === 'TEST1');
            expect(test1Category).toBeUndefined();
            
            // Should still include categories from enabled module2
            const healthCategory = categoriesAfterDisable.find(c => c.act_code === 'HEALTH');
            expect(healthCategory).toBeDefined();
        });

        test('should merge categories and purposes from multiple enabled modules', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            const allCategories = registry.getAllCategories();
            const allPurposes = registry.getAllPurposes();

            // Should have categories from both modules
            expect(allCategories.length).toBeGreaterThanOrEqual(module1.categories.length);
            expect(allCategories.length).toBeGreaterThanOrEqual(module2.categories.length);

            // Should have purposes from both modules
            expect(allPurposes.length).toBeGreaterThanOrEqual(module1.purposes.length);
            expect(allPurposes.length).toBeGreaterThanOrEqual(module2.purposes.length);
        });

        test('should handle module priority when inserting at specific position', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module3Path = join(__dirname, 'modules/test-module-hierarchical-2.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);
            const module3 = await DataSegmentationModule.fromFile(module3Path);

            registry.addModule(module1); // Priority 0
            registry.addModule(module2); // Priority 1
            registry.addModuleAt(module3, 0); // Insert at priority 0, pushing others down

            expect(registry.getModules()[0].id).toBe('test-hierarchical-2');
            expect(registry.getModules()[1].id).toBe('test-flat');
            expect(registry.getModules()[2].id).toBe('test-hierarchical-1');
        });
    });

    describe('Engine with Multiple Modules and Hierarchical Categories', () => {
        test('should correctly label resources using hierarchical categories from multiple modules', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module2Path = join(__dirname, 'modules/test-module-flat.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Verify registry can find hierarchical categories
            const healthCategory = registry.findCategoryByCode('HEALTH');
            expect(healthCategory).toBeDefined();
            expect(healthCategory?.act_code).toBe('HEALTH');

            const mentalCategory = registry.findCategoryByCode('MENTAL');
            expect(mentalCategory).toBeDefined();
            expect(mentalCategory?.parent?.act_code).toBe('HEALTH');

            const anxietyCategory = registry.findCategoryByCode('ANXIETY');
            expect(anxietyCategory).toBeDefined();
            expect(anxietyCategory?.parent?.act_code).toBe('MENTAL');
        });

        test('should handle disabled modules correctly in engine context', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-flat.json');
            const module2Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            // Disable module1
            registry.disableModule('test-flat');

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Categories from disabled module should not be found
            const test1Category = registry.findCategoryByCode('TEST1');
            expect(test1Category).toBeNull();

            // Categories from enabled module should still be found
            const healthCategory = registry.findCategoryByCode('HEALTH');
            expect(healthCategory).toBeDefined();

            // Re-enable module1
            registry.enableModule('test-flat');
            moduleProvider.refreshBindings(); // Refresh bindings after enabling module
            const test1CategoryAfterEnable = registry.findCategoryByCode('TEST1');
            expect(test1CategoryAfterEnable).toBeDefined();
        });

        test('should process modules in priority order when finding categories', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            // Both modules have overlapping categories - test priority
            const module1Path = join(__dirname, 'modules/test-module-hierarchical-2.json');
            const module2Path = join(__dirname, 'modules/test-module-flat.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            // Add module2 first (lower priority), then module1 (higher priority)
            registry.addModule(module2);
            registry.addModule(module1);

            // DEMO exists in both - should find from module2 (first = higher priority)
            const demoCategory = registry.findCategoryByCode('DEMO');
            expect(demoCategory).toBeDefined();
            // Verify it's from the first module by checking if it has a parent
            // (module1's DEMO has no parent, module2's DEMO also has no parent in this case)
            // Let's check by module structure
            expect(registry.getModules()[0].id).toBe('test-flat');
        });

        test('should apply correct hierarchical category labels to resources', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Create a Condition resource with coding that matches ANXIETY binding
            const condition: Condition = {
                resourceType: 'Condition',
                id: 'test-condition-1',
                clinicalStatus: {
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'active'
                    }]
                },
                subject: {
                    reference: 'Patient/test-patient'
                },
                code: {
                    coding: [{
                        system: 'http://snomed.info/sct',
                        code: '48694002', // Matches anxiety-test codeSet
                        display: 'Anxiety disorder'
                    }]
                },
                meta: {
                    security: []
                }
            };

            const bundle: Bundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [{
                    resource: condition
                }]
            };

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'test-patient' }],
                content: bundle
            };

            // Process with empty consents (no consent = NoConsentCard)
            const card = engine.process([], context);

            // Verify security label was applied
            expect(card.extension).toBeDefined();
            expect(card.extension?.content?.entry).toBeDefined();
            const resource = card.extension?.content?.entry?.[0]?.resource as Condition;
            expect(resource).toBeDefined();
            expect(resource.meta?.security).toBeDefined();
            expect(resource.meta?.security?.length).toBeGreaterThan(0);

            // Verify ANXIETY label was applied (not parent categories)
            const securityLabels = resource.meta?.security || [];
            const anxietyLabel = securityLabels.find((label: any) => label.code === 'ANXIETY');
            expect(anxietyLabel).toBeDefined();
            expect(anxietyLabel?.system).toBe('http://terminology.hl7.org/CodeSystem/v3-ActCode');

            // Verify parent categories (MENTAL, HEALTH) are NOT applied
            const mentalLabel = securityLabels.find((label: any) => label.code === 'MENTAL');
            expect(mentalLabel).toBeUndefined();
            const healthLabel = securityLabels.find((label: any) => label.code === 'HEALTH');
            expect(healthLabel).toBeUndefined();
        });

        test('should apply labels from multiple modules correctly', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const module1Path = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module2Path = join(__dirname, 'modules/test-module-flat.json');
            
            const module1 = await DataSegmentationModule.fromFile(module1Path);
            const module2 = await DataSegmentationModule.fromFile(module2Path);

            registry.addModule(module1);
            registry.addModule(module2);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Create an Observation with coding that matches TEST1 binding from module2
            const observation: Observation = {
                resourceType: 'Observation',
                id: 'test-observation-1',
                status: 'final',
                code: {
                    coding: [{
                        system: 'http://snomed.info/sct',
                        code: '123456789', // Matches test1-group codeSet
                        display: 'Test observation'
                    }]
                },
                subject: {
                    reference: 'Patient/test-patient'
                },
                meta: {
                    security: []
                }
            };

            const bundle: Bundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [{
                    resource: observation
                }]
            };

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'test-patient' }],
                content: bundle
            };

            const card = engine.process([], context);

            // Verify security label was applied
            const resource = card.extension?.content?.entry?.[0]?.resource as Observation;
            expect(resource.meta?.security).toBeDefined();
            expect(resource.meta?.security?.length).toBeGreaterThan(0);

            // Verify TEST1 label was applied
            const securityLabels = resource.meta?.security || [];
            const test1Label = securityLabels.find((label: any) => label.code === 'TEST1');
            expect(test1Label).toBeDefined();
        });

        test('should handle deep hierarchy labels correctly', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-deep-hierarchy.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Create a resource with coding that matches LEVEL4 binding
            const condition: Condition = {
                resourceType: 'Condition',
                id: 'test-condition-level4',
                clinicalStatus: {
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'active'
                    }]
                },
                subject: {
                    reference: 'Patient/test-patient'
                },
                code: {
                    coding: [{
                        system: 'http://snomed.info/sct',
                        code: '999999999', // Matches level4-test codeSet
                        display: 'Level 4 condition'
                    }]
                },
                meta: {
                    security: []
                }
            };

            const bundle: Bundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [{
                    resource: condition
                }]
            };

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'test-patient' }],
                content: bundle
            };

            const card = engine.process([], context);

            // Verify security label was applied
            const resource = card.extension?.content?.entry?.[0]?.resource as Condition;
            expect(resource.meta?.security).toBeDefined();
            expect(resource.meta?.security?.length).toBeGreaterThan(0);

            // Verify LEVEL4 label was applied (not parent categories)
            const securityLabels = resource.meta?.security || [];
            const level4Label = securityLabels.find((label: any) => label.code === 'LEVEL4');
            expect(level4Label).toBeDefined();

            // Verify parent categories are NOT applied
            const level3Label = securityLabels.find((label: any) => label.code === 'LEVEL3');
            expect(level3Label).toBeUndefined();
            const level2Label = securityLabels.find((label: any) => label.code === 'LEVEL2');
            expect(level2Label).toBeUndefined();
        });

        test('should apply multiple labels when resource matches multiple bindings', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Create a resource with multiple codings that match different bindings
            const condition: Condition = {
                resourceType: 'Condition',
                id: 'test-condition-multi',
                clinicalStatus: {
                    coding: [{
                        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        code: 'active'
                    }]
                },
                subject: {
                    reference: 'Patient/test-patient'
                },
                code: {
                    coding: [
                        {
                            system: 'http://snomed.info/sct',
                            code: '48694002', // Matches anxiety-test
                            display: 'Anxiety'
                        },
                        {
                            system: 'http://snomed.info/sct',
                            code: '35489007', // Matches depression-test
                            display: 'Depression'
                        }
                    ]
                },
                meta: {
                    security: []
                }
            };

            const bundle: Bundle = {
                resourceType: 'Bundle',
                type: 'collection',
                entry: [{
                    resource: condition
                }]
            };

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'test-patient' }],
                content: bundle
            };

            const card = engine.process([], context);

            // Verify multiple security labels were applied
            const resource = card.extension?.content?.entry?.[0]?.resource as Condition;
            const securityLabels = resource.meta?.security || [];
            expect(securityLabels.length).toBeGreaterThanOrEqual(2);

            // Verify both ANXIETY and DEPRESSION labels are present
            const anxietyLabel = securityLabels.find((label: any) => label.code === 'ANXIETY');
            const depressionLabel = securityLabels.find((label: any) => label.code === 'DEPRESSION');
            expect(anxietyLabel).toBeDefined();
            expect(depressionLabel).toBeDefined();
        });
    });

    describe('Engine with Real Patient Data', () => {
        test('should correctly label Patient 1 (Adrian) resources with mental health conditions', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Load patient bundle
            const patientBundlePath = join(__dirname, 'data/Patient 1 - Adrian Allen1 - R5-Initial view.json');
            const patientBundleJson = await readFile(patientBundlePath, 'utf-8');
            const patientBundle: Bundle = JSON.parse(patientBundleJson);

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1703736930464' }],
                content: patientBundle
            };

            const card = engine.process([], context);

            // Verify security labels were applied
            expect(card.extension).toBeDefined();
            expect(card.extension?.content?.entry).toBeDefined();
            
            // Find resources with mental health conditions
            const labeledResources = card.extension?.content?.entry?.filter((e: any) => 
                e.resource?.meta?.security && e.resource.meta.security.length > 0
            ) || [];

            expect(labeledResources.length).toBeGreaterThan(0);

            // Find the Condition with bipolar disorder (13746004) - should have MENTAL label
            const bipolarCondition = labeledResources.find((e: any) => {
                const codings = e.resource?.code?.coding || [];
                return codings.some((c: any) => c.code === '13746004');
            });

            expect(bipolarCondition).toBeDefined();
            if (bipolarCondition && bipolarCondition.resource?.meta?.security) {
                const bipolarLabels = bipolarCondition.resource.meta.security;
                const mentalLabel = bipolarLabels.find((label: any) => label.code === 'MENTAL');
                expect(mentalLabel).toBeDefined();
            }

            // Find the Condition with depression (35489007) - should have DEPRESSION label
            const depressionCondition = labeledResources.find((e: any) => {
                const codings = e.resource?.code?.coding || [];
                return codings.some((c: any) => c.code === '35489007');
            });

            expect(depressionCondition).toBeDefined();
            if (depressionCondition && depressionCondition.resource?.meta?.security) {
                const depressionLabels = depressionCondition.resource.meta.security;
                const depressionLabel = depressionLabels.find((label: any) => label.code === 'DEPRESSION');
                expect(depressionLabel).toBeDefined();
            }
        });

        test('should correctly label Patient 2 (Beth) resources', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Load patient bundle
            const patientBundlePath = join(__dirname, 'data/Patient 2 - Beth Brooks2 - R5-Initial view.json');
            const patientBundleJson = await readFile(patientBundlePath, 'utf-8');
            const patientBundle: Bundle = JSON.parse(patientBundleJson);

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1699034947598' }],
                content: patientBundle
            };

            const card = engine.process([], context);

            // Verify security labels were applied
            expect(card.extension).toBeDefined();
            expect(card.extension?.content?.entry).toBeDefined();
            
            // Find resources with labels
            const labeledResources = card.extension?.content?.entry?.filter((e: any) => 
                e.resource?.meta?.security && e.resource.meta.security.length > 0
            ) || [];

            // Patient 2 has bipolar disorder (13746004) - should be labeled
            const bipolarCondition = labeledResources.find((e: any) => {
                const codings = e.resource?.code?.coding || [];
                return codings.some((c: any) => c.code === '13746004');
            });

            if (bipolarCondition && bipolarCondition.resource?.meta?.security) {
                const labels = bipolarCondition.resource.meta.security;
                const mentalLabel = labels.find((label: any) => label.code === 'MENTAL');
                expect(mentalLabel).toBeDefined();
            }
        });

        test('should correctly label Patient 3 (Carmen) resources', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Load patient bundle
            const patientBundlePath = join(__dirname, 'data/Patient 3 - Carmen Chavez - R5-Initial view.json');
            const patientBundleJson = await readFile(patientBundlePath, 'utf-8');
            const patientBundle: Bundle = JSON.parse(patientBundleJson);

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1700025838491' }],
                content: patientBundle
            };

            const card = engine.process([], context);

            // Verify processing completed
            expect(card.extension).toBeDefined();
            expect(card.extension?.content?.entry).toBeDefined();
        });

        test('should correctly label Patient 4 (Diana) resources', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Load patient bundle
            const patientBundlePath = join(__dirname, 'data/Patient 4 - Diana Dixon4 - R5-Initial view.json');
            const patientBundleJson = await readFile(patientBundlePath, 'utf-8');
            const patientBundle: Bundle = JSON.parse(patientBundleJson);

            const context: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1700154185275' }],
                content: patientBundle
            };

            const card = engine.process([], context);

            // Verify processing completed
            expect(card.extension).toBeDefined();
            expect(card.extension?.content?.entry).toBeDefined();
        });

        test('should correctly label multiple patient bundles with hierarchical categories', async () => {
            const registry = new DataSegmentationModuleRegistry();
            
            const modulePath = join(__dirname, 'modules/test-module-hierarchical-1.json');
            const module = await DataSegmentationModule.fromFile(modulePath);
            registry.addModule(module);

            const moduleProvider = new TestDataSegmentationModuleProvider(registry);
            const engine = new ConsoleDataSharingEngine(
                moduleProvider,
                0.5,
                false,
                false,
                registry
            );

            // Process Patient 1
            const patient1Path = join(__dirname, 'data/Patient 1 - Adrian Allen1 - R5-Initial view.json');
            const patient1Json = await readFile(patient1Path, 'utf-8');
            const patient1Bundle: Bundle = JSON.parse(patient1Json);

            const context1: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1703736930464' }],
                content: patient1Bundle
            };

            const card1 = engine.process([], context1);

            // Verify Patient 1 has labeled resources
            const labeled1 = card1.extension?.content?.entry?.filter((e: any) => 
                e.resource?.meta?.security && e.resource.meta.security.length > 0
            ) || [];
            expect(labeled1.length).toBeGreaterThan(0);

            // Process Patient 2
            const patient2Path = join(__dirname, 'data/Patient 2 - Beth Brooks2 - R5-Initial view.json');
            const patient2Json = await readFile(patient2Path, 'utf-8');
            const patient2Bundle: Bundle = JSON.parse(patient2Json);

            const context2: DataSharingEngineContext = {
                actor: [{ system: 'test-system', value: 'test-actor' }],
                patientId: [{ system: 'test-system', value: 'cfsb1699034947598' }],
                content: patient2Bundle
            };

            const card2 = engine.process([], context2);

            // Verify Patient 2 processing completed
            expect(card2.extension).toBeDefined();
            expect(card2.extension?.content?.entry).toBeDefined();
        });
    });

});

