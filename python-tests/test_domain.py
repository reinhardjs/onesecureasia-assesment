#!/usr/bin/env python3
"""
Single Domain Test Script
Tests a specific domain against all security tests and evaluates the result
"""

import sys
import json
import subprocess
from typing import Dict, Any

def test_domain(domain):
    """Run all tests on a single domain"""
    print(f"Testing domain: {domain}")
    print("=" * 50)
    
    # Run all tests
    tests = [
        ('DMARC', 'test_dmarc.py'),
        ('SPF', 'test_spf.py'), 
        ('DKIM', 'test_dkim.py'),
        ('Mail Server', 'test_mail_server.py')
    ]
    
    all_results = {}
    
    for name, script in tests:
        print(f"Running {name} test...")
        result = subprocess.run(
            [sys.executable, script, domain],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            try:
                test_result = json.loads(result.stdout)
                all_results[name.lower().replace(" ", "_")] = test_result
                print(f"✅ {name} test completed successfully")
            except json.JSONDecodeError:
                print(f"⚠️ {name} test output could not be parsed as JSON")
                print(result.stdout)
        else:
            print(f"❌ {name} test failed")
            print(result.stderr)
    
    print("\n" + "=" * 50)
    print("EVALUATION SUMMARY:")
    print("=" * 50)
    
    # Check DMARC
    if 'dmarc' in all_results:
        dmarc = all_results['dmarc']
        if dmarc.get('has_dmarc'):
            print(f"DMARC: {'✅ PASS' if dmarc.get('policy') == 'reject' else '⚠️ WARNING'}")
            print(f"  - Policy: {dmarc.get('policy')}")
        else:
            print("DMARC: ❌ FAIL - No DMARC record found")
            
    # Check SPF
    if 'spf' in all_results:
        spf = all_results['spf']
        if spf.get('has_spf'):
            print(f"SPF: {'✅ PASS' if spf.get('all_mechanism') == '-all' else '⚠️ WARNING'}")
            print(f"  - All mechanism: {spf.get('all_mechanism')}")
        else:
            print("SPF: ❌ FAIL - No SPF record found")
            
    # Check DKIM
    if 'dkim' in all_results:
        dkim = all_results['dkim']
        if dkim.get('has_dkim') and dkim.get('signature_valid'):
            print(f"DKIM: ✅ PASS")
            print(f"  - Selectors found: {', '.join(dkim.get('selectors_found', []))}")
            print(f"  - Key length: {dkim.get('key_length')}")
        elif dkim.get('has_dkim'):
            print(f"DKIM: ⚠️ WARNING - Record found but signature invalid")
        else:
            print("DKIM: ❌ FAIL - No DKIM record found")
            
    # Check Mail Server
    if 'mail_server' in all_results:
        mail = all_results['mail_server']
        if mail.get('smtp_accessible'):
            tls = mail.get('supports_tls', False)
            auth = mail.get('supports_auth', False)
            if tls and auth:
                print(f"Mail Server: ✅ PASS")
            else:
                print(f"Mail Server: ⚠️ WARNING - Missing security features")
            print(f"  - TLS: {'✅' if tls else '❌'}")
            print(f"  - AUTH: {'✅' if auth else '❌'}")
        else:
            print("Mail Server: ❌ FAIL - Not accessible")
    
    # Calculate score based on evaluateSecurityStatus.js logic
    totalTests = 0
    passedTests = 0
    criticalIssues = 0
    warningIssues = 0
    
    # DMARC evaluation
    if 'dmarc' in all_results:
        totalTests += 1
        dmarc = all_results['dmarc']
        if dmarc.get('has_dmarc'):
            if dmarc.get('policy') == 'reject':
                passedTests += 1
            elif dmarc.get('policy') == 'quarantine':
                warningIssues += 1
            elif dmarc.get('policy') == 'none':
                criticalIssues += 1
            
            if not dmarc.get('rua') and not dmarc.get('ruf'):
                warningIssues += 1
        else:
            criticalIssues += 1
    
    # SPF evaluation
    if 'spf' in all_results:
        totalTests += 1
        spf = all_results['spf']
        if spf.get('has_spf'):
            if spf.get('all_mechanism') == '-all':
                passedTests += 1
            elif spf.get('all_mechanism') == '~all':
                warningIssues += 1
            elif spf.get('all_mechanism') == '+all':
                criticalIssues += 1
            else:
                warningIssues += 1
        else:
            criticalIssues += 1
    
    # DKIM evaluation
    if 'dkim' in all_results:
        totalTests += 1
        dkim = all_results['dkim']
        if dkim.get('has_dkim') and dkim.get('signature_valid'):
            passedTests += 1
            
            if dkim.get('key_length') and '1024' in dkim.get('key_length'):
                warningIssues += 1
        elif dkim.get('has_dkim') and not dkim.get('signature_valid'):
            criticalIssues += 1
        else:
            warningIssues += 1
    
    # Mail Server evaluation
    if 'mail_server' in all_results:
        totalTests += 1
        mail = all_results['mail_server']
        if mail.get('smtp_accessible'):
            if mail.get('supports_tls') and mail.get('supports_auth'):
                passedTests += 1
            elif mail.get('supports_tls') or mail.get('supports_auth'):
                warningIssues += 1
            else:
                criticalIssues += 1
        else:
            criticalIssues += 1
    
    # Calculate score
    if totalTests > 0:
        baseScore = (passedTests / totalTests) * 100
        warningPenalty = warningIssues * 5
        criticalPenalty = criticalIssues * 20
        
        overallScore = max(0, int(baseScore - warningPenalty - criticalPenalty))
        
        # Determine risk level
        if criticalIssues > 0:
            riskLevel = 'HIGH'
            status = 'FAIL'
        elif warningIssues > 0:
            riskLevel = 'MEDIUM'
            status = 'WARNING'
        else:
            riskLevel = 'LOW'
            status = 'PASS'
        
        print("\nSecurity Score:")
        print(f"  Overall Score: {overallScore}/100")
        print(f"  Risk Level: {riskLevel}")
        print(f"  Status: {status}")
        print(f"  Tests Passed: {passedTests}/{totalTests}")
    
    return all_results

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 test_domain.py <domain>")
        print("Example: python3 test_domain.py google.com")
        sys.exit(1)
    
    domain = sys.argv[1].strip().lower()
    test_domain(domain)

if __name__ == "__main__":
    main()
