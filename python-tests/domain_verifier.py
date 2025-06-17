#!/usr/bin/env python3
"""
Domain Security Test Verification Script
Tests multiple well-known domains to find ones that pass all security tests
"""

import sys
import json
import subprocess
from typing import Dict, List, Any
import time

# List of domains to test - smaller set with known well-configured domains
TEST_DOMAINS = [
    'tisax.de',      # German certification body with perfect email security
    'google.com',    # Excellent DMARC/SPF/DKIM setup
    'facebook.com',  # Strong security configuration 
    'protonmail.ch', # Secure email provider with excellent security
    'atriscapital.com' # Financial firm with perfect email security
]

def run_test(script_name: str, domain: str) -> Dict[str, Any]:
    """Run a single security test for a domain"""
    try:
        result = subprocess.run(
            [sys.executable, script_name, domain],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {
                    "error": "Invalid JSON output",
                    "raw_output": result.stdout,
                    "stderr": result.stderr
                }
        else:
            return {
                "error": f"Test failed with exit code {result.returncode}",
                "stdout": result.stdout,
                "stderr": result.stderr
            }
    except subprocess.TimeoutExpired:
        return {"error": "Test timed out after 30 seconds"}
    except Exception as e:
        return {"error": f"Failed to run test: {str(e)}"}

def run_all_tests_for_domain(domain: str) -> Dict[str, Dict[str, Any]]:
    """Run all security tests for a single domain"""
    tests = [
        ('test_dmarc.py', 'dmarc'),
        ('test_spf.py', 'spf'),
        ('test_dkim.py', 'dkim'),
        ('test_mail_server.py', 'mail_server')
    ]
    
    results = {}
    
    print(f"\nTesting domain: {domain}")
    print("=" * 40)
    
    for script, test_name in tests:
        print(f"Running {test_name} test...")
        test_result = run_test(script, domain)
        results[test_name] = test_result
        
        # Print abbreviated results
        if test_name == 'dmarc':
            if test_result.get('has_dmarc'):
                print(f"- DMARC: {'✅' if test_result.get('policy') == 'reject' else '⚠️'} (Policy: {test_result.get('policy')})")
            else:
                print("- DMARC: ❌ Not configured")
                
        elif test_name == 'spf':
            if test_result.get('has_spf'):
                print(f"- SPF: {'✅' if test_result.get('all_mechanism') == '-all' else '⚠️'} (Mechanism: {test_result.get('all_mechanism')})")
            else:
                print("- SPF: ❌ Not configured")
                
        elif test_name == 'dkim':
            if test_result.get('has_dkim'):
                print(f"- DKIM: {'✅' if test_result.get('signature_valid') else '⚠️'} (Selectors: {', '.join(test_result.get('selectors_found', []))})")
            else:
                print("- DKIM: ❌ Not detected")
                
        elif test_name == 'mail_server':
            if test_result.get('smtp_accessible'):
                print(f"- Mail Server: {'✅' if test_result.get('supports_tls') and test_result.get('supports_auth') else '⚠️'}")
                print(f"  TLS: {'✅' if test_result.get('supports_tls') else '❌'}")
                print(f"  AUTH: {'✅' if test_result.get('supports_auth') else '❌'}")
            else:
                print("- Mail Server: ❌ Not accessible")
        
        # Add a small delay to prevent overwhelming remote servers
        time.sleep(1)  
    
    # Calculate overall status based on rules in security-evaluator.js
    is_dmarc_pass = results['dmarc'].get('has_dmarc') and results['dmarc'].get('policy') == 'reject'
    is_spf_pass = results['spf'].get('has_spf') and results['spf'].get('all_mechanism') == '-all'
    is_dkim_pass = results['dkim'].get('has_dkim') and results['dkim'].get('signature_valid')
    is_mail_pass = results['mail_server'].get('smtp_accessible') and results['mail_server'].get('supports_tls') and results['mail_server'].get('supports_auth')
    
    total_tests = 4
    passed_tests = sum([is_dmarc_pass, is_spf_pass, is_dkim_pass, is_mail_pass])
    
    print("\nSecurity Score:")
    print(f"- Tests passed: {passed_tests}/{total_tests}")
    print(f"- Estimated score: {passed_tests/total_tests*100:.0f}")
    print(f"- Status: {'PASS' if passed_tests == total_tests else 'WARNING' if passed_tests >= 2 else 'FAIL'}")
    
    return results

def main():
    print("Domain Security Verification Tool")
    print("================================\n")
    
    results_by_domain = {}
    passing_domains = []
    
    for domain in TEST_DOMAINS:
        results = run_all_tests_for_domain(domain)
        results_by_domain[domain] = results
        
        # Check if domain passes all tests
        is_dmarc_pass = results['dmarc'].get('has_dmarc') and results['dmarc'].get('policy') == 'reject'
        is_spf_pass = results['spf'].get('has_spf') and results['spf'].get('all_mechanism') == '-all'
        is_dkim_pass = results['dkim'].get('has_dkim') and results['dkim'].get('signature_valid')
        is_mail_pass = results['mail_server'].get('smtp_accessible') and results['mail_server'].get('supports_tls') and results['mail_server'].get('supports_auth')
        
        if is_dmarc_pass and is_spf_pass and is_dkim_pass and is_mail_pass:
            passing_domains.append(domain)
    
    print("\n" + "=" * 80)
    print("Summary of Results")
    print("=" * 80)
    
    if passing_domains:
        print("\n✅ The following domains pass all security tests:")
        for domain in passing_domains:
            print(f"  - {domain}")
    else:
        print("\n⚠️ No domains passed all tests. The following domains performed best:")
        # Find domains that passed at least 3 tests
        top_domains = []
        for domain in TEST_DOMAINS:
            results = results_by_domain[domain]
            is_dmarc_pass = results['dmarc'].get('has_dmarc') and results['dmarc'].get('policy') == 'reject'
            is_spf_pass = results['spf'].get('has_spf') and results['spf'].get('all_mechanism') == '-all'
            is_dkim_pass = results['dkim'].get('has_dkim') and results['dkim'].get('signature_valid')
            is_mail_pass = results['mail_server'].get('smtp_accessible') and results['mail_server'].get('supports_tls') and results['mail_server'].get('supports_auth')
            
            passed = sum([is_dmarc_pass, is_spf_pass, is_dkim_pass, is_mail_pass])
            if passed >= 3:
                top_domains.append((domain, passed))
        
        for domain, count in sorted(top_domains, key=lambda x: x[1], reverse=True):
            print(f"  - {domain} (Passed {count}/4 tests)")
    
    print("\nRecommended domain for full testing: " + (passing_domains[0] if passing_domains else top_domains[0][0]))

if __name__ == "__main__":
    main()
