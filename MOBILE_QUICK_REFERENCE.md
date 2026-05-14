# Mobile Responsive Quick Reference

## Breakpoints
```css
/* Small Mobile */
@media (max-width: 480px) { }

/* Mobile */
@media (max-width: 768px) { }

/* Tablet */
@media (max-width: 1024px) { }

/* Desktop */
@media (min-width: 1025px) { }
```

## Touch Targets
- **Minimum Size**: 44px × 44px
- **Buttons**: 44px height minimum
- **Icons**: 44px × 44px
- **Navigation Items**: 44px height

## Typography
- **Body Text**: 15-16px on mobile
- **Inputs**: 16px (prevents iOS zoom)
- **Small Text**: 0.8-0.85rem
- **Headings**: Use `clamp()` for responsive sizing

## Spacing
- **Mobile Padding**: 12-16px
- **Mobile Gaps**: 8-12px
- **Card Padding**: 14-16px
- **Content Padding**: 16px

## Layouts

### Grid Systems
```css
/* Desktop: 4 columns */
.grid-4 { grid-template-columns: repeat(4, 1fr); }

/* Tablet: 2 columns */
@media (max-width: 1024px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}

/* Mobile: 1 column */
@media (max-width: 768px) {
  .grid-4 { grid-template-columns: 1fr; }
}
```

### Two-Column Layouts
```css
/* Desktop */
.two-column {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}

/* Mobile */
@media (max-width: 1100px) {
  .two-column {
    grid-template-columns: 1fr;
  }
}
```

## Utility Classes

### Visibility
- `.hide-mobile` - Hide on mobile
- `.show-mobile` - Show only on mobile
- `.hide-tablet` - Hide on tablet
- `.show-tablet` - Show only on tablet

### Layout
- `.flex-mobile-column` - Stack vertically on mobile
- `.w-mobile-full` - Full width on mobile
- `.text-mobile-center` - Center text on mobile

### Spacing
- `.gap-mobile-sm` - 8px gap on mobile
- `.gap-mobile-md` - 12px gap on mobile
- `.gap-mobile-lg` - 16px gap on mobile
- `.p-mobile-sm` - 12px padding on mobile

### Touch
- `.ui-touch-target` - 44px minimum size

## Common Patterns

### Responsive Card
```tsx
<div className="card" style={{
  padding: '18px',
  borderRadius: '18px',
}}>
  {/* Content */}
</div>

/* CSS */
@media (max-width: 768px) {
  .card {
    padding: 14px;
    borderRadius: 14px;
  }
}
```

### Responsive Grid
```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '20px',
}}>
  {/* Items */}
</div>

/* CSS */
@media (max-width: 768px) {
  [style*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
    gap: 16px;
  }
}
```

### Responsive Button Group
```tsx
<div className="button-row">
  <button>Action 1</button>
  <button>Action 2</button>
</div>

/* CSS */
@media (max-width: 768px) {
  .button-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .button-row button {
    width: 100%;
  }
}
```

### Responsive Form
```tsx
<div className="form-grid">
  <div className="field">
    <label>Name</label>
    <input type="text" />
  </div>
  <div className="field">
    <label>Email</label>
    <input type="email" />
  </div>
</div>

/* CSS */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .field input {
    font-size: 16px; /* Prevents iOS zoom */
    min-height: 44px;
  }
}
```

## iOS Safari Fixes

### Viewport Height
```tsx
// In component
useEffect(() => {
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  
  setVH();
  window.addEventListener('resize', setVH);
  return () => window.removeEventListener('resize', setVH);
}, []);

// In CSS
.full-height {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
}
```

### Input Zoom Prevention
```css
input, select, textarea {
  font-size: 16px !important;
}
```

### Safe Area Support
```css
.header {
  padding-top: env(safe-area-inset-top);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Android Chrome Fixes

### Address Bar Height
```css
.sidebar {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
}
```

## Performance Tips

### Hardware Acceleration
```css
.animated-element {
  transform: translateZ(0);
  will-change: transform;
}
```

### Smooth Scrolling
```css
.scrollable {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility

### Focus Indicators
```css
@media (max-width: 768px) {
  button:focus,
  a:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}
```

### Touch Feedback
```css
@media (hover: none) and (pointer: coarse) {
  button:active {
    transform: scale(0.97);
  }
}
```

## Testing Commands

### Chrome DevTools
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Select device or set custom dimensions
4. Test touch events

### Responsive Breakpoints
- iPhone SE: 375px × 667px
- iPhone 12/13: 390px × 844px
- iPhone 14 Pro Max: 430px × 932px
- iPad: 768px × 1024px
- iPad Pro: 1024px × 1366px

## Common Issues & Solutions

### Issue: Text too small on mobile
```css
/* Solution */
@media (max-width: 768px) {
  body { font-size: 15px; }
  .text-sm { font-size: 0.85rem; }
}
```

### Issue: Buttons too small to tap
```css
/* Solution */
@media (max-width: 768px) {
  button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 16px;
  }
}
```

### Issue: Layout breaks on mobile
```css
/* Solution */
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr !important;
    flex-direction: column;
  }
}
```

### Issue: Images overflow container
```css
/* Solution */
img {
  max-width: 100%;
  height: auto;
}
```

### Issue: Horizontal scroll on mobile
```css
/* Solution */
body {
  overflow-x: hidden;
}

* {
  max-width: 100%;
}
```

## Quick Checklist

### Before Deploying
- [ ] Test on real mobile devices
- [ ] Check all touch targets (44px minimum)
- [ ] Verify input font size (16px)
- [ ] Test forms without zoom
- [ ] Check image scaling
- [ ] Test navigation
- [ ] Verify modals work
- [ ] Check table scrolling
- [ ] Test landscape orientation
- [ ] Verify safe area support

### Performance
- [ ] Images optimized
- [ ] CSS minified
- [ ] Animations optimized
- [ ] Reduced motion support
- [ ] Touch scrolling smooth

### Accessibility
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color contrast sufficient

## Resources

### Documentation
- [MDN: Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Web.dev: Mobile Performance](https://web.dev/mobile/)
- [Apple: iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design: Mobile](https://material.io/design/layout/responsive-layout-grid.html)

### Tools
- Chrome DevTools Device Mode
- Firefox Responsive Design Mode
- BrowserStack (real device testing)
- Lighthouse (performance auditing)

## Support

For issues or questions about mobile responsiveness:
1. Check this quick reference
2. Review `MOBILE_RESPONSIVE_COMPLETE.md`
3. Test on actual devices
4. Check browser console for errors
5. Verify CSS is imported correctly

---

**Last Updated**: 2026-04-26
**Version**: 1.0.0
