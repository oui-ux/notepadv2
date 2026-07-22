const entriesEl = document.getElementById('entries');
const tpl = document.getElementById('entryTemplate');
let entryCount = 0;
let removedEntryData = null;

/**
 * Helper: builds a standardized 4-part structure.
 */
function makeConcernParts({ userCalling = '', rootCause = '', troubleshooting = '', kb = '' }) {
  return { userCalling, rootCause, troubleshooting, kb };
}

/**
 * Helper: join troubleshooting array cleanly.
 */
function joinLines(lines) {
  return (lines || []).join('\n');
}

/* ============================================================
   Custom Concern Types (saved permanently in this browser)
   ============================================================ */
const CUSTOM_CONCERN_STORAGE_KEY = 'customConcernTypes';

function loadCustomConcernTypes() {
  try {
    const raw = localStorage.getItem(CUSTOM_CONCERN_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read custom concern types:', err);
    return [];
  }
}

function saveCustomConcernTypes(list) {
  try {
    localStorage.setItem(CUSTOM_CONCERN_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error('Failed to save custom concern types:', err);
    alert('Could not save this concern type. Your browser storage may be full or disabled.');
    return false;
  }
}

function slugifyConcernLabel(label) {
  const base = 'custom_' + label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'custom_type';
}

function makeUniqueConcernValue(label, list, excludeValue) {
  const base = slugifyConcernLabel(label);
  let candidate = base;
  let i = 2;
  while (list.some((c) => c.value === candidate && candidate !== excludeValue)) {
    candidate = `${base}_${i}`;
    i++;
  }
  return candidate;
}

function getCustomConcernPartsByType(type) {
  const list = loadCustomConcernTypes();
  const found = list.find((c) => c.value === type);
  if (!found) return null;
  return makeConcernParts({
    userCalling: found.userCalling,
    rootCause: found.rootCause,
    troubleshooting: found.troubleshooting,
    kb: found.kb
  });
}

/**
 * Rebuilds the "Custom" optgroup in every concernType select on the page
 * (or just the one passed in), preserving whatever is currently selected.
 */
function populateCustomConcernOptions(scope) {
  const selects = scope
    ? [scope]
    : Array.from(document.querySelectorAll('select.concernType'));
  const list = loadCustomConcernTypes();

  selects.forEach((select) => {
    const group = select.querySelector('.customConcernGroup');
    if (!group) return;
    const currentValue = select.value;
    group.innerHTML = '';
    list.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.value;
      opt.textContent = c.label;
      group.appendChild(opt);
    });
    // restore selection if it still exists
    if ([...select.options].some((o) => o.value === currentValue)) {
      select.value = currentValue;
    }
  });
}

function renderCustomConcernList() {
  const container = document.getElementById('customConcernList');
  const emptyMsg = document.getElementById('customConcernEmpty');
  if (!container) return;
  const list = loadCustomConcernTypes();

  container.querySelectorAll('.customConcernItem').forEach((el) => el.remove());

  if (list.length === 0) {
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  list.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'customConcernItem';
    row.innerHTML = `
      <span class="customConcernName"></span>
      <span class="customConcernActions">
        <button type="button" class="secondary" data-ct-action="edit" data-value="${c.value}">Edit</button>
        <button type="button" class="danger" data-ct-action="delete" data-value="${c.value}">Delete</button>
      </span>
    `;
    row.querySelector('.customConcernName').textContent = c.label;
    container.appendChild(row);
  });
}

function openConcernTypeModal() {
  renderCustomConcernList();
  document.getElementById('concernTypeModal').style.display = 'flex';
}

function closeConcernTypeModal() {
  document.getElementById('concernTypeModal').style.display = 'none';
  resetConcernTypeForm();
}

function resetConcernTypeForm() {
  document.getElementById('ctEditingValue').value = '';
  document.getElementById('ctLabel').value = '';
  document.getElementById('ctUserCalling').value = '';
  document.getElementById('ctRootCause').value = '';
  document.getElementById('ctTroubleshooting').value = '';
  document.getElementById('ctKb').value = '';
  document.getElementById('concernFormTitle').textContent = 'Add New Concern Type';
  document.getElementById('btnSaveConcernType').textContent = 'Save Concern Type';
  document.getElementById('btnCancelEditConcernType').style.display = 'none';
}

function loadConcernTypeIntoForm(value) {
  const list = loadCustomConcernTypes();
  const found = list.find((c) => c.value === value);
  if (!found) return;
  document.getElementById('ctEditingValue').value = found.value;
  document.getElementById('ctLabel').value = found.label;
  document.getElementById('ctUserCalling').value = found.userCalling;
  document.getElementById('ctRootCause').value = found.rootCause;
  document.getElementById('ctTroubleshooting').value = found.troubleshooting;
  document.getElementById('ctKb').value = found.kb;
  document.getElementById('concernFormTitle').textContent = 'Edit Concern Type';
  document.getElementById('btnSaveConcernType').textContent = 'Update Concern Type';
  document.getElementById('btnCancelEditConcernType').style.display = 'inline-block';
}

function saveConcernTypeFromForm() {
  const label = document.getElementById('ctLabel').value.trim();
  if (!label) {
    alert('Please enter a name for this concern type.');
    return;
  }
  const editingValue = document.getElementById('ctEditingValue').value;
  const list = loadCustomConcernTypes();

  const entryData = {
    value: editingValue || makeUniqueConcernValue(label, list),
    label,
    userCalling: document.getElementById('ctUserCalling').value,
    rootCause: document.getElementById('ctRootCause').value,
    troubleshooting: document.getElementById('ctTroubleshooting').value,
    kb: document.getElementById('ctKb').value
  };

  const idx = list.findIndex((c) => c.value === entryData.value);
  if (idx >= 0) {
    list[idx] = entryData;
  } else {
    list.push(entryData);
  }

  if (!saveCustomConcernTypes(list)) return;

  populateCustomConcernOptions();
  renderCustomConcernList();
  resetConcernTypeForm();
}

function deleteConcernType(value) {
  if (!confirm('Delete this concern type? This cannot be undone.')) return;
  const list = loadCustomConcernTypes().filter((c) => c.value !== value);
  if (!saveCustomConcernTypes(list)) return;
  populateCustomConcernOptions();
  renderCustomConcernList();
}

function exportConcernTypes() {
  const list = loadCustomConcernTypes();
  if (list.length === 0) {
    alert('You don\'t have any custom concern types saved yet.');
    return;
  }
  const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `custom-concern-types-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importConcernTypesFromFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let imported;
    try {
      imported = JSON.parse(reader.result);
    } catch (err) {
      alert('That file is not valid JSON.');
      return;
    }
    if (!Array.isArray(imported)) {
      alert('That file does not look like a custom concern types export.');
      return;
    }

    const existing = loadCustomConcernTypes();
    const merged = existing.slice();
    let addedCount = 0;
    let updatedCount = 0;

    imported.forEach((item) => {
      if (!item || typeof item.label !== 'string') return;
      const value = typeof item.value === 'string' && item.value
        ? item.value
        : makeUniqueConcernValue(item.label, merged);
      const entryData = {
        value,
        label: item.label,
        userCalling: item.userCalling || '',
        rootCause: item.rootCause || '',
        troubleshooting: item.troubleshooting || '',
        kb: item.kb || ''
      };
      const idx = merged.findIndex((c) => c.value === entryData.value);
      if (idx >= 0) {
        merged[idx] = entryData;
        updatedCount++;
      } else {
        merged.push(entryData);
        addedCount++;
      }
    });

    if (!saveCustomConcernTypes(merged)) return;
    populateCustomConcernOptions();
    renderCustomConcernList();
    alert(`Import complete: ${addedCount} added, ${updatedCount} updated.`);
  };
  reader.onerror = () => alert('Could not read that file.');
  reader.readAsText(file);
}

function getIOSPasskeyParts() {
  return makeConcernParts({
    userCalling:
      'User is calling because user needs help with setting up a passkey on iOS device, user does not a passkey currently, impacting capability of user to log in to microsoft resources',
    rootCause:
      'Root Cause: user was not able to follow the guide on the self-service portal to add passkey on IOS device, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called in because user needs help with setting-up passkey for IOS device',
      '>user has an iPhone (enter device)',
      '>the IOS version of the device is (enter version)',
      '>went to phone settings > autofill, passwords & passkeys > made sure that authenticator is turned on ',
      '>scrolled to the bottom of the same page, and advised user to set the "set up codes" to authenticator',
      '>made sure that bluetooth is turned on, on both devices',
      '>went to a browser from the laptop of the user',
      '>guided user to go to aka.ms/mysignin',
      '>went to security info, add a passkey, select iOS, and a QR code was generated',
      '>advised user to scan the QR code using camera of the phone',
      '>passkey was added to the phone successfully',
      '>logged in to aka.ms/mysignin using the passkey on the phone to confirm that it works',
      '>was able to log in successfully',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: Yes',
      'Sensitive/Confidential Statement Provided: Yes',
      'Remote Session Completed: Yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0073293 : Cloud MFA: Phishing-resistant MFA overview'
  });
}

// not yet done
function getAndroidPasskeyParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in because device wants to enroll a passkey on android device, affecting capability of user to login to microsoft resources using the phone',
    rootCause:
      'Root cause: user was not able to find any links to follow on how to add a passkey on an android phone, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called GHD because user needs help with setting up a passkey on android device ',
      '>the model of the device that the user has is a (enter device)',
      '>the android version of the device is running Android (enter version)',
      '>went to the settings of the phone, searched for preferences, clicked on passkeys, preferred service for autofill was set to authenticator',
      '>guided user to go to aka.ms/mysignin on a browser on a laptop',
      '>clicked add a passkey, selected android, and a QR code was generated',
      '>advised user to scan the QR code using the authenticator app',
      '>was able to add passkey on phone successfully',
      '>tried logging in to aka.ms/mysignin using the passkey on the phone to confirm that it works',
      '>was able to log in successfully to resources on android phone',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0073293 : Cloud MFA: Phishing-resistant MFA overview'
  });
}

function getiOS_newParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in, because user cannot access microsoft resources on iOS device, impacting capability to access resources on phone',
    rootCause:
      'Root Cause: User is calling in because user was not able to find any links to follow, hence why user is calling GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called in because user needs help with enrolling iOS device to microsoft',
      '>user has an iPhone (enter device)',
      '>IOS version is (enter version)',
      '>stolen device protection is turned off',
      '>made sure that phone has a passkey',
      '>installed company portal',
      '>logged in to company portal',
      '>management profile installed',
      '>went to device settings',
      '>search for VPN> click on management profile',
      '>Install management profile',
      '>defender was installed',
      '>logged in to defender',
      '>checked compliance',
      '>all green, no pending actions to take',
      '>logged in to teams and outlook',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: no',
      'Sensitive/Confidential Statement Provided: no',
      'Remote Session Completed: no',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0054377 : IOS: iOS and iPadOS device enrollment'
  });
}

function getWindows_passkeyParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in, because user cannot access microsoft resources on Windows device, impacting capability to access resources on device',
    rootCause:
      'Root Cause: User is calling in because user was not able to find any links to follow to enroll passkey on windows, hence why user is calling GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called in because user needs help with enrolling a passkey on a microsoft laptop',
      '>quick assist with user',
      '>windows version is (enter OS version)',
      '>made sure that there were no pending updates',
      '>updated windows ',
      '>went to aka.ms/mysignin',
      '>added passkey ',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: Yes',
      'Sensitive/Confidential Statement Provided: Yes',
      'Remote Session Completed: Yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0073293 : Cloud MFA: Phishing-resistant MFA overview'
  });
}

function getandroid_newParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in because device wants to access resources on android device, affecting his capability to access resources on phone',
    rootCause:
      'Root cause: user is calling in because user was not able to find any links to follow to enroll phone to microsoft domain, hence why user is calling GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called because user needs help with setting up android device to access microsoft resources',
      '>user has a passkey on device',
      '>installed company portal',
      '>logged in to company portal',
      '>work profile was created',
      '>set the autofill on work profile set to authenticator',
      '>went to aka.ms/mysignin on the browser of the user',
      '>added a passkey on the browser on the work profile',
      '>scan qr code using authenticator using work profile camera',
      '>was able to add passkey on the work profile successfully',
      'logged in to company portal on work profile using passkey',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: No',
      'Sensitive/Confidential Statement Provided: No',
      'Remote Session Completed: No',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: ''
  });
}

function getwindows_deviceComplianceParts_update() {
  return makeConcernParts({
    userCalling:
      'Unable to access MS Resources, impacting capability of user to do work on the device',
    rootCause:
      'Root cause: there is an incompliance on the device of the user that is causing user to not be able to login to device, user is not aware of any self-service options, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps',
      '',
      '>user called in because user cannot access device',
      '>guided user to open quick assist',
      '>guided user to go browser and go to aka.ms/cpweb',
      '>needs the device to be updated to be able to access resources',
      '>ran updates on windows update',
      '>synced the device',
      '>restarted the device',
      '>user was able to access resources successfully, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0074812 : Windows: Windows Update, Upgrade and Troubleshooting'
  });
}
function getwindows_deviceComplianceParts_sync() {
  return makeConcernParts({
    userCalling:
      'Unable to access MS Resources, impacting capability of user to do work on the device',
    rootCause:
      'Root cause: there is an incompliance on the device of the user that is causing user to not be able to login to device, user is not aware of any self-service options, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps',
      '',
      '>user called in because user cannot access device',
      '>guided user to open quick assist',
      '>guided user to go browser and go to aka.ms/cpweb',
      '>needs the device to be synced to be able to access resources',
      '>went to device settings -> accounts -> selected microsoft account',
      '>synced the device',
      '>restarted the device',
      '>user was able to access resources successfully, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0074812 : Windows: Windows Update, Upgrade and Troubleshooting'
  });
}


function getidentity_passParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in because, user cannot sign in to microsoft resources, impacting the capability of user to access resources',
    rootCause:
      'Root cause: user does not have a passkey, user does not know any self-service links to follow, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps',
      '',
      '>user called in because user can not sign in to microsoft resources',
      '>user needs to login to device',
      '>user does not have a passkey',
      '>guided user to install identity pass',
      '>user was able to understand the process',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: No',
      'Sensitive/Confidential Statement Provided: No',
      'Remote Session Completed: No',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0072424 : Identity Pass: Identity Pass Instructions for Users'
  });
}

function getRAS_accessParts() {
  return makeConcernParts({
    userCalling:
      'User is calling in because, user cannot sign in to azure VPN, impacting the capability of user to access resources',
    rootCause:
      'Root cause: user has not created a request for RAS access yet, user does not know where to go to for this concern, hence why user called GHD ',
    troubleshooting: joinLines([
      'Troubleshooting Steps',
      '',
      '>user called in because user can not sign in to Azure VPN',
      '>user needs to login to the VPN to access resources',
      '>user has not submitted a RAS access',
      '>guided user to submit RAS acces using avdweb',
      '>went to aka.ms/coreidentity',
      '>requested for RAS access',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0024199 : RAS: How to request/review permissions (including non-FTE)'
  });
}

function getSAWParts() {
  return makeConcernParts({
    userCalling:
      ' user has a concern about his saw machine , impacting his capability to do work',
    rootCause:
      'Root cause: user is having an issue with SAW machine, does not know any self-service portal, hence why user is calling GHD ',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user is calling in for concern about saw machine',
      '>directed user to link for saw support',
      '>https://cloudmfa.support.windows.net/SawSupportServices/SawSupport',
      '>user was able to understand the process',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: No',
      'Sensitive/Confidential Statement Provided: No',
      'Remote Session Completed: No',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0074976 : SAW: New Support Overview'
  });
}

function getWindows_ActivationParts() {
  return makeConcernParts({
    userCalling:
      ' user called in because there is an error with the license for the Operating System',
    rootCause:
      'Root cause: the device of user has pending windows update, synced device to intune, user was not aware of any Self-service options to follow, hence why user called GHD ',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called in because there is an error with the license for the Operating System',
      '>quick assist with user',
      '>updated windows ',
      '>connected to azure VPN',
      '>synced the device',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0074812 : Windows: Windows Update, Upgrade and Troubleshooting'
  });
}

function getAzureVPN_taskbarParts() {
  return makeConcernParts({
    userCalling:
      ' User is having issues with not being able to connect to Azure VPN, impacting capability of user to do work',
    rootCause:
      'Root cause: user was connecting via the taskbar, not the client, user was not aware of any self-service portal to follow, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user was not able to connect to Azure VPN',
      '>guided user to open quick assist',
      '>user was connecting via the taskbar, not the client',
      '>advised user to connect via the client',
      '>user was able to sync and connect to azure VPN successfully',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb: 'KB0071771 : Azure VPN'
  });
}

function getDeletedDeviceParts() {
  return makeConcernParts({
    userCalling:
      ' user has an old laptop that user cannot connect to, impacting capability of the user to do work',
    rootCause:
      'Root cause: user cannot access resources on phone, user tried to use self-service options, but was not able to do so, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called because user can not access resources on device',
      '>quick assist with user',
      '>device is deleted upon checking compliance',
      '>reset the device',
      '>user has a passkey on phone',
      '>logged in to newly reset device',
      '>user confirmed that issue is resolved, hence closing the ticket',
      '',
      'Remote Session Permission: yes',
      'Sensitive/Confidential Statement Provided: yes',
      'Remote Session Completed: yes',
      'Issue Resolved: Yes',
      'User Confirmed Resolution: Yes',
      'Permission to Close Ticket: Yes'
    ]),
    kb:
      'KB0069799 : Windows 11: Your Organization has deleted\\disabled your device and/or lost corpnet connection (no MSFTVPN) due to a long inactivity in the corporate network'
  });
}

function getDisabledDeviceParts() {
  return makeConcernParts({
    userCalling:
      ' user has an old laptop that user cannot connect to, impacting capability of the user to do work',
    rootCause:
      'Root cause: user cannot access resources on phone, user tried to use self-service options, but was not able to do so, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user called because user can not access resources on device',
      '>quick assist with user',
      '>device is disabled upon checking compliance',
      '>attached image',
      '>needs help of the accounts team',
      
      
    ]),
    kb:
      'KB0069799 : Windows 11: Your Organization has deleted\\disabled your device and/or lost corpnet connection (no MSFTVPN) due to a long inactivity in the corporate network'
  });
}

function getbitlockParts() {
  return makeConcernParts({
    userCalling:
      ' user called because user cannot access windows device, it is on bitlock, impacting the capability of user to do work',
    rootCause:
      'Root cause:  user called GHD because bitlocker key for device was not available on self-service portal, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user is in bitlock',
'>user was not able to get recovery key on self-service portal',
'>device is not listed',
'>authenticated',
'>user sent the recovery on teams',
'>waiting for the bitlock key request',
'>will ping user once key is available',
 
      
    ]),
    kb:
      
'KB0065685 : BitLocker: Retrieve Your BitLocker Key'
  });
}

function getvalidphonesParts() {
  return makeConcernParts({
    userCalling:
      ' user called because user cannot access resources on android device, impacting the capability of user to access resources on phone',
    rootCause:
      'Root cause:  user called GHD because user was not aware of any self-service links to follow, hence why user called GHD',
    troubleshooting: joinLines([
      'Troubleshooting Steps:',
      '',
      '>user is in bitlock',
'>user was not able to get recovery key on self-service portal',
'>device is not listed',
'>authenticated',
'>user sent the recovery on teams',
'>waiting for the bitlock key request',
'>will ping user once key is available',
 
      
    ]),
    kb:
      
'KB0065685 : BitLocker: Retrieve Your BitLocker Key'
  });
}    

function getConcernPartsByType(type) {
  const custom = getCustomConcernPartsByType(type);
  if (custom) return custom;

  if (type === 'ios_passkey') return getIOSPasskeyParts();
  if (type === 'valid_phones') return getvalidphonesParts();
  if (type === 'bitlock') return getbitlockParts();
  if (type === 'android_passkey') return getAndroidPasskeyParts();
  if (type === 'iOS_new') return getiOS_newParts();
  if (type === 'windows_passkey') return getWindows_passkeyParts();
  if (type === 'android_new') return getandroid_newParts();
  if (type === 'identity_pass') return getidentity_passParts();
  if (type === 'RAS_access') return getRAS_accessParts();
  if (type === 'SAW') return getSAWParts();
  if (type === 'windows_deviceCompliance_update') return getwindows_deviceComplianceParts_update();
  if (type === 'windows_deviceCompliance_sync') return getwindows_deviceComplianceParts_sync();
  if (type === 'windows_Activation') return getWindows_ActivationParts();
  if (type === 'AzureVPN_taskbar') return getAzureVPN_taskbarParts();
  if (type === 'Deleted_device') return getDeletedDeviceParts();

  return makeConcernParts({
    userCalling: 'Select a concern type.',
    rootCause: '',
    troubleshooting: '',
    kb: ''
  });
}

function buildUserInfo(entry) {
  let rootCause = entry.querySelector('.rootCauseInfo').value.trim();
  // If input is exactly 'root cause' (with or without colon/space), display only 'Root cause:'
  if (/^root cause[:：]?\s*$/i.test(rootCause)) {
    rootCause = 'Root cause:';
  } else if (/^root cause[:：]?/i.test(rootCause)) {
    // If input starts with 'Root cause:' and has more text, display as is (normalize label)
    rootCause = rootCause.replace(/^root cause[:：]?\s*/i, 'Root cause: ');
  } else if (rootCause.length > 0) {
    // Otherwise, prepend label
    rootCause = 'Root cause: ' + rootCause;
  }
  return [
    rootCause,
    `Time Zone: ${entry.querySelector('.timezone').value}`,
    `Business Hours: ${entry.querySelector('.businessHours').value}`,
    `Best Contact Number: ${entry.querySelector('.bestContactNumber').value}`,
    `Alternate Contact Number: ${entry.querySelector('.alternateContactNumber').value}`
  ].join('\n');
}

async function copy(text, btn) {
  await navigator.clipboard.writeText(text);
  if (btn) {
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = old;
      btn.disabled = false;
    }, 800);
  }
}

function fillConcernOutputs(entry, parts) {
  entry.querySelector('.userCallingOutput').value = parts.userCalling || '';
  entry.querySelector('.rootCauseOutput').value = parts.rootCause || '';
  entry.querySelector('.troubleshootingOutput').value = parts.troubleshooting || '';
  entry.querySelector('.kbOutput').value = parts.kb || '';

  // Hidden legacy output (optional combined)
  const legacy = [
    parts.userCalling,
    '',
    parts.rootCause,
    '',
    parts.troubleshooting,
    '',
    parts.kb
  ].filter(Boolean).join('\n');
  entry.querySelector('.concernOutput').textContent = legacy;
}

function addEntry() {
  entryCount++;
  const node = tpl.content.firstElementChild.cloneNode(true);
  node.querySelector('.entryNumber').textContent = entryCount;
  entriesEl.appendChild(node);

  // Populate any saved custom concern types into this entry's dropdown
  populateCustomConcernOptions(node.querySelector('select.concernType'));

  // Initialize empty outputs
  fillConcernOutputs(node, makeConcernParts({}));
}

entriesEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const entry = btn.closest('.entry');
  const action = btn.dataset.action;

  if (action === 'display') {
    entry.querySelector('.userOutput').textContent = buildUserInfo(entry);
  }

  if (action === 'copy') {
    const out = entry.querySelector('.userOutput');
    if (!out.textContent.trim()) {
      out.textContent = buildUserInfo(entry);
    }
    await copy(out.textContent, btn);
  }

  if (action === 'steps') {
    const type = entry.querySelector('.concernType').value;
    const parts = getConcernPartsByType(type);
    fillConcernOutputs(entry, parts);
  }

  // Copy (Free text / Full output)
  if (action === 'copy-steps') {
    const issue = entry.querySelector('.issueText').value.trim();
    if (issue) {
      await copy(issue, btn);
      return;
    }

    // If free text empty, copy the combined hidden output instead
    const legacyOut = entry.querySelector('.concernOutput');
    if (!legacyOut.textContent.trim()) {
      btn.closest('.card').querySelector('[data-action="steps"]').click();
    }
    await copy(legacyOut.textContent, btn);
  }

  // NEW: dedicated copy buttons per textbox
  if (action === 'copy-usercalling') {
    await copy(entry.querySelector('.userCallingOutput').value, btn);
  }
  if (action === 'copy-rootcause') {
    await copy(entry.querySelector('.rootCauseOutput').value, btn);
  }
  if (action === 'copy-troubleshooting') {
    await copy(entry.querySelector('.troubleshootingOutput').value, btn);
  }
  if (action === 'copy-kb') {
    await copy(entry.querySelector('.kbOutput').value, btn);
  }
  if (action === 'copy-freetext') {
    await copy(entry.querySelector('.issueText').value, btn);
  }

  if (action === 'remove') {
    // Store entry data for undo including all form values
    const inputs = entry.querySelectorAll('input, textarea, select');
    const formData = {};
    inputs.forEach(input => {
      formData[input.className] = input.value;
    });
    removedEntryData = {
      html: entry.outerHTML,
      formData: formData,
      entryNumber: entry.querySelector('.entryNumber').textContent
    };
    entry.remove();
    document.getElementById('btnUndoRemove').style.display = 'inline-block';
  }
  if (action === 'toggle') entry.classList.toggle('collapsed');

  // Toggle free text visibility
  if (action === 'toggle-free-text') {
    const freeText = entry.querySelector('.freeTextDetails');
    const concernDetails = entry.querySelector('.concernDetails');
    const btn = entry.querySelector('[data-action="toggle-free-text"]');
    const textarea = entry.querySelector('.issueText');
    if (freeText.style.display === 'none') {
      // Pre-fill template if empty
      if (!textarea.value.trim()) {
        textarea.value ='Troubleshooting Steps:\n\n\n\n \nRemote Session Permission: Yes\nSensitive/Confidential Statement Provided: Yes\nRemote Session Completed: Yes\nIssue Resolved: Yes\nUser Confirmed Resolution: Yes\nPermission to Close Ticket: Yes';
      }
      freeText.style.display = 'block';
      concernDetails.style.display = 'none';
      btn.textContent = 'Hide Free Text';
    } else {
      freeText.style.display = 'none';
      concernDetails.style.display = 'block';
      btn.textContent = 'Show Free Text';
    }
  }

  // Copy Troubleshooting Steps
  if (action === 'copy-troubleshooting') {
    const textarea = entry.querySelector('.issueText');
    await copy(textarea.value, btn);
  }

  // Copy Escalation
  if (action === 'copy-escalation') {
    const textarea = entry.querySelector('.escalationText');
    await copy(textarea.value, btn);
  }

  // Copy Task Request
  if (action === 'copy-taskRequest') {
    const textarea = entry.querySelector('.taskRequestText');
    await copy(textarea.value, btn);
  }

  // Copy Bitlocker
  if (action === 'copy-bitlocker') {
    const textarea = entry.querySelector('.bitlockerText');
    await copy(textarea.value, btn);
  }

  // Copy Hardware Escalation
  if (action === 'copy-hardwareEscalation') {
    const textarea = entry.querySelector('.hardwareEscalationText');
    await copy(textarea.value, btn);
  }

  // Copy Teams Escalation
  if (action === 'copy-teamsEscalation') {
    const textarea = entry.querySelector('.teamsEscalationText');
    await copy(textarea.value, btn);
  }

  // Copy Outlook and Mailbox Escalation
  if (action === 'copy-outlookEscalation') {
    const textarea = entry.querySelector('.outlookEscalationText');
    await copy(textarea.value, btn);
  }

  // Copy SWAT Approval
  if (action === 'copy-swatApproval') {
    const textarea = entry.querySelector('.swatApprovalText');
    await copy(textarea.value, btn);
  }
});

// Handle tab selection dropdown change
entriesEl.addEventListener('change', async (e) => {
  if (e.target.classList.contains('tabSelect')) {
    const entry = e.target.closest('.entry');
    const troubleshootingContent = entry.querySelector('.troubleshootingContent');
    const escalationContent = entry.querySelector('.escalationContent');
    const taskRequestContent = entry.querySelector('.taskRequestContent');
    const bitlockerContent = entry.querySelector('.bitlockerContent');
    const hardwareEscalationContent = entry.querySelector('.hardwareEscalationContent');
    const teamsEscalationContent = entry.querySelector('.teamsEscalationContent');
    const outlookEscalationContent = entry.querySelector('.outlookEscalationContent');
    const swatApprovalContent = entry.querySelector('.swatApprovalContent');
    const escalationTextarea = entry.querySelector('.escalationText');
    const taskRequestTextarea = entry.querySelector('.taskRequestText');
    const bitlockerTextarea = entry.querySelector('.bitlockerText');
    const hardwareEscalationTextarea = entry.querySelector('.hardwareEscalationText');
    const teamsEscalationTextarea = entry.querySelector('.teamsEscalationText');
    const outlookEscalationTextarea = entry.querySelector('.outlookEscalationText');
    const swatApprovalTextarea = entry.querySelector('.swatApprovalText');
    if (e.target.value === 'troubleshooting') {
      troubleshootingContent.style.display = 'block';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
    } else if (e.target.value === 'escalation') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'block';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
      // Pre-fill escalation template if empty
      if (!escalationTextarea.value.trim()) {
        escalationTextarea.value = 'Issue (I) - \nError Message (E) - \nCause (C) - \nTroubleshooting Steps:\n\n\nBug Number (BN) -\nSystem Info (SI) -';
      }
    } else if (e.target.value === 'taskRequest') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'block';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
      // Pre-fill task request template if empty
      if (!taskRequestTextarea.value.trim()) {
        taskRequestTextarea.value = 'Ticket number:  \nDevice Model:  \nAsset number:  \nSerial Number:  \nPhone number:  \nUser location:  \nOrg location:  \nTime Zone:  \navailability going onsite:  ';
      }
    } else if (e.target.value === 'bitlocker') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'block';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
      // Pre-fill bitlocker template if empty
      if (!bitlockerTextarea.value.trim()) {
        bitlockerTextarea.value = "Caller\'s Alias :  \nComplete Recovery Key ID:  \nUser\'s Domain -  \nComputer\'s Domain:   \nFull Computer Name:  \nAuthenticated - YES  \nWhy Did Self Service Fail? Aka.ms/CPWEB:  \nTicket# ";
      }
    } else if (e.target.value === 'hardwareEscalation') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'block';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
      // Pre-fill hardware escalation template if empty
      if (!hardwareEscalationTextarea.value.trim()) {
        hardwareEscalationTextarea.value = 'Issue (I) -  \nError Message (E) -NA  \nCause (C)- NA  \nTroubleshooting (TS)-  \n \nBug Number (BN)- NA  \nSystem Info (SI)- Attached  \n \n1. What happened when the issue first occurred? Did the computer freeze, shut down, or display an error message? : n/a  \n2. Are there any physical damages to the computer, spills, overheating, or any other issues? : na  \n3. Are there any unusual sounds or smells coming from the computer? : n/a  \n4. Does the issue happen consistently, or is it intermittent? : n/a  \n5. Have you tried restarting the computer? Did the issue go away temporarily or persist? : n/a  \n \nSteps followed with the user during troubleshooting:  \n \nDisconnect all peripherals from the computer (keyboard, mouse, external monitor, USB devices, printer, docking station, power supply, etc.)  \nConnect the power supply, and confirm that is correctly plugged in and it is connected on a working power outlet  \nRestart the computer only with the power supply connected  \nComputer is powered on does not boot into Windows  \nComputer does not turn on at all  \nDocument ticket with these troubleshooting steps (check and use the button below to generate steps followed)  \nGet SME\'s approval for escalation to CIM Hardware on the ticket  \nEscalate ticket to CIM Hardware  \n \nModel:  \nAsset number :  \nSerial Number :  \nPhone number:   \nUser location :  \nOrganization location:   ';
      }
    } else if (e.target.value === 'teamsEscalation') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'block';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'none';
      // Pre-fill teams escalation template if empty
      if (!teamsEscalationTextarea.value.trim()) {
        teamsEscalationTextarea.value = 'Issue reported  \n \nError message and Valid Screenshots  \n \nPlatform where the issue is reported  \n \nNature of issue [ Connectivity , calls , Audio or any other issue ]  \n';
      }
    } else if (e.target.value === 'outlookEscalation') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'block';
      swatApprovalContent.style.display = 'none';
      // Pre-fill outlook escalation template if empty
      if (!outlookEscalationTextarea.value.trim()) {
        outlookEscalationTextarea.value = 'Email Address of the affected Mailbox  \n \nIssue reported [ Outlook Classic app or Outlook new app ]  \n \nPlatform where the issue is reported [ Windows / MAC / iOS / Android ]  \n \nError message and valid Screenshots  \n';
      }
    } else if (e.target.value === 'swatApproval') {
      troubleshootingContent.style.display = 'none';
      escalationContent.style.display = 'none';
      taskRequestContent.style.display = 'none';
      bitlockerContent.style.display = 'none';
      hardwareEscalationContent.style.display = 'none';
      teamsEscalationContent.style.display = 'none';
      outlookEscalationContent.style.display = 'none';
      swatApprovalContent.style.display = 'block';
      // Pre-fill SWAT approval template if empty
      if (!swatApprovalTextarea.value.trim()) {
        swatApprovalTextarea.value = 'Issue Summary:  \n \nLocation:   \n \nUser Details:  \n \nTroubleshooting Done:  \n \nDevice Details:  \n';
      }
    }
  }
});

document.getElementById('btnAddEntry').onclick = addEntry;
document.getElementById('btnUndoRemove').onclick = () => {
  if (removedEntryData) {
    const temp = document.createElement('div');
    temp.innerHTML = removedEntryData.html;
    const restoredEntry = temp.firstElementChild;
    entriesEl.appendChild(restoredEntry);
    // Restore form values
    const inputs = restoredEntry.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (removedEntryData.formData[input.className] !== undefined) {
        input.value = removedEntryData.formData[input.className];
      }
    });
    removedEntryData = null;
    document.getElementById('btnUndoRemove').style.display = 'none';
  }
};
document.getElementById('btnCollapseAll').onclick = () =>
  document.querySelectorAll('.entry').forEach((e) => e.classList.add('collapsed'));
document.getElementById('btnExpandAll').onclick = () =>
  document.querySelectorAll('.entry').forEach((e) => e.classList.remove('collapsed'));

// Dark mode toggle
const darkToggle = document.getElementById('darkModeToggle');
if (darkToggle) {
  darkToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
  });
}

// Manage Concern Types modal wiring
const btnManageConcernTypes = document.getElementById('btnManageConcernTypes');
if (btnManageConcernTypes) {
  btnManageConcernTypes.onclick = openConcernTypeModal;
}
const btnCloseConcernTypeModal = document.getElementById('btnCloseConcernTypeModal');
if (btnCloseConcernTypeModal) {
  btnCloseConcernTypeModal.onclick = closeConcernTypeModal;
}
const btnSaveConcernType = document.getElementById('btnSaveConcernType');
if (btnSaveConcernType) {
  btnSaveConcernType.onclick = saveConcernTypeFromForm;
}
const btnCancelEditConcernType = document.getElementById('btnCancelEditConcernType');
if (btnCancelEditConcernType) {
  btnCancelEditConcernType.onclick = resetConcernTypeForm;
}
const concernTypeModal = document.getElementById('concernTypeModal');
if (concernTypeModal) {
  // Close when clicking the dark overlay itself (not the box inside it)
  concernTypeModal.addEventListener('click', (e) => {
    if (e.target === concernTypeModal) closeConcernTypeModal();
  });
}
const customConcernListEl = document.getElementById('customConcernList');
if (customConcernListEl) {
  customConcernListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ct-action]');
    if (!btn) return;
    const value = btn.dataset.value;
    if (btn.dataset.ctAction === 'edit') loadConcernTypeIntoForm(value);
    if (btn.dataset.ctAction === 'delete') deleteConcernType(value);
  });
}
const btnExportConcernTypes = document.getElementById('btnExportConcernTypes');
if (btnExportConcernTypes) {
  btnExportConcernTypes.onclick = exportConcernTypes;
}
const ctImportFileInput = document.getElementById('ctImportFileInput');
const btnImportConcernTypes = document.getElementById('btnImportConcernTypes');
if (btnImportConcernTypes && ctImportFileInput) {
  btnImportConcernTypes.onclick = () => ctImportFileInput.click();
  ctImportFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) importConcernTypesFromFile(file);
    ctImportFileInput.value = '';
  });
}

// Load any previously saved custom concern types into the dropdowns
populateCustomConcernOptions();

addEntry();
