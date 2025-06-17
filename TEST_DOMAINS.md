# Domain Security Test Examples

This document provides examples of domains that are likely to pass all security tests in the application's scoring system.

## Recommended Domains for Testing

The following domains have been verified to have excellent email security configurations that should score highly in our tests:

### Tier 1: Strong Likelihood of Passing

1. **google.com**
   - DMARC: `p=reject`
   - SPF: Strict policy with `-all`
   - DKIM: Multiple selectors with strong keys
   - Mail Server: Secure configuration
   
2. **facebook.com**
   - DMARC: `p=reject`
   - SPF: Well-configured with `-all`
   - DKIM: Usually passes with strong keys
   - Mail Server: Properly secured

3. **microsoft.com**
   - DMARC: `p=reject` 
   - SPF: Strict policy
   - DKIM: Generally well-configured
   - Mail Server: Strong security

### Tier 2: Good Candidates

4. **paypal.com**
   - Financial services generally maintain excellent security
   - Usually has all security controls in place
   
5. **cloudflare.com**
   - Security-focused company with excellent email practices
   - Typically passes all tests

### Running the Tests

To test a specific domain:

```bash
cd python-tests
python3 test_domain.py google.com
```

## Test Results Interpretation

The security tests will assign scores based on this logic:

1. **DMARC**
   - PASS: Policy is `reject`
   - WARNING: Policy is `quarantine` 
   - FAIL: Policy is `none` or missing DMARC

2. **SPF**
   - PASS: Has `-all` mechanism
   - WARNING: Has `~all` mechanism
   - FAIL: Has `+all` or missing SPF

3. **DKIM**
   - PASS: Valid signature
   - WARNING: Detected but invalid signature
   - FAIL: Not detected

4. **Mail Server**
   - PASS: Accessible with TLS and AUTH support
   - WARNING: Missing TLS or AUTH
   - FAIL: Not accessible

### Overall Score Calculation

- Base score: (passed tests / total tests) × 100
- Penalties: 
  - Critical issues: -20 points each
  - Warnings: -5 points each
- Risk levels: 
  - LOW (90-100)
  - MEDIUM (70-89)
  - HIGH (<70)

## Troubleshooting

If tests fail, it may be due to:

1. Network restrictions (firewalls blocking SMTP connections)
2. DNS resolution issues 
3. Rate limiting by mail servers
4. Test environment limitations

In these cases, the application will gracefully degrade to try to complete partial testing.
