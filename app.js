// STATE MODEL
const state = {
  facility: { name: "Karamara General Hospital", status: "Active" },
  staff: [
    { id: 101, name: "Dr. Kebede Kassaye", dept: "Radiology", role: "Department Head", expiry: "2026-10-15" },
    { id: 102, name: "Amina Abdi", dept: "Radiology", role: "Employee", expiry: "2027-05-20" },
    { id: 103, name: "Tigist Haile", dept: "Emergency", role: "Employee", expiry: "2026-09-01" }
  ],
  roster: [],
  leaves: [
    { id: 1, staffId: 102, staffName: "Amina Abdi", date: "2026-10-10", reason: "Annual Leave", status: "Pending" }
  ],
  attendance: []
};

// ROLE PERMISSIONS
const permissions = {
  super_admin:    { facility: true,  staff: true,  roster: true,  leaveApproval: true,  employeePortal: false },
  hospital_admin: { facility: true,  staff: true,  roster: true,  leaveApproval: true,  employeePortal: false },
  hr_manager:     { facility: false, staff: true,  roster: true,  leaveApproval: true,  employeePortal: false },
  dept_head:      { facility: false, staff: false, roster: true,  leaveApproval: true,  employeePortal: true },
  employee:       { facility: false, staff: false, roster: false, leaveApproval: false, employeePortal: true }
};

function log(msg) {
  const box = document.getElementById('auditLog');
  const role = document.getElementById('activeRole').value.toUpperCase();
  box.innerHTML = `> [${role}] ${msg}<br>` + box.innerHTML;
}

function switchRoleContext() {
  const currentRole = document.getElementById('activeRole').value;
  const perm = permissions[currentRole];

  toggleSection('card-facility', 'lock-facility', 'btn-facility', perm.facility);
  toggleSection('card-staff', 'lock-staff', 'btn-staff', perm.staff);
  toggleSection('card-roster', 'lock-roster', 'btn-roster', perm.roster);
  toggleSection('card-leave-approval', 'lock-leave-approval', null, perm.leaveApproval);
  toggleSection('card-employee-portal', 'lock-employee-portal', 'btn-submit-leave', perm.employeePortal);

  document.getElementById('btn-clock-in').disabled = !perm.employeePortal;
  document.getElementById('btn-clock-late').disabled = !perm.employeePortal;

  log(`Switched context to ${currentRole.replace('_', ' ')}.`);
}

function toggleSection(cardId, lockId, btnId, isAllowed) {
  const card = document.getElementById(cardId);
  const lock = document.getElementById(lockId);
  const btn = btnId ? document.getElementById(btnId) : null;

  if (isAllowed) {
    card.classList.remove('disabled-overlay');
    lock.innerText = '';
    if (btn) btn.disabled = false;
  } else {
    card.classList.add('disabled-overlay');
    lock.innerText = '🔒 Access Restricted';
    if (btn) btn.disabled = true;
  }
}

function checkLicenseStatus(dateStr) {
  const today = new Date();
  const exp = new Date(dateStr);
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '<span class="tag tag-danger">EXPIRED</span>';
  if (diffDays <= 30) return `<span class="tag tag-warning">EXPIRING (${diffDays}d)</span>`;
  return '<span class="tag tag-success">ACTIVE</span>';
}

function render() {
  // Staff Directory & Roster Dropdown
  const staffTbody = document.querySelector('#staffTable tbody');
  const rosterSelect = document.getElementById('rosterStaff');
  staffTbody.innerHTML = '';
  rosterSelect.innerHTML = '<option value="">Select Department Staff</option>';

  state.staff.forEach(s => {
    staffTbody.innerHTML += `<tr><td>${s.name}</td><td>${s.dept}</td><td>${s.role}</td><td>${checkLicenseStatus(s.expiry)}</td></tr>`;
    rosterSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.dept})</option>`;
  });

  // Roster Schedule
  const rosterTbody = document.querySelector('#rosterTable tbody');
  rosterTbody.innerHTML = '';
  state.roster.forEach(r => {
    rosterTbody.innerHTML += `<tr><td>${r.staffName}</td><td>${r.shift}</td><td>${r.date}</td></tr>`;
  });

  // Leave Requests
  const leaveTbody = document.querySelector('#leaveApprovalTable tbody');
  leaveTbody.innerHTML = '';
  state.leaves.forEach(l => {
    const actionBtns = l.status === 'Pending' 
      ? `<button onclick="approveLeave(${l.id})" style="padding:2px 6px; font-size:0.7rem;" class="btn-success">Approve</button>`
      : `<span class="tag tag-info">${l.status}</span>`;
    leaveTbody.innerHTML += `<tr><td>${l.staffName}</td><td>${l.date}</td><td>${l.reason}</td><td>${l.status}</td><td>${actionBtns}</td></tr>`;
  });
}

// EVENT LISTENERS
document.getElementById('facilityForm').addEventListener('submit', (e) => {
  e.preventDefault();
  state.facility.name = document.getElementById('hospitalName').value;
  state.facility.status = document.getElementById('facilityStatus').value;
  log(`FACILITY UPDATED: "${state.facility.name}" set to [${state.facility.status}]`);
});

document.getElementById('staffForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('staffName').value;
  const dept = document.getElementById('staffDept').value;
  const role = document.getElementById('staffRole').value;
  const expiry = document.getElementById('licenseExpiry').value;

  state.staff.push({ id: Date.now(), name, dept, role, expiry });
  render();
  log(`REGISTERED STAFF: ${name} (${dept} - ${role}).`);
  e.target.reset();
});

document.getElementById('rosterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const staffId = document.getElementById('rosterStaff').value;
  const shift = document.getElementById('shiftType').value;
  const date = document.getElementById('shiftDate').value;
  const staff = state.staff.find(s => s.id == staffId);

  // Check double-booking
  const conflict = state.roster.find(r => r.staffId == staffId && r.date === date);
  if (conflict) {
    log(`[REJECTED] CONFLICT: ${staff.name} already assigned a shift on ${date}.`);
    alert(`Conflict Error: ${staff.name} is already assigned on ${date}.`);
    return;
  }

  state.roster.push({ staffId, staffName: staff.name, shift, date });
  render();
  log(`ROSTER ASSIGNED: ${staff.name} assigned to ${shift} on ${date}.`);
});

document.getElementById('leaveRequestForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('leaveDate').value;
  const reason = document.getElementById('leaveReason').value;

  state.leaves.push({
    id: Date.now(),
    staffId: 102,
    staffName: "Amina Abdi (Self)",
    date,
    reason,
    status: "Pending"
  });
  render();
  log(`LEAVE REQUEST SUBMITTED: Date: ${date}, Reason: "${reason}".`);
  e.target.reset();
});

function approveLeave(id) {
  const leave = state.leaves.find(l => l.id === id);
  if (leave) {
    leave.status = 'Approved';
    render();
    log(`LEAVE APPROVED: Approved for ${leave.staffName} on ${leave.date}.`);
  }
}

function clockIn(status) {
  const time = new Date().toLocaleTimeString();
  log(`CLOCK-IN EVENT: Staff clocked in as [${status}] at ${time}.`);
}

// INITIALIZATION
render();
switchRoleContext();