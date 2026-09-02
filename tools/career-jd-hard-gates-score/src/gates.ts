/**
 * Career JD Hard Gates Score - Hard Gates Evaluation
 * Evaluates job descriptions against hard gates (pass/fail)
 */

import { HardGates, HardGatesEvaluation, GateResult, ParsedJD } from './types.js';

/**
 * Evaluate all hard gates
 */
export function evaluateGates(parsed: ParsedJD, gates: HardGates): HardGatesEvaluation {
  const dnc = evaluateDNC(parsed, gates);
  const comp = evaluateComp(parsed, gates);
  const location = evaluateLocation(parsed);
  const func = evaluateFunction(parsed);
  const seniority = evaluateSeniority(parsed);
  
  // Overall pass: all gates must pass (or be unknown with 'watch' handling)
  const overallPass = 
    dnc.status === 'pass' &&
    (comp.status === 'pass' || (comp.status === 'unknown' && gates.unknownHandling === 'watch')) &&
    location.status === 'pass' &&
    func.status === 'pass' &&
    seniority.status === 'pass';
  
  return {
    dnc,
    comp,
    location,
    function: func,
    seniority,
    overallPass,
  };
}

/**
 * Evaluate DNC (Do Not Contact) gate
 */
function evaluateDNC(parsed: ParsedJD, gates: HardGates): GateResult {
  if (!parsed.company) {
    return {
      gate: 'DNC',
      status: 'unknown',
      reason: 'Company name not identified in JD',
      confidence: 'low',
    };
  }
  
  const companyLower = parsed.company.toLowerCase();
  
  // Check exact matches and partial matches
  for (const dncCompany of gates.dncList) {
    const dncLower = dncCompany.toLowerCase();
    
    // Exact match
    if (companyLower === dncLower) {
      return {
        gate: 'DNC',
        status: 'fail',
        reason: `Company "${parsed.company}" is on DNC list`,
        confidence: 'high',
      };
    }
    
    // Partial match (subsidiary risk)
    if (companyLower.includes(dncLower) || dncLower.includes(companyLower)) {
      return {
        gate: 'DNC',
        status: 'fail',
        reason: `Company "${parsed.company}" matches or may be affiliated with DNC entry "${dncCompany}"`,
        confidence: 'medium',
      };
    }
  }
  
  return {
    gate: 'DNC',
    status: 'pass',
    reason: `Company "${parsed.company}" not on DNC list`,
    confidence: 'high',
  };
}

/**
 * Evaluate compensation gate
 */
function evaluateComp(parsed: ParsedJD, gates: HardGates): GateResult {
  // If no floor is set, pass with note
  if (gates.annualUSDFloor === null) {
    if (parsed.compensation) {
      return {
        gate: 'Compensation',
        status: 'pass',
        reason: 'Compensation listed in JD, no floor set in gates',
        confidence: 'medium',
      };
    } else {
      return {
        gate: 'Compensation',
        status: 'unknown',
        reason: 'No compensation in JD, no floor set in gates',
        confidence: 'low',
      };
    }
  }
  
  // If compensation is listed, try to parse it
  if (parsed.compensation) {
    const amount = parseCompensation(parsed.compensation);
    
    if (amount !== null) {
      if (amount >= gates.annualUSDFloor) {
        return {
          gate: 'Compensation',
          status: 'pass',
          reason: 'Meets or exceeds floor',
          confidence: 'high',
        };
      } else {
        return {
          gate: 'Compensation',
          status: 'fail',
          reason: 'Below floor',
          confidence: 'high',
        };
      }
    }
  }
  
  // No compensation listed - check if level/company suggests likely meets floor
  const seniorityLevel = parsed.seniorityKeywords.length;
  const hasDirector = parsed.seniorityKeywords.some(k => k.includes('director') || k.includes('vp'));
  
  if (hasDirector) {
    return {
      gate: 'Compensation',
      status: 'pass',
      reason: 'Compensation unlisted but seniority level (Director+) suggests likely meets floor',
      confidence: 'medium',
    };
  }
  
  if (seniorityLevel >= 2) {
    return {
      gate: 'Compensation',
      status: 'pass',
      reason: 'Compensation unlisted but seniority level suggests likely meets floor',
      confidence: 'low',
    };
  }
  
  return {
    gate: 'Compensation',
    status: 'unknown',
    reason: 'Compensation unlisted, cannot determine if meets floor',
    confidence: 'low',
  };
}

/**
 * Parse compensation string to annual USD amount
 */
function parseCompensation(compText: string): number | null {
  // Look for patterns like $150,000 or $150k
  const dollarMatch = compText.match(/\$\s*(\d{2,3})[,\s]*(\d{3})/);
  if (dollarMatch) {
    return parseInt(dollarMatch[1] + dollarMatch[2], 10);
  }
  
  const kMatch = compText.match(/\$\s*(\d{2,3})k/i);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }
  
  return null;
}

/**
 * Evaluate location gate
 */
function evaluateLocation(parsed: ParsedJD): GateResult {
  // Tesla exception - any commute OK
  if (parsed.isTesla) {
    return {
      gate: 'Location',
      status: 'pass',
      reason: 'Tesla role - any commute acceptable per policy',
      confidence: 'high',
    };
  }
  
  // Remote/WFH - always OK
  if (parsed.isRemote || parsed.isWFH) {
    return {
      gate: 'Location',
      status: 'pass',
      reason: 'Remote/WFH role',
      confidence: 'high',
    };
  }
  
  // Check for Austin and Circle C proximity
  if (parsed.location) {
    const locLower = parsed.location.toLowerCase();
    
    // Austin area - check for specific neighborhoods/areas
    if (locLower.includes('austin')) {
      // Known acceptable areas
      if (locLower.includes('south') || locLower.includes('southwest') || locLower.includes('circle c')) {
        return {
          gate: 'Location',
          status: 'pass',
          reason: 'Austin location likely ≤30 min from Circle C',
          confidence: 'medium',
        };
      }
      
      // General Austin - might be OK
      return {
        gate: 'Location',
        status: 'unknown',
        reason: 'Austin location but specific area unclear, commute unverifiable',
        confidence: 'low',
      };
    }
  }
  
  // No verifiable location info
  return {
    gate: 'Location',
    status: 'fail',
    reason: 'Location not WFH/remote, not Tesla, and not verifiable as ≤30 min from Circle C',
    confidence: 'medium',
  };
}

/**
 * Evaluate function gate
 */
function evaluateFunction(parsed: ParsedJD): GateResult {
  const acceptable = ['operations', 'product', 'strategy', 'finance', 'production', 'manufacturing'];
  const unacceptable = ['coordinator', 'recruiter', 'sales', 'marketing'];
  
  const funcLower = (parsed.title || '').toLowerCase() + ' ' + parsed.description.toLowerCase();
  
  // Check for unacceptable functions (coordinator, recruiter, etc.)
  // These override even if "operations" is mentioned (e.g., "Operations Coordinator" is still unacceptable)
  for (const bad of unacceptable) {
    if (funcLower.includes(bad)) {
      return {
        gate: 'Function',
        status: 'fail',
        reason: `Function appears to be ${bad} (not eligible)`,
        confidence: 'medium',
      };
    }
  }
  
  // Check for acceptable functions
  for (const good of acceptable) {
    if (parsed.functionKeywords.includes(good)) {
      return {
        gate: 'Function',
        status: 'pass',
        reason: `Function is ${good} (eligible)`,
        confidence: 'high',
      };
    }
  }
  
  // Tesla production/ops
  if (parsed.isTesla && (funcLower.includes('production') || funcLower.includes('operations') || funcLower.includes('manufacturing'))) {
    return {
      gate: 'Function',
      status: 'pass',
      reason: 'Tesla production/operations role (eligible)',
      confidence: 'high',
    };
  }
  
  return {
    gate: 'Function',
    status: 'fail',
    reason: 'Function unclear or not in eligible categories',
    confidence: 'low',
  };
}

/**
 * Evaluate seniority gate
 */
function evaluateSeniority(parsed: ParsedJD): GateResult {
  const senior = ['director', 'head', 'vp', 'vice president', 'senior manager', 'plant manager'];
  const junior = ['coordinator', 'associate', 'analyst', 'assistant'];
  
  const titleLower = (parsed.title || '').toLowerCase();
  
  // Check for junior keywords
  for (const j of junior) {
    if (titleLower.includes(j)) {
      return {
        gate: 'Seniority',
        status: 'fail',
        reason: `Title indicates junior IC level (${j})`,
        confidence: 'high',
      };
    }
  }
  
  // Check for senior keywords
  for (const s of senior) {
    if (parsed.seniorityKeywords.some(k => k.includes(s))) {
      return {
        gate: 'Seniority',
        status: 'pass',
        reason: `Manager level or above (${s})`,
        confidence: 'high',
      };
    }
  }
  
  // Check for "manager" in title
  if (titleLower.includes('manager') && !titleLower.includes('program manager')) {
    return {
      gate: 'Seniority',
      status: 'pass',
      reason: 'Manager level',
      confidence: 'medium',
    };
  }
  
  return {
    gate: 'Seniority',
    status: 'fail',
    reason: 'Seniority level unclear or appears to be junior IC',
    confidence: 'low',
  };
}
