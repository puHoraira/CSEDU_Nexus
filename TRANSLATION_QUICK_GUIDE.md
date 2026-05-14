# Translation Implementation Quick Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Import the Hook
```typescript
import { useTranslation } from 'react-i18next';
```

### Step 2: Use in Component
```typescript
function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <Button>{t('common.save')}</Button>
    </div>
  );
}
```

### Step 3: Add Keys to Translation Files
```json
// frontend/src/i18n/locales/en.json
{
  "common": {
    "title": "My Title",
    "save": "Save"
  }
}

// frontend/src/i18n/locales/bn.json
{
  "common": {
    "title": "আমার শিরোনাম",
    "save": "সংরক্ষণ করুন"
  }
}
```

---

## 📋 Common Patterns

### Basic Text
```typescript
<h1>{t('dashboard.welcome')}</h1>
<p>{t('dashboard.description')}</p>
```

### With Variables
```typescript
<p>{t('common.greeting', { name: user.firstName })}</p>
// Translation: "Hello, {{name}}!"
```

### With Count (Pluralization)
```typescript
<p>{t('events.attendees', { count: 5 })}</p>
// Translation: "{{count}} attendees"
```

### Button Labels
```typescript
<Button>{t('common.save')}</Button>
<Button>{t('common.cancel')}</Button>
<Button>{t('common.delete')}</Button>
```

### Form Labels
```typescript
<label>{t('profile.firstName')}</label>
<input placeholder={t('profile.enterFirstName')} />
```

### Status Badges
```typescript
<Badge>{t(`common.${status.toLowerCase()}`)}</Badge>
// status = "Active" → t('common.active')
```

### Empty States
```typescript
<EmptyState
  title={t('events.noEvents')}
  description={t('events.noEventsDescription')}
  action={t('events.createEvent')}
/>
```

### Error Messages
```typescript
toast.error(t('messages.saveError'));
toast.success(t('messages.saveSuccess'));
```

### Conditional Text
```typescript
{isLoading ? t('common.loading') : t('common.loaded')}
```

---

## 🎨 Translation Key Naming Convention

### Structure
```
{feature}.{component}.{element}
```

### Examples
```typescript
// Good ✅
t('elections.votingPage.castVote')
t('dashboard.statsCard.totalMembers')
t('events.createForm.eventName')

// Bad ❌
t('text1')
t('button')
t('label')
```

### Common Prefixes
- `common.*` - Shared across all pages (buttons, actions, status)
- `nav.*` - Navigation menu items
- `header.*` - Header elements
- `dashboard.*` - Dashboard page
- `elections.*` - Elections feature
- `events.*` - Events feature
- `forms.*` - Form validation messages
- `messages.*` - Toast/alert messages

---

## 📦 Available Translation Keys

### Common UI (Use These First!)
```typescript
// Actions
t('common.save')
t('common.cancel')
t('common.delete')
t('common.edit')
t('common.view')
t('common.create')
t('common.update')
t('common.submit')
t('common.close')
t('common.back')

// Status
t('common.active')
t('common.inactive')
t('common.pending')
t('common.completed')
t('common.cancelled')
t('common.draft')

// General
t('common.loading')
t('common.error')
t('common.success')
t('common.noData')
t('common.search')
t('common.filter')
```

### Elections (Comprehensive)
```typescript
t('elections.title')
t('elections.createElection')
t('elections.vote')
t('elections.castVote')
t('elections.results')
t('elections.candidates')
t('elections.phase1')
t('elections.phase2')
t('elections.votingNotActive')
t('elections.alreadyVoted')
t('elections.maxVotesAllowed', { count: 5 })
// ... 80+ more keys available
```

### Dashboard
```typescript
t('dashboard.welcome')
t('dashboard.overview')
t('dashboard.statistics')
t('dashboard.recentActivity')
t('dashboard.upcomingEvents')
t('dashboard.totalMembers')
t('dashboard.activeMembers')
// ... 30+ more keys available
```

---

## 🔍 Finding Translation Keys

### Method 1: Check Translation Files
Look in `frontend/src/i18n/locales/en.json` for available keys.

### Method 2: Search Existing Usage
```bash
# Search for translation usage in codebase
grep -r "t('elections" frontend/src/
```

### Method 3: Check Documentation
See `LANGUAGE_SYSTEM_STATUS.md` for complete list of available keys.

---

## 🐛 Troubleshooting

### Key Not Found
**Problem**: Shows key name instead of translation (e.g., "elections.vote")

**Solution**: 
1. Check if key exists in both `en.json` and `bn.json`
2. Restart dev server if you just added the key
3. Check for typos in key name

### Bangla Text Overflow
**Problem**: Bangla text breaks layout

**Solution**:
```css
.element {
  word-break: break-word;
  overflow-wrap: break-word;
}
```

### Language Not Switching
**Problem**: Language toggle doesn't work

**Solution**:
1. Check if component uses `useTranslation()` hook
2. Verify translation keys exist in both languages
3. Check browser console for errors

---

## ✅ Before/After Examples

### Before (Hardcoded)
```typescript
function ElectionCard({ election }) {
  return (
    <div>
      <h2>{election.name}</h2>
      <p>Status: {election.status}</p>
      <Button>Vote Now</Button>
      <Button>View Results</Button>
    </div>
  );
}
```

### After (Translated)
```typescript
function ElectionCard({ election }) {
  const { t } = useTranslation();
  
  return (
    <div>
      <h2>{election.name}</h2>
      <p>{t('common.status')}: {t(`elections.${election.status.toLowerCase()}`)}</p>
      <Button>{t('elections.vote')}</Button>
      <Button>{t('elections.viewResults')}</Button>
    </div>
  );
}
```

---

## 📝 Checklist for Translating a Page

- [ ] Import `useTranslation` hook
- [ ] Add `const { t } = useTranslation()` in component
- [ ] Replace all hardcoded strings with `t('key')`
- [ ] Add missing keys to `en.json`
- [ ] Add Bangla translations to `bn.json`
- [ ] Test in English mode
- [ ] Test in Bangla mode
- [ ] Check mobile responsive with Bangla text
- [ ] Verify no layout breaks
- [ ] Check for missing translation keys (shows key name)

---

## 🎯 Priority Pages to Translate

### High Priority (Do First)
1. Dashboard home page
2. Elections voting page
3. Elections results page
4. Events list page
5. Profile page

### Medium Priority
1. Event detail page
2. Workshop pages
3. Meeting pages
4. Certificate pages

### Low Priority
1. Admin pages
2. Settings pages
3. Reports pages

---

## 💡 Pro Tips

1. **Use semantic keys**: `elections.votingPeriod` not `elections.text1`
2. **Group by feature**: All election strings under `elections.*`
3. **Reuse common strings**: Don't duplicate "Save", "Cancel", etc.
4. **Test both languages**: Bangla text is often longer
5. **Handle missing keys**: Show key name as fallback (already configured)
6. **Use interpolation**: `{{name}}`, `{{count}}` for dynamic values
7. **Keep translations short**: Especially for buttons and labels
8. **Be consistent**: Same term = same translation everywhere

---

## 📚 Resources

- Translation files: `frontend/src/i18n/locales/`
- Language context: `frontend/src/i18n/LanguageContext.tsx`
- i18n config: `frontend/src/i18n/config.ts`
- Full status: `LANGUAGE_SYSTEM_STATUS.md`

---

## 🚀 Quick Commands

```bash
# Search for translation usage
grep -r "useTranslation" frontend/src/

# Find hardcoded strings (basic check)
grep -r "\"[A-Z]" frontend/src/pages/

# Count translation keys
cat frontend/src/i18n/locales/en.json | grep -c ":"
```

---

**Happy Translating! 🌐**
