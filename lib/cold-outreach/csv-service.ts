/**
 * CSV Processing Service
 *
 * Enterprise-grade service for processing and validating CSV files
 * for cold outreach contact management
 *
 * ## Features
 * - CSV file parsing and validation
 * - Header normalization and mapping
 * - Data validation and sanitization
 * - Duplicate detection and handling
 *
 * ## Security
 * - Input sanitization to prevent injection attacks
 * - Email validation for all contacts
 * - File size limits (default 10,000 rows)
 * - Required field validation
 *
 * ## Performance
 * - Caching of validation results (30 minutes)
 * - Header normalization caching (1 hour)
 * - Efficient parsing algorithms
 * - Memory-optimized processing
 */

import { csvValidationCache, csvHeaderCache } from '@/lib/cold-outreach/cache-utils';
import { createHash } from 'crypto';
import { sanitizeInput, isValidEmail as isEmailValid } from '@/lib/cold-outreach/security-utils';

export interface CSVContact {
  name: string;
  email: string;
  role?: string;
  company?: string;
  [key: string]: string | undefined;
}

export interface CSVValidationResult {
  isValid: boolean;
  contacts: CSVContact[];
  errors: string[];
  warnings: string[];
}

export interface CSVProcessingOptions {
  requiredFields?: string[];
  emailValidation?: boolean;
  duplicateCheck?: boolean;
  maxRows?: number;
}

/**
 * Process and validate CSV data
 * @param data Parsed CSV data as array of objects
 * @param options Processing options
 * @returns Promise<CSVValidationResult> Validation result
 */
export async function processCSVData(
  data: Record<string, string>[], 
  options: CSVProcessingOptions = {}
): Promise<CSVValidationResult> {
  const {
    requiredFields = ['name', 'email'],
    emailValidation = true,
    duplicateCheck = true,
    maxRows = 10000
  } = options;
  
  // Sanitize data and options
  const sanitizedData = data.map(row => {
    const sanitizedRow: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      sanitizedRow[sanitizeInput(key)] = sanitizeInput(value);
    });
    return sanitizedRow;
  });
  
  const sanitizedOptions = {
    requiredFields: requiredFields.map(field => sanitizeInput(field)),
    emailValidation,
    duplicateCheck,
    maxRows
  };
  
  // Create cache key based on data content and options
  const dataHash = createHash('md5').update(JSON.stringify(sanitizedData)).digest('hex');
  const optionsHash = createHash('md5').update(JSON.stringify(sanitizedOptions)).digest('hex');
  const cacheKey = `csv_process:${dataHash}:${optionsHash}`;
  
  // Check cache first
  const cachedResult = csvValidationCache.get(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for CSV processing');
    return cachedResult as CSVValidationResult;
  }
  
  const result: CSVValidationResult = {
    isValid: true,
    contacts: [],
    errors: [],
    warnings: []
  };
  
  // Check if data exceeds maximum rows
  if (sanitizedData.length > maxRows) {
    result.errors.push(`CSV file exceeds maximum row limit of ${maxRows}`);
    result.isValid = false;
    csvValidationCache.set(cacheKey, result, 30 * 60 * 1000); // Cache for 30 minutes
    return result;
  }
  
  // Process each row
  const processedContacts: CSVContact[] = [];
  const emailSet = new Set<string>();
  
  for (let i = 0; i < sanitizedData.length; i++) {
    const row = sanitizedData[i];
    const rowIndex = i + 1; // 1-based index for user-friendly error messages
    
    // Check required fields
    for (const field of sanitizedOptions.requiredFields) {
      if (!row[field] || row[field].trim() === '') {
        result.errors.push(`Row ${rowIndex}: Missing required field '${field}'`);
        result.isValid = false;
      }
    }
    
    // Validate email if required
    if (emailValidation && row.email) {
      if (!isValidEmail(row.email)) {
        result.errors.push(`Row ${rowIndex}: Invalid email format '${row.email}'`);
        result.isValid = false;
      }
    }
    
    // Check for duplicates if required
    if (duplicateCheck && row.email) {
      const email = row.email.toLowerCase().trim();
      if (emailSet.has(email)) {
        result.warnings.push(`Row ${rowIndex}: Duplicate email '${row.email}'`);
      } else {
        emailSet.add(email);
      }
    }
    
    // Create contact object
    const contact: CSVContact = {
      name: row.name?.trim() || '',
      email: row.email?.trim() || '',
      role: row.role?.trim(),
      company: row.company?.trim()
    };
    
    // Add any additional fields
    Object.keys(row).forEach(key => {
      if (!['name', 'email', 'role', 'company'].includes(key)) {
        contact[key] = row[key]?.trim();
      }
    });
    
    processedContacts.push(contact);
  }
  
  result.contacts = processedContacts;
  
  // Cache the result for 30 minutes
  csvValidationCache.set(cacheKey, result, 30 * 60 * 1000);
  
  return result;
}

/**
 * Validate email format
 * @param email Email address to validate
 * @returns boolean True if valid
 */
function isValidEmail(email: string): boolean {
  return isEmailValid(email);
}

/**
 * Normalize CSV headers
 * @param headers Array of header names
 * @returns string[] Normalized headers
 */
export function normalizeHeaders(headers: string[]): string[] {
  // Sanitize headers
  const sanitizedHeaders = headers.map(header => sanitizeInput(header));
  
  // Create cache key for normalized headers
  const headersKey = `normalize:${sanitizedHeaders.join(',')}`;
  const cachedResult = csvHeaderCache.get(headersKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  const result = sanitizedHeaders.map(header => {
    // Convert to lowercase and replace spaces/underscores with standardized names
    const normalized = header.toLowerCase().trim();
    
    // Map common variations to standard field names
    switch (normalized) {
      case 'full name':
      case 'full_name':
      case 'contact name':
      case 'contact_name':
        return 'name';
      case 'email address':
      case 'email_address':
      case 'e-mail':
        return 'email';
      case 'job title':
      case 'job_title':
      case 'position':
        return 'role';
      case 'company name':
      case 'company_name':
      case 'organization':
        return 'company';
      default:
        return normalized.replace(/[^a-z0-9]/g, '');
    }
  });
  
  // Cache the result for 1 hour
  csvHeaderCache.set(headersKey, result, 60 * 60 * 1000);
  
  return result;
}

/**
 * Parse CSV file content
 * @param file CSV file
 * @returns Promise<Record<string, string>[]> Parsed data
 */
export function parseCSVFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedData = parseCSVContent(content);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Parse CSV content string
 * @param content CSV content as string
 * @returns Record<string, string>[] Parsed data
 */
import Papa from 'papaparse';

function parseCSVContent(content: string): Record<string, string>[] {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normalizeHeaders([header])[0],
    transform: (value) => sanitizeInput(value)
  });
  
  if (result.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
  
  return result.data as Record<string, string>[];
}
// Export all functions as named exports instead of default export
// This fixes the ESLint warning: "Assign object to a variable before exporting as module default"
