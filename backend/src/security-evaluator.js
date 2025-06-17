// Status determination and recommendation logic
const STATUS = {
  PASS: 'pass',
  FAIL: 'fail', 
  WARNING: 'warning',
  INFO: 'info'
};

const evaluateSecurityStatus = (testResults) => {
  const evaluation = {
    overall_status: STATUS.PASS,
    overall_score: 100,
    recommendations: [],
    test_statuses: {},
    risk_level: 'LOW'
  };

  let totalTests = 0;
  let passedTests = 0;
  let criticalIssues = 0;
  let warningIssues = 0;

  // Evaluate DMARC
  if (testResults.dmarc) {
    totalTests++;
    const dmarc = testResults.dmarc;
    
    if (dmarc.has_dmarc) {
      if (dmarc.policy === 'reject') {
        evaluation.test_statuses.dmarc = STATUS.PASS;
        passedTests++;
      } else if (dmarc.policy === 'quarantine') {
        evaluation.test_statuses.dmarc = STATUS.WARNING;
        warningIssues++;
        evaluation.recommendations.push('Consider upgrading DMARC policy from "quarantine" to "reject" for stronger protection');
      } else if (dmarc.policy === 'none') {
        evaluation.test_statuses.dmarc = STATUS.FAIL;
        criticalIssues++;
        evaluation.recommendations.push('DMARC policy is set to "none" - upgrade to "quarantine" or "reject" to prevent email spoofing');
      }
      
      if (!dmarc.rua && !dmarc.ruf) {
        warningIssues++;
        evaluation.recommendations.push('Configure DMARC reporting addresses (rua/ruf) to monitor email authentication');
      }
    } else {
      evaluation.test_statuses.dmarc = STATUS.FAIL;
      criticalIssues++;
      evaluation.recommendations.push('CRITICAL: No DMARC record found - implement DMARC to prevent email spoofing');
    }
  }

  // Evaluate SPF
  if (testResults.spf) {
    totalTests++;
    const spf = testResults.spf;
    
    if (spf.has_spf) {
      if (spf.all_mechanism === '-all') {
        evaluation.test_statuses.spf = STATUS.PASS;
        passedTests++;
      } else if (spf.all_mechanism === '~all') {
        evaluation.test_statuses.spf = STATUS.WARNING;
        warningIssues++;
        evaluation.recommendations.push('SPF uses soft fail (~all) - consider hard fail (-all) for stronger protection');
      } else if (spf.all_mechanism === '+all') {
        evaluation.test_statuses.spf = STATUS.FAIL;
        criticalIssues++;
        evaluation.recommendations.push('CRITICAL: SPF allows all senders (+all) - this provides no protection');
      } else {
        evaluation.test_statuses.spf = STATUS.WARNING;
        warningIssues++;
        evaluation.recommendations.push('SPF record should end with -all or ~all mechanism');
      }
      
      if (spf.warnings && spf.warnings.length > 0) {
        spf.warnings.forEach(warning => {
          evaluation.recommendations.push(`SPF Warning: ${warning}`);
        });
      }
    } else {
      evaluation.test_statuses.spf = STATUS.FAIL;
      criticalIssues++;
      evaluation.recommendations.push('CRITICAL: No SPF record found - implement SPF to specify authorized mail servers');
    }
  }

  // Evaluate DKIM
  if (testResults.dkim) {
    totalTests++;
    const dkim = testResults.dkim;
    
    if (dkim.has_dkim && dkim.signature_valid) {
      evaluation.test_statuses.dkim = STATUS.PASS;
      passedTests++;
      
      if (dkim.key_length && dkim.key_length.includes('1024')) {
        warningIssues++;
        evaluation.recommendations.push('Consider upgrading DKIM key length to 2048 bits or higher for better security');
      }
    } else if (dkim.has_dkim && !dkim.signature_valid) {
      evaluation.test_statuses.dkim = STATUS.FAIL;
      criticalIssues++;
      evaluation.recommendations.push('DKIM record found but signature validation failed - check key configuration');
    } else {
      evaluation.test_statuses.dkim = STATUS.WARNING;
      warningIssues++;
      evaluation.recommendations.push('DKIM not detected with common selectors - ensure DKIM is properly configured');
    }
  }

  // Evaluate Mail Server
  if (testResults.mail_server) {
    totalTests++;
    const mailServer = testResults.mail_server;
    
    if (mailServer.smtp_accessible) {
      if (mailServer.supports_tls && mailServer.supports_auth) {
        evaluation.test_statuses.mail_server = STATUS.PASS;
        passedTests++;
      } else if (mailServer.supports_tls || mailServer.supports_auth) {
        evaluation.test_statuses.mail_server = STATUS.WARNING;
        warningIssues++;
        if (!mailServer.supports_tls) {
          evaluation.recommendations.push('Mail server should support TLS encryption');
        }
        if (!mailServer.supports_auth) {
          evaluation.recommendations.push('Mail server should support SMTP authentication');
        }
      } else {
        evaluation.test_statuses.mail_server = STATUS.FAIL;
        criticalIssues++;
        evaluation.recommendations.push('Mail server lacks TLS and authentication support - security risk');
      }
      
      if (mailServer.response_time_ms > 5000) {
        warningIssues++;
        evaluation.recommendations.push('Mail server response time is slow - consider performance optimization');
      }
    } else {
      evaluation.test_statuses.mail_server = STATUS.FAIL;
      criticalIssues++;
      evaluation.recommendations.push('Mail server is not accessible - check server configuration');
    }
  }

  // Calculate overall status and score
  if (criticalIssues > 0) {
    evaluation.overall_status = STATUS.FAIL;
    evaluation.risk_level = 'HIGH';
  } else if (warningIssues > 0) {
    evaluation.overall_status = STATUS.WARNING;
    evaluation.risk_level = 'MEDIUM';
  }

  // Calculate score
  if (totalTests > 0) {
    const baseScore = (passedTests / totalTests) * 100;
    const warningPenalty = warningIssues * 5;
    const criticalPenalty = criticalIssues * 20;
    
    evaluation.overall_score = Math.max(0, Math.round(baseScore - warningPenalty - criticalPenalty));
  }

  // Add general recommendations
  if (evaluation.overall_score < 70) {
    evaluation.recommendations.unshift('URGENT: Multiple critical security issues detected - immediate action required');
  } else if (evaluation.overall_score < 90) {
    evaluation.recommendations.unshift('Several security improvements recommended to enhance email security');
  }

  return evaluation;
};

module.exports = { evaluateSecurityStatus, STATUS };