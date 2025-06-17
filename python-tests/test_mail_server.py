#!/usr/bin/env python3
"""
Mail Server Echo Testing Script
Tests mail server connectivity and response
"""

import sys
import json
import dns.resolver
import socket
import smtplib
import re
from typing import Dict, Any, List

def test_mail_server(domain: str) -> Dict[str, Any]:
    """
    Test mail server connectivity and capabilities
    
    Args:
        domain: Domain name to test
        
    Returns:
        Dictionary containing mail server test results
    """
    result = {
        'domain': domain,
        'mx_records': [],
        'smtp_accessible': False,
        'primary_mx': None,
        'smtp_response': None,
        'supports_tls': False,
        'supports_auth': False,
        'smtp_banner': None,
        'response_time_ms': None,
        'errors': [],
        'warnings': []
    }
    
    try:
        # Get MX records
        mx_answers = dns.resolver.resolve(domain, 'MX')
        
        mx_records = []
        for mx in mx_answers:
            mx_records.append({
                'priority': mx.preference,
                'hostname': str(mx.exchange).rstrip('.')
            })
        
        # Sort by priority (lower number = higher priority)
        mx_records.sort(key=lambda x: x['priority'])
        result['mx_records'] = mx_records
        
        if not mx_records:
            result['errors'].append("No MX records found")
            return result
        
        # Test primary MX server
        primary_mx = mx_records[0]['hostname']
        result['primary_mx'] = primary_mx
        
        # Test SMTP connectivity with retries
        max_retries = 2
        retry_count = 0
        
        while retry_count <= max_retries:
            try:
                import time
                start_time = time.time()
                
                # Test basic SMTP connection with shorter timeout
                smtp = smtplib.SMTP(timeout=5)
                smtp.connect(primary_mx, 25)
                
                end_time = time.time()
                result['response_time_ms'] = int((end_time - start_time) * 1000)
                # Connection successful, break retry loop
                break
            except (socket.timeout, socket.error) as e:
                retry_count += 1
                if retry_count > max_retries:
                    # Only report error if all retries failed
                    raise
                result['warnings'].append(f"Connection retry {retry_count}/{max_retries}")
                time.sleep(1)  # Short delay between retries
            
            result['smtp_accessible'] = True
            
            # Get server banner
            if hasattr(smtp, 'sock') and smtp.sock:
                result['smtp_banner'] = smtp.sock.recv(1024).decode('utf-8', errors='ignore').strip()
            
            # Test EHLO and capabilities
            try:
                code, response = smtp.ehlo()
                result['smtp_response'] = response.decode('utf-8', errors='ignore')
                
                # Check for TLS support
                if smtp.has_extn('STARTTLS'):
                    result['supports_tls'] = True
                    
                    # Try to start TLS
                    try:
                        smtp.starttls()
                        result['warnings'].append("TLS connection established successfully")
                    except Exception as tls_error:
                        result['warnings'].append(f"TLS available but connection failed: {str(tls_error)}")
                
                # Check for authentication support
                if smtp.has_extn('AUTH'):
                    result['supports_auth'] = True
                
            except Exception as ehlo_error:
                result['warnings'].append(f"EHLO command failed: {str(ehlo_error)}")
                
                # Try basic HELO
                try:
                    code, response = smtp.helo()
                    result['smtp_response'] = response.decode('utf-8', errors='ignore')
                except Exception as helo_error:
                    result['warnings'].append(f"HELO command also failed: {str(helo_error)}")
            
            smtp.quit()
            
        except socket.timeout:
            result['errors'].append("SMTP connection timeout")
        except socket.gaierror as e:
            result['errors'].append(f"DNS resolution failed for {primary_mx}: {str(e)}")
        except Exception as e:
            result['errors'].append(f"SMTP test failed: {str(e)}")
        
        # Additional checks
        if result['smtp_accessible']:
            # Check for common mail server ports
            additional_ports = [587, 465]  # submission ports
            for port in additional_ports:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(5)
                    sock.connect((primary_mx, port))
                    sock.close()
                    result['warnings'].append(f"Port {port} is also accessible")
                except:
                    pass
        
        # Validate MX record configuration
        if len(mx_records) == 1:
            result['warnings'].append("Only one MX record found - consider adding backup MX for redundancy")
        
        # Check for common issues
        for mx_record in mx_records:
            hostname = mx_record['hostname']
            if hostname == domain:
                result['warnings'].append("MX record points to the domain itself")
            elif hostname.endswith('.' + domain):
                # This is normal for internal MX records
                pass
                
    except dns.resolver.NXDOMAIN:
        result['errors'].append(f"Domain {domain} does not exist")
    except dns.resolver.NoAnswer:
        result['errors'].append(f"No MX records found for {domain}")
    except Exception as e:
        result['errors'].append(f"Error testing mail server: {str(e)}")
    
    result['test_timestamp'] = __import__('datetime').datetime.now().isoformat()
    result['test_type'] = 'mail_server_echo'
    
    return result

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python test_mail_server.py <domain>'}))
        sys.exit(1)
    
    domain = sys.argv[1].strip().lower()
    
    # Validate domain format
    if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$', domain):
        print(json.dumps({'error': 'Invalid domain format'}))
        sys.exit(1)
    
    try:
        result = test_mail_server(domain)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': f'Test execution failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()
