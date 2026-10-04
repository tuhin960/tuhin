const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/common/Navbar.jsx', 'utf8');

txt = txt.replace(/<select className="country-code-select"[\s\S]*?<\/select>/, `<select className="country-code-select" value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+61">🇦🇺 +61</option>
                      <option value="+971">🇦🇪 +971</option>
                    </select>`);

// Add pharmacy to the display details
txt = txt.replace(/\{profile\.role === "healthworker" && \([\s\S]*?<\/span>\s*<\/div>\s*\)\}/, 
`{profile.role === "healthworker" && (
                  <div className="detail-item">
                    <span className="detail-label">HW Reg. No</span>
                    <span className="detail-value">{profile.specialId}</span>
                  </div>
                )}

                {profile.role === "pharmacy" && (
                  <div className="detail-item">
                    <span className="detail-label">Drug License No</span>
                    <span className="detail-value">{profile.specialId}</span>
                  </div>
                )}`);

fs.writeFileSync('frontend/src/components/common/Navbar.jsx', txt, 'utf8');
