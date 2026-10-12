export function normalizeUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw || /[\u0000-\u0020\\]/.test(raw)) throw new Error('Enter a valid URL or domain without spaces or backslashes.');
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('Enter a valid URL or domain.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs can be analyzed.');
  if (url.username || url.password) throw new Error('URLs containing embedded credentials are not accepted.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || /^\d+(\.\d+){3}$/.test(host) || host.includes(':')) throw new Error('IP address and local network destinations are not accepted.');
  if (!host.includes('.') || host.split('.').some(label => !label || label.startsWith('-') || label.endsWith('-'))) throw new Error('Enter a public domain name.');
  url.hostname = host;
  url.hash = '';
  return url;
}

export function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) { const old = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)); diagonal = old; }
  }
  return row[b.length];
}

export function compareAppListing(official, candidate) {
  const nameAvailable = Boolean(String(candidate.name || '').trim());
  const publisherAvailable = Boolean(String(candidate.publisher || '').trim());
  const packageAvailable = Boolean(String(candidate.package || '').trim());
  const nameSimilar = nameAvailable && String(candidate.name).toLowerCase().includes(String(official.name || '').toLowerCase().split(' ')[0]);
  const publisherMatch = publisherAvailable && String(candidate.publisher).trim().toLowerCase() === String(official.publisher || '').trim().toLowerCase();
  const packageMatch = packageAvailable && String(candidate.package).trim().toLowerCase() === String(official.package || '').trim().toLowerCase();
  const signals = [];
  if (nameSimilar) signals.push('Candidate name contains the official app name');
  if (publisherAvailable && !publisherMatch) signals.push('Publisher differs from configured official publisher');
  if (!publisherAvailable) signals.push('Publisher metadata unavailable');
  if (packageAvailable && !packageMatch) signals.push('Package identifier differs from configured official package');
  if (!packageAvailable) signals.push('Package identifier metadata unavailable');
  if (!nameAvailable) signals.push('App name metadata unavailable');
  const score = Math.min(96, (nameSimilar ? 30 : 0) + (publisherAvailable && !publisherMatch ? 27 : 0) + (packageAvailable && !packageMatch ? 32 : 0));
  const missing = !nameAvailable || !publisherAvailable || !packageAvailable;
  return { nameSimilar, publisherMatch, packageMatch, signals, riskScore: score, severity: score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low', confidence: missing ? 'Low' : 'Medium', explanation: signals.length ? `${signals.join('; ')}. Differences are investigation signals, not proof of impersonation.` : 'Name, publisher and package match the configured official record. This comparison does not inspect the app binary.' };
}

export function sourceAvailability(available, error = '') {
  if (available) return { state: 'available', label: 'Sample source available · simulated' };
  return { state: 'unavailable', label: error ? `Source unavailable · ${String(error)}` : 'Source unavailable' };
}

export function analyzeDomain(input, profiles) {
  const url = normalizeUrl(input);
  const host = url.hostname;
  const matches = [];
  for (const profile of profiles) {
    for (const official of profile.domains) {
      const officialHost = new URL(`https://${official}`).hostname.toLowerCase();
      if (host === officialHost || host.endsWith("." + officialHost)) return { url: url.href, brand: profile.brand, officialDomain: officialHost, riskScore: 5, severity: "Low", confidence: "High", matched: true, official: true, explanation: "Host matches configured official domain " + officialHost + ". This string-only comparison does not certify destination or page content." };
      const left = host.split('.'); const right = officialHost.split('.');
      const candidateRoot = left.slice(-2, -1)[0] || left[0];
      const officialRoot = right.slice(-2, -1)[0] || right[0];
      const distance = editDistance(candidateRoot, officialRoot);
      const commonBrand = candidateRoot.includes(profile.brandSlug) || host.includes(profile.brandSlug);
      if (distance <= 2 || commonBrand) matches.push({ profile, officialHost, distance, commonBrand, path: url.pathname });
    }
  }
  const best = matches.sort((a, b) => a.distance - b.distance)[0];
  if (!best) return { url: url.href, riskScore: 8, severity: 'Low', confidence: 'Low', matched: false, explanation: 'No close match to configured official domains was found. This string-only check cannot establish that a site is safe.' };
  const riskScore = Math.min(96, 42 + (best.commonBrand ? 15 : 0) + (best.distance <= 1 ? 25 : 12) + (url.pathname.toLowerCase().includes('login') ? 12 : 0));
  const severity = riskScore >= 80 ? 'High' : riskScore >= 60 ? 'Medium' : 'Low';
  return { url: url.href, brand: best.profile.brand, officialDomain: best.officialHost, riskScore, severity, confidence: best.distance <= 1 ? 'Medium' : 'Low', matched: true,
    explanation: `The hostname resembles ${best.officialHost} (edit distance ${best.distance} on the brand label).${url.pathname.toLowerCase().includes('login') ? ' The path contains “login”.' : ''} This is an investigation signal, not proof of phishing.` };
}
