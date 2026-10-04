const fs = require('fs');
let txt = fs.readFileSync('frontend/src/components/common/Navbar.jsx', 'utf8');

txt = txt.replace(/<label>Naam \(Name\)<\/label>/, `<label>{profile.role === "pharmacy" ? "Pharmacy Name" : "Naam (Name)"}</label>`);

fs.writeFileSync('frontend/src/components/common/Navbar.jsx', txt, 'utf8');
