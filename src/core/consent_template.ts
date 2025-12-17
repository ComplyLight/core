// Author: Preston Lee

import { Consent, ConsentProvision } from 'fhir/r5.js';
import { v4 as uuidv4 } from 'uuid';
import { InformationCategorySetting } from './information_category_setting.js';
import { DataSegmentationModuleRegistry } from './data_segmentation_module_registry.js';

export class ConsentTemplate {


  static templateConsent() {
    let c: Consent = {
      resourceType: 'Consent',
      status: 'active',
      decision: 'permit',
      category: [
        {
          id: uuidv4(),
          text: 'Privacy Consent',
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/consentscope",
              "code": "patient-privacy",
              "display": "Privacy Consent"
            }
          ]
        },
        {
          id: uuidv4(),
          text: 'LOINC Consent Document',
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "59284-6",
              "display": 'Consent Document'
            }
          ]
        }
      ],
      // grantor: [],
      controller: [],
      provision: [ConsentTemplate.templateProvision()]
    };
    return c;
  }


  /**
   * Create a template provision, optionally using purposes from a module registry.
   * @param moduleRegistry - Optional module registry to get purposes from
   * @returns A template ConsentProvision
   */
  static templateProvision(moduleRegistry?: DataSegmentationModuleRegistry): ConsentProvision {
    let cp = {
      id: uuidv4(),
      actor: [{
        reference: {
          reference: ''
        },
        role: {
          coding: [
            {
              "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
              "code": "IRCP"
            }
          ]
        }
      }],
      action: [{
        coding: [
          {
            "system": "http://terminology.hl7.org/CodeSystem/consentaction",
            "code": "access"
          }
        ]
      }],
      // securityLabel: [],
      purpose: [] as any[]
    }
    
    if (moduleRegistry) {
      // Use purposes from enabled modules in registry
      const purposes = moduleRegistry.getAllPurposes();
      cp.purpose = purposes.map(p => ({
        system: p.system,
        code: p.act_code,
        display: p.description
      }));
    } else {
      // Use static defaults for backward compatibility
      cp.purpose = [
        {
          "system": InformationCategorySetting.ACT_CODE_SYSTEM,
          "code": InformationCategorySetting.ACT_CODE_RESEARCH_CODE,
          "display": InformationCategorySetting.ACT_CODE_RESEARCH_DISPLAY
        },
        {
          "system": InformationCategorySetting.ACT_CODE_SYSTEM,
          "code": InformationCategorySetting.ACT_CODE_TREATMENT_CODE,
          "display": InformationCategorySetting.ACT_CODE_TREATMENT_DISPLAY
        }
      ];
    }
    
    return cp;
  }

}