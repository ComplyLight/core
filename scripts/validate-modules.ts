// Author: Auto-generated
import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Paths to schema and modules
const schemaPath = join(rootDir, 'build', 'src', 'assets', 'schemas', 'data-segmentation-module.schema.json');
const modulesDir = join(rootDir, 'build', 'src', 'assets', 'modules');

// Initialize AJV with format support
const ajv = new Ajv({ allErrors: true, strict: false });
// @ts-expect-error - ajv-formats default export is a function but types may not be perfect
addFormats(ajv);

// Load schema
let schema: Record<string, unknown>;
try {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  schema = JSON.parse(schemaContent) as Record<string, unknown>;
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error loading schema from ${schemaPath}:`, errorMessage);
  process.exit(1);
}

// Compile validator
const validate = ajv.compile(schema);

// Get all default module files
let moduleFiles: string[];
try {
  moduleFiles = readdirSync(modulesDir)
    .filter((file: string) => file.startsWith('default-') && file.endsWith('.module.json'))
    .sort();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Error reading modules directory ${modulesDir}:`, errorMessage);
  process.exit(1);
}

if (moduleFiles.length === 0) {
  console.error(`No default module files found in ${modulesDir}`);
  process.exit(1);
}

console.log(`Validating ${moduleFiles.length} module(s) against schema...\n`);

let hasErrors = false;

// Validate each module
for (const moduleFile of moduleFiles) {
  const modulePath = join(modulesDir, moduleFile);
  console.log(`Validating ${moduleFile}...`);
  
  let moduleData: unknown;
  try {
    const moduleContent = readFileSync(modulePath, 'utf-8');
    moduleData = JSON.parse(moduleContent) as unknown;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Error reading/parsing ${moduleFile}:`, errorMessage);
    hasErrors = true;
    continue;
  }
  
  const valid = validate(moduleData);
  
  if (valid) {
    console.log(`  ✅ ${moduleFile} is valid\n`);
  } else {
    console.error(`  ❌ ${moduleFile} is invalid:`);
    if (validate.errors) {
      validate.errors.forEach((error: { instancePath?: string; message?: string; params?: Record<string, unknown> }, index: number) => {
        console.error(`    ${index + 1}. ${error.instancePath || '/'}: ${error.message}`);
        if (error.params) {
          const params = Object.entries(error.params)
            .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
            .join(', ');
          if (params) {
            console.error(`       (${params})`);
          }
        }
      });
    }
    console.error('');
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('Validation failed. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ All modules validated successfully!');
  process.exit(0);
}

