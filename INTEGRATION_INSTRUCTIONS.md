# Integration Instructions for Separate Modals

## Current Issue
The "Prospects" button in Header.tsx calls `openSearchEntityModal()` which opens the **combined** SearchEntityModal (showing both accounts and prospects).

## What Needs to Change

### 1. AuthContext.tsx Updates Needed

Add these new state variables (around line 100, with other useState):
```typescript
const [showAccountsModal, setShowAccountsModal] = useState<boolean>(false);
const [showProspectsModal, setShowProspectsModal] = useState<boolean>(false);
```

Add these to the AuthContextType interface (around line 50):
```typescript
showAccountsModal: boolean;
showProspectsModal: boolean;
openAccountsModal: () => void;
closeAccountsModal: () => void;
openProspectsModal: () => void;
closeProspectsModal: () => void;
```

Add these to the default context value (around line 75):
```typescript
showAccountsModal: false,
showProspectsModal: false,
openAccountsModal: () => {},
closeAccountsModal: () => {},
openProspectsModal: () => {},
closeProspectsModal: () => {},
```

Add these functions (around line 900, with other modal functions):
```typescript
const openAccountsModal = () => {
  setShowAccountsModal(true);
};

const closeAccountsModal = () => {
  setShowAccountsModal(false);
};

const openProspectsModal = () => {
  setShowProspectsModal(true);
};

const closeProspectsModal = () => {
  setShowProspectsModal(false);
};
```

Add these to the Provider value (at the end, around line 950):
```typescript
showAccountsModal,
showProspectsModal,
openAccountsModal,
closeAccountsModal,
openProspectsModal,
closeProspectsModal,
```

### 2. App.tsx Updates

Add these imports at the top:
```typescript
import AccountsSearchModal from './components/AccountsSearchModal';
import ProspectsSearchModal from './components/ProspectsSearchModal';
```

Update AppContent to destructure the new values:
```typescript
const { 
  // ... existing destructuring ...
  showAccountsModal,
  showProspectsModal,
  closeAccountsModal,
  closeProspectsModal
} = useAuth();
```

Add these modals alongside SearchEntityModal (around line 380):
```typescript
{/* Accounts Search Modal - For staff to search accounts only */}
{showAccountsModal && (
  <AccountsSearchModal
    isOpen={showAccountsModal}
    onClose={closeAccountsModal}
    onSelectAccount={selectCustomerAccount}
  />
)}

{/* Prospects Search Modal - For staff to search prospects only */}
{showProspectsModal && (
  <ProspectsSearchModal
    isOpen={showProspectsModal}
    onClose={closeProspectsModal}
  />
)}
```

### 3. Header.tsx Updates

Update the destructuring to include new functions:
```typescript
const { user, logout, isDemoMode, staffUsername, openAccountsModal, openProspectsModal } = useAuth();
```

Replace the single "Prospects" button with TWO separate buttons:
```typescript
{/* Accounts Search - Only for staff users */}
{!isDemoMode && staffUsername && (
  <button
    onClick={openAccountsModal}
    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
  >
    <Users className="h-4 w-4 mr-2" />
    Accounts
  </button>
)}

{/* Prospects Search - Only for staff users */}
{!isDemoMode && staffUsername && (
  <button
    onClick={openProspectsModal}
    className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50"
  >
    <Users className="h-4 w-4 mr-2" />
    Prospects
  </button>
)}
```

## Summary

You'll have **THREE working modals**:
1. **SearchEntityModal** (original) - Combined view, still accessible
2. **AccountsSearchModal** (new) - Accounts only, blue theme
3. **ProspectsSearchModal** (new) - Prospects only, green theme

The Header will show TWO buttons for staff users:
- "Accounts" button → Opens AccountsSearchModal
- "Prospects" button → Opens ProspectsSearchModal

Would you like me to make these changes for you?
