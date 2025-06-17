#!/usr/bin/env python3
"""
DMARC Record Testing Script
Tests for the presence and configuration of DMARC records
"""

import sys
import json
import dns.resolver
import re
from typing import Dict, Any

def test_dmarc(domain: str) -> Dict[str, Any]:
    """
    Test DMARC record for a domain
    
    Args:
        domain: Domain name to test
        
    Returns:
        Dictionary containing DMARC test results
    """
    result = {
        'domain': domain,
        'has_dmarc': False,
        'record': None,
        'policy': None,
        'subdomain_policy': None,
        'rua': None,
        'ruf': None,
        'percentage': None,
        'alignment_spf': None,
        'alignment_dkim': None,
        'errors': []
    }
    
    try:
        # Query for DMARC record at _dmarc.domain
        dmarc_domain = f"_dmarc.{domain}"
        answers = dns.resolver.resolve(dmarc_domain, 'TXT')
        
        for answer in answers:
            record = answer.to_text().strip('"')
            
            # Check if this is a DMARC record
            if record.startswith('v=DMARC1'):
                result['has_dmarc'] = True
                result['record'] = record
                
                # Parse DMARC record components
                components = record.split(';')
                for component in components:
                    component = component.strip()
                    if component.startswith('p='):
                        result['policy'] = component.split('=')[1]
                    elif component.startswith('sp='):
                        result['subdomain_policy'] = component.split('=')[1]
                    elif component.startswith('rua='):
                        result['rua'] = component.split('=')[1]
                    elif component.startswith('ruf='):
                        result['ruf'] = component.split('=')[1]
                    elif component.startswith('pct='):
                        result['percentage'] = int(component.split('=')[1])
                    elif component.startswith('aspf='):
                        result['alignment_spf'] = component.split('=')[1]
                    elif component.startswith('adkim='):
                        result['alignment_dkim'] = component.split('=')[1]
                
                break
                
    except dns.resolver.NXDOMAIN:
        result['errors'].append(f"Domain {domain} does not exist")
    except dns.resolver.NoAnswer:
        result['errors'].append(f"No DMARC record found for {domain}")
    except Exception as e:
        result['errors'].append(f"Error querying DMARC record: {str(e)}")
    
    # Validate DMARC policy
    if result['has_dmarc']:
        if result['policy'] not in ['none', 'quarantine', 'reject']:
            result['errors'].append(f"Invalid DMARC policy: {result['policy']}")
        
        # Check for reporting addresses
        if not result['rua'] and not result['ruf']:
            result['errors'].append("No reporting addresses configured (rua or ruf)")
    
    result['test_timestamp'] = __import__('datetime').datetime.now().isoformat()
    result['test_type'] = 'dmarc'
    
    return result

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python test_dmarc.py <domain>'}))
        sys.exit(1)
    
    domain = sys.argv[1].strip().lower()
    
    # Validate domain format
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$', domain):
        print(json.dumps({'error': 'Invalid domain format'}))
        sys.exit(1)
    
    try:
        result = test_dmarc(domain)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': f'Test execution failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
