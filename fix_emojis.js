const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/common/Navbar.jsx', 'utf8');

txt = txt.replace(/<select className="country-code-select"[\s\S]*?<\/select>/, `<select className="country-code-select" value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>`);

// Fix the hamburger menu icon just in case
txt = txt.replace(/<button className="menu-btn"[\s\S]*?<\/button>/, `<button className="menu-btn" onClick={onMenuClick} aria-label="Open menu">&#9776;</button>`);

fs.writeFileSync('frontend/src/components/common/Navbar.jsx', txt, 'utf8');
