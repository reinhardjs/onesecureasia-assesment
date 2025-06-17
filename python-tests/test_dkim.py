#!/usr/bin/env python3
"""
DKIM Testing Script
Tests for the presence and validity of DKIM records
"""

import sys
import json
import dns.resolver
import re
from typing import Dict, Any

def test_dkim(domain: str) -> Dict[str, Any]:
    """
    Test DKIM records for a domain
    
    Args:
        domain: Domain name to test
        
    Returns:
        Dictionary containing DKIM test results
    """
    result = {
        'domain': domain,
        'has_dkim': False,
        'selectors_found': [],
        'records': {},
        'signature_valid': None,
        'key_type': None,
        'key_length': None,
        'errors': [],
        'warnings': []
    }
    
    # Common DKIM selectors to test
    common_selectors = [
        'default', 'google', 'gmail', 'outlook', 'mail', 
        'smtp', 'dkim', 'selector1', 'selector2', 'k1', 'k2',
        'mx', 'mta', 'server1', 'server2', '20220613', 'mandatory',
        'everlytickey1', 'everlytickey2', 's1', 's2', 'dk1', 'dk2'
    ]
    
    try:
        # Create custom resolver with longer timeout
        resolver = dns.resolver.Resolver()
        resolver.timeout = 10
        resolver.lifetime = 10
        
        # Try with Google DNS if needed
        try_google_dns = False
        
        for selector in common_selectors:
            try:
                dkim_domain = f"{selector}._domainkey.{domain}"
                
                if try_google_dns:
                    resolver.nameservers = ['8.8.8.8', '8.8.4.4']
                
                answers = resolver.resolve(dkim_domain, 'TXT')
                
                for answer in answers:
                    record = answer.to_text().strip('"')
                    
                    # Check if this is a DKIM record
                    if 'k=' in record or 'p=' in record:
                        result['has_dkim'] = True
                        result['selectors_found'].append(selector)
                        result['records'][selector] = record
                        
                        # Parse DKIM record components
                        components = record.split(';')
                        for component in components:
                            component = component.strip()
                            if component.startswith('k='):
                                result['key_type'] = component.split('=')[1]
                            elif component.startswith('p='):
                                public_key = component.split('=')[1]
                                if public_key:
                                    result['signature_valid'] = True
                                    # Estimate key length (rough approximation)
                                    if len(public_key) > 300:
                                        result['key_length'] = '2048+'
                                    elif len(public_key) > 200:
                                        result['key_length'] = '1024+'
                                    else:
                                        result['key_length'] = 'Unknown'
                                else:
                                    result['signature_valid'] = False
                                    result['warnings'].append(f"Empty public key in selector {selector}")
                        
                        break
                        
            except dns.resolver.NXDOMAIN:
                # Expected for non-existent selectors
                continue
            except dns.resolver.NoAnswer:
                # Expected for selectors without TXT records
                continue
            except dns.resolver.Timeout:
                # Try with Google DNS for the next attempts
                if not try_google_dns:
                    try_google_dns = True
                    result['warnings'].append(f"DNS timeout, switching to Google DNS for reliability")
                    # Retry this selector with Google DNS
                    try:
                        dkim_domain = f"{selector}._domainkey.{domain}"
                        resolver.nameservers = ['8.8.8.8', '8.8.4.4']
                        answers = resolver.resolve(dkim_domain, 'TXT')
                        
                        # Check answers as before
                        for answer in answers:
                            record = answer.to_text().strip('"')
                            
                            # Check if this is a DKIM record
                            if 'k=' in record or 'p=' in record:
                                result['has_dkim'] = True
                                result['selectors_found'].append(selector)
                                result['records'][selector] = record
                                
                                # Parse DKIM record components as before
                                components = record.split(';')
                                for component in components:
                                    component = component.strip()
                                    if component.startswith('k='):
                                        result['key_type'] = component.split('=')[1]
                                    elif component.startswith('p='):
                                        public_key = component.split('=')[1]
                                        if public_key:
                                            result['signature_valid'] = True
                                            # Estimate key length (rough approximation)
                                            if len(public_key) > 300:
                                                result['key_length'] = '2048+'
                                            elif len(public_key) > 200:
                                                result['key_length'] = '1024+'
                                            else:
                                                result['key_length'] = 'Unknown'
                                        else:
                                            result['signature_valid'] = False
                                            result['warnings'].append(f"Empty public key in selector {selector}")
                                
                                break
                    except:
                        # If retry fails, continue to next selector
                        continue
                else:
                    continue
            except Exception as e:
                result['warnings'].append(f"Error checking selector {selector}: {str(e)}")
                continue
        
        if not result['has_dkim']:
            result['errors'].append("No DKIM records found with common selectors")
            result['warnings'].append("DKIM may be configured with custom selectors not tested")
        
        # Additional validation
        if result['has_dkim']:
            if result['key_type'] and result['key_type'] not in ['rsa', 'ed25519']:
                result['warnings'].append(f"Unusual key type: {result['key_type']}")
            
            if len(result['selectors_found']) > 3:
                result['warnings'].append("Multiple DKIM selectors found - ensure they are all valid")
                
    except dns.resolver.NXDOMAIN:
        result['errors'].append(f"Domain {domain} does not exist")
    except Exception as e:
        result['errors'].append(f"Error testing DKIM: {str(e)}")
    
    result['test_timestamp'] = __import__('datetime').datetime.now().isoformat()
    result['test_type'] = 'dkim'
    
    return result

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python test_dkim.py <domain>'}))
        sys.exit(1)
    
    domain = sys.argv[1].strip().lower()
    
    # Validate domain format
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$', domain):
        print(json.dumps({'error': 'Invalid domain format'}))
        sys.exit(1)
    
    try:
        result = test_dkim(domain)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': f'Test execution failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
