// Author: Preston Lee

import { Coding, ConsentProvision } from "fhir/r5.js";
import { InformationCategorySetting } from "./information_category_setting.js";

export class ConsentCategorySettings {

    // ComplyLight information categories
    substanceUse: InformationCategorySetting = new InformationCategorySetting('SUD', 'Substance Use', 'Records possibly pertaining to commonly abused stantances.');
    mentalHealth: InformationCategorySetting = new InformationCategorySetting('MENCAT', 'Mental Health', 'All manner of mental health and wellbeing information.');
    demographics: InformationCategorySetting = new InformationCategorySetting('DEMO', 'Demographics', 'General ethnic, social, and environmental background.');
    diagnoses: InformationCategorySetting = new InformationCategorySetting('DIA', 'Diagnoses', 'Medically recognized conditions you have experienced.');
    disabilities: InformationCategorySetting = new InformationCategorySetting('DIS', 'Disabilities', 'Physical or mental conditions limiting movement, sense, or activity.');
    genetics: InformationCategorySetting = new InformationCategorySetting('GDIS', 'Genetics', 'Genomic and molecular data that may indicate, for example, susceptability to heritable disease');
    infectiousDiseases: InformationCategorySetting = new InformationCategorySetting('DISEASE', 'Infectious Diseases', 'Past or present transmissible ailments.');
    medications: InformationCategorySetting = new InformationCategorySetting('DRGIS', 'Medications', 'Drugs prescribed to you.');
    sexualAndReproductive: InformationCategorySetting = new InformationCategorySetting('SEX', 'Sexual & Reproductive Health', 'Information related to sexuality and reproductive health.');
    socialDeterminants: InformationCategorySetting = new InformationCategorySetting('SOCIAL', 'Social Determinents of Health', 'Environmental and contextual factors that may impact your health.');
    violence: InformationCategorySetting = new InformationCategorySetting('VIO', 'Violence', 'Indicators of possible physical or mental harm by violence.');

    // ComplyLight information sharing purposes
    treatment: InformationCategorySetting = new InformationCategorySetting(
        InformationCategorySetting.ACT_CODE_TREATMENT_CODE,
        InformationCategorySetting.ACT_CODE_TREATMENT_NAME,
        InformationCategorySetting.ACT_CODE_TREATMENT_DISPLAY);
    research: InformationCategorySetting = new InformationCategorySetting(
        InformationCategorySetting.ACT_CODE_RESEARCH_CODE,
        InformationCategorySetting.ACT_CODE_RESEARCH_NAME,
        InformationCategorySetting.ACT_CODE_RESEARCH_DISPLAY);

    
    categoryForCode(code: string): InformationCategorySetting | null {
        let cat = null;
        this.allCategories().forEach(c => {
            if (c.act_code == code) {
                cat = c;
            }
        });
        return cat;
    }

    // nameForCode(code: string): string {
    //     let cat = this.categoryForCode(code);
    //     if (cat) {
    //         return cat.name;
    //     } else {
    //         return '';
    //     }
    // }

    allCategories(): InformationCategorySetting[] {
        return [
            this.substanceUse,
            this.mentalHealth,
            this.demographics,
            this.diagnoses,
            this.disabilities,
            this.genetics,
            this.infectiousDiseases,
            this.medications,
            this.sexualAndReproductive,
            this.socialDeterminants,
            this.violence];
    }

    allPurposes(): InformationCategorySetting[] {
        return [
            this.treatment,
            this.research
        ];
    }

    applyCategoryCodings(codings: Coding[]) {
        codings.forEach(c => {
            this.applyCategoryCoding(c);
        });
    }

    applyCategoryCoding(coding: Coding) {
        this.allCategories().forEach(c => {
            if (c.act_code == coding.code) {
                c.enabled = true;
            }
        });
    }


    applyPurposeCodings(codings: Coding[]) {
        codings.forEach(c => {
            this.applyPurposeCoding(c);
        });
    }

    applyPurposeCoding(coding: Coding) {
        this.allPurposes().forEach(c => {
            if (c.act_code == coding.code) {
                c.enabled = true;
            }
        });
    }

    updateConsentProvisionCategory(provision: ConsentProvision, category: InformationCategorySetting) {
        if (category.enabled) {
            let found = false;
            provision?.securityLabel!.forEach(sl => {
                if (category.act_code == sl.code) {
                    found = true;
                }
            });
            if (!found) {
                console.log("ENABLING CATEGORY: " + category.act_code);
                provision?.securityLabel!.push({ code: category.act_code, system: category.system, display: category.description });
            }
        } else { // disabled
            let foundAt = -1;
            for (let i = 0; i < provision!.securityLabel!.length; i++) {
                if (category.act_code == provision!.securityLabel![i].code) {
                    foundAt = i;
                }
                if (foundAt >= 0) {
                    console.log("DISABLING CATEGORY: " + category.act_code);
                    provision?.securityLabel?.splice(foundAt, 1);
                }
            }
        }
    }

    updateConsentProvisionPurpose(provision: ConsentProvision, category: InformationCategorySetting) {
        if (category.enabled) {
            let found = false;
            provision?.purpose!.forEach(pur => {
                if (category.act_code == pur.code) {
                    found = true;
                }
            });
            if (!found) {
                console.log("ENABLING PURPOSE: " + category.act_code);
                provision?.purpose?.push({ code: category.act_code, system: category.system, display: category.description });
            }
        } else { // disabled
            let foundAt = -1;
            for (let i = 0; i < provision!.purpose!.length; i++) {
                if (category.act_code == provision!.purpose![i].code) {
                    foundAt = i;
                }
                if (foundAt >= 0) {
                    console.log("DISABLING PURPOSE: " + category.act_code);
                    provision?.purpose?.splice(foundAt, 1);
                }
            }
        }
    }

    loadCategoriesFromConsentProvision(provision: ConsentProvision) {
        if (!provision.securityLabel) {
            provision.securityLabel = [];
        }
        this.allCategories().forEach(c => {
            c.enabled = false;
        });
        this.applyCategoryCodings(provision.securityLabel);
    }

    loadPurposesFromConsentProvision(provision: ConsentProvision) {
        if (!provision.purpose) {
            provision.purpose = [];
        }
        this.allPurposes().forEach(c => {
            c.enabled = false;
        });
        this.applyPurposeCodings(provision.purpose);
    }

    loadAllFromConsentProvision(provision: ConsentProvision) {
        this.loadCategoriesFromConsentProvision(provision);
        this.loadPurposesFromConsentProvision(provision);
    }

    updateConsentProvision(provision: ConsentProvision) {
        provision.securityLabel = [];
        provision.purpose = [];
        this.allCategories().forEach(c => {
            this.updateConsentProvisionCategory(provision, c);
        });

        this.allPurposes().forEach(c => {
            this.updateConsentProvisionPurpose(provision, c);
        });
    }
}