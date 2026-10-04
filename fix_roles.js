const fs = require('fs');

function fixRoles(file, isLogin) {
  let txt = fs.readFileSync(file, 'utf8');
  const rolesStr = `const ROLES = [
  { id: "patient", icon: "🧑", name: "Patient", desc: "Manage ${isLogin ? 'your' : 'my'} health" },
  { id: "healthworker", icon: "🩺", name: "ASHA / Health Worker", desc: "Register & follow up patients" },
  { id: "doctor", icon: "⚕️", name: "Doctor", desc: "Consult & create referrals" },
  { id: "pharmacy", icon: "💊", name: "Pharmacy", desc: "Manage medicine stock & requests" },
];`;
  txt = txt.replace(/const ROLES = \[[\s\S]*?\];/, rolesStr);
  fs.writeFileSync(file, txt, 'utf8');
}

fixRoles('frontend/src/pages/auth/Login.jsx', true);
fixRoles('frontend/src/pages/auth/Signup.jsx', false);
