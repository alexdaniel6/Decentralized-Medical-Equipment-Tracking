import { describe, it, expect, beforeEach } from 'vitest';

// Mock data structures
const mockComplianceCertificates = new Map();
const mockComplianceStandards = new Map();
const currentTime = 1640995200; // Jan 1, 2022

// Mock contract functions
const registerStandard = (standardId, name, description, version, requiredRenewalDays) => {
  mockComplianceStandards.set(standardId, {
    name,
    description,
    version,
    'required-renewal-days': requiredRenewalDays
  });
  
  return { success: true };
};

const issueCertificate = (deviceId, standardId, validityDays, certificateHash) => {
  if (!mockComplianceStandards.has(standardId)) {
    return { success: false, error: 2 };
  }
  
  const key = `${deviceId}-${standardId}`;
  mockComplianceCertificates.set(key, {
    'issue-date': currentTime,
    'expiry-date': currentTime + (validityDays * 86400),
    issuer: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    'certificate-hash': certificateHash,
    status: 'valid'
  });
  
  return { success: true };
};

const revokeCertificate = (deviceId, standardId) => {
  const key = `${deviceId}-${standardId}`;
  
  if (!mockComplianceCertificates.has(key)) {
    return { success: false, error: 1 };
  }
  
  const certificate = mockComplianceCertificates.get(key);
  certificate.status = 'revoked';
  mockComplianceCertificates.set(key, certificate);
  
  return { success: true };
};

const getCertificate = (deviceId, standardId) => {
  const key = `${deviceId}-${standardId}`;
  return mockComplianceCertificates.get(key) || null;
};

const getStandard = (standardId) => {
  return mockComplianceStandards.get(standardId) || null;
};

describe('Compliance Verifier Contract', () => {
  beforeEach(() => {
    mockComplianceCertificates.clear();
    mockComplianceStandards.clear();
  });
  
  it('should register a compliance standard', () => {
    const result = registerStandard(
        'ISO13485',
        'Medical devices - Quality management systems',
        'Requirements for regulatory purposes for medical device manufacturers',
        '2016',
        365 // Annual renewal
    );
    
    expect(result.success).toBe(true);
    
    const standard = getStandard('ISO13485');
    expect(standard).not.toBeNull();
    expect(standard.name).toBe('Medical devices - Quality management systems');
    expect(standard.version).toBe('2016');
    expect(standard['required-renewal-days']).toBe(365);
  });
  
  it('should issue a compliance certificate', () => {
    // First register a standard
    registerStandard(
        'ISO13485',
        'Medical devices - Quality management systems',
        'Requirements for regulatory purposes',
        '2016',
        365
    );
    
    // Then issue a certificate
    const result = issueCertificate(
        1,
        'ISO13485',
        365,
        Buffer.from('certificate-hash-value', 'utf-8')
    );
    
    expect(result.success).toBe(true);
    
    // Verify the certificate
    const certificate = getCertificate(1, 'ISO13485');
    expect(certificate).not.toBeNull();
    expect(certificate['issue-date']).toBe(currentTime);
    expect(certificate['expiry-date']).toBe(currentTime + (365 * 86400));
    expect(certificate.status).toBe('valid');
  });
  
  it('should revoke a compliance certificate', () => {
    // Register standard and issue certificate
    registerStandard('ISO13485', 'Medical devices', 'Description', '2016', 365);
    issueCertificate(1, 'ISO13485', 365, Buffer.from('hash', 'utf-8'));
    
    // Revoke the certificate
    const result = revokeCertificate(1, 'ISO13485');
    expect(result.success).toBe(true);
    
    // Verify the certificate was revoked
    const certificate = getCertificate(1, 'ISO13485');
    expect(certificate.status).toBe('revoked');
  });
  
  it('should fail to issue certificate for non-existent standard', () => {
    const result = issueCertificate(
        1,
        'NONEXISTENT',
        365,
        Buffer.from('hash', 'utf-8')
    );
    
    expect(result.success).toBe(false);
  });
});
