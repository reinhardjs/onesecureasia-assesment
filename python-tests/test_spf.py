#!/usr/bin/env python3
"""
SPF Record Testing Script
Tests for the presence and configuration of SPF records
"""

import sys
import json
import dns.resolver
import re
from typing import Dict, Any, List

def test_spf(domain: str) -> Dict[str, Any]:
    """
    Test SPF record for a domain
    
    Args:
        domain: Domain name to test
        
    Returns:
        Dictionary containing SPF test results
    """
    result = {
        'domain': domain,
        'has_spf': False,
        'record': None,
        'mechanism': None,
        'includes': [],
        'ip4_addresses': [],
        'ip6_addresses': [],
        'mx_records': False,
        'all_mechanism': None,
        'errors': [],
        'warnings': []
    }
    
    try:
        # Query for TXT records
        answers = dns.resolver.resolve(domain, 'TXT')
        
        spf_records = []
        for answer in answers:
            record = answer.to_text().strip('"')
            
            # Check if this is an SPF record
            if record.startswith('v=spf1'):
                spf_records.append(record)
        
        # Validate number of SPF records
        if len(spf_records) == 0:
            result['errors'].append("No SPF record found")
        elif len(spf_records) > 1:
            result['errors'].append("Multiple SPF records found (RFC violation)")
            result['warnings'].append("Only the first SPF record will be processed")
        
        if spf_records:
            result['has_spf'] = True
            spf_record = spf_records[0]
            result['record'] = spf_record
            
            # Parse SPF mechanisms
            mechanisms = spf_record.split()
            for mechanism in mechanisms[1:]:  # Skip 'v=spf1'
                mechanism = mechanism.strip()
                
                if mechanism.startswith('include:'):
                    result['includes'].append(mechanism[8:])
                elif mechanism.startswith('ip4:'):
                    result['ip4_addresses'].append(mechanism[4:])
                elif mechanism.startswith('ip6:'):
                    result['ip6_addresses'].append(mechanism[4:])
                elif mechanism == 'mx':
                    result['mx_records'] = True
                elif mechanism in ['~all', '-all', '+all', '?all']:
                    result['all_mechanism'] = mechanism
                elif mechanism.startswith('a:') or mechanism == 'a':
                    # A record mechanism
                    pass
                elif mechanism.startswith('exists:'):
                    # Exists mechanism
                    pass
                else:
                    result['warnings'].append(f"Unknown or complex mechanism: {mechanism}")
            
            result['mechanism'] = ' '.join(mechanisms)
            
            # Validate SPF record
            if not result['all_mechanism']:
                result['warnings'].append("No 'all' mechanism found - this may allow unauthorized senders")
            elif result['all_mechanism'] == '+all':
                result['warnings'].append("SPF record allows all senders (+all) - this provides no protection")
            elif result['all_mechanism'] == '?all':
                result['warnings'].append("SPF record uses neutral policy (?all) - consider using ~all or -all")
            
            # Check for common issues
            if len(result['includes']) > 10:
                result['warnings'].append("Too many includes may cause DNS lookup limit issues")
                
    except dns.resolver.NXDOMAIN:
        result['errors'].append(f"Domain {domain} does not exist")
    except dns.resolver.NoAnswer:
        result['errors'].append(f"No TXT records found for {domain}")
    except Exception as e:
        result['errors'].append(f"Error querying SPF record: {str(e)}")
    
    result['test_timestamp'] = __import__('datetime').datetime.now().isoformat()
    result['test_type'] = 'spf'
    
    return result

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python test_spf.py <domain>'}))
        sys.exit(1)
    
    domain = sys.argv[1].strip().lower()
    
    # Validate domain format
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$', domain):
        print(json.dumps({'error': 'Invalid domain format'}))
        sys.exit(1)
    
    try:
        result = test_spf(domain)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': f'Test execution failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
