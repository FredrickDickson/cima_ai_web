# 🚀 CIMA AI - Quick Reference Guide

## Nordic Burgundy Color Palette

### Primary Colors (Copy & Paste Ready)
```css
--nordic-burgundy: #5A2633
--warm-ivory: #F5F1E8
--charcoal: #252525
--muted-gold: #B49A67
```

### Secondary Colors
```css
--charcoal-700: #4a4a4a
--charcoal-600: #5f5f5f
--charcoal-500: #757575
```

### Gradient Combinations
```css
/* Gradient Text */
background: linear-gradient(135deg, #5A2633 0%, #B49A67 100%);

/* Primary Button */
background: linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%);

/* Section Background */
background: linear-gradient(180deg, #F5F1E8 0%, #ffffff 50%, #F5F1E8 100%);
```

---

## Common UI Patterns

### Primary Button
```tsx
style={{
  background: "linear-gradient(135deg, #5A2633 0%, #4a1f2a 100%)",
  color: "white",
  padding: "0 2rem",
  height: "3.5rem",
  borderRadius: "0.75rem",
  boxShadow: "0 8px 24px rgba(90, 38, 51, 0.25)",
  fontWeight: 600,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
}}
onMouseEnter={(e) => {
  e.currentTarget.style.transform = "translateY(-2px)";
  e.currentTarget.style.boxShadow = "0 12px 32px rgba(90, 38, 51, 0.35)";
}}
```

### Secondary Button
```tsx
style={{
  background: "transparent",
  color: "#5A2633",
  border: "2px solid #5A2633",
  padding: "0 2rem",
  height: "3.5rem",
  borderRadius: "0.75rem",
  fontWeight: 600,
  transition: "all 0.3s",
}}
onMouseEnter={(e) => {
  e.currentTarget.style.background = "rgba(90, 38, 51, 0.05)";
  e.currentTarget.style.transform = "translateY(-2px)";
}}
```

### Premium Card
```tsx
style={{
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 241, 232, 0.9) 100%)",
  backdropFilter: "blur(20px)",
  borderRadius: "1.5rem",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  boxShadow: "0 8px 32px rgba(90, 38, 51, 0.08)",
  padding: "2rem",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
}}
whileHover={{ y: -8, scale: 1.02 }}
```

### Glass Card
```tsx
style={{
  background: "rgba(255, 255, 255, 0.8)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.4)",
  boxShadow: "0 8px 32px rgba(90, 38, 51, 0.08)",
  borderRadius: "1.5rem",
}}
```

---

## Typography Quick Reference

### Headings
```tsx
/* Hero Title */
style={{
  fontFamily: "Playfair Display, Georgia, serif",
  fontSize: "clamp(2.5rem, 8vw, 5rem)",
  fontWeight: 700,
  color: "#252525",
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
}}

/* Section Title */
style={{
  fontFamily: "Playfair Display, Georgia, serif",
  fontSize: "clamp(2rem, 5vw, 3rem)",
  fontWeight: 700,
  color: "#252525",
  lineHeight: 1.2,
}}

/* Card Title */
style={{
  fontFamily: "Playfair Display, Georgia, serif",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "#252525",
}}
```

### Body Text
```tsx
/* Large Body */
style={{ fontSize: "1.125rem", color: "#5f5f5f", lineHeight: 1.7 }}

/* Regular Body */
style={{ fontSize: "1rem", color: "#5f5f5f", lineHeight: 1.6 }}

/* Small Body */
style={{ fontSize: "0.875rem", color: "#5f5f5f", lineHeight: 1.5 }}
```

---

## Shadows

```css
/* Subtle */
box-shadow: 0 2px 8px rgba(90, 38, 51, 0.04);

/* Standard */
box-shadow: 0 4px 24px rgba(90, 38, 51, 0.06);

/* Elevated */
box-shadow: 0 8px 32px rgba(90, 38, 51, 0.08);

/* Floating */
box-shadow: 0 20px 60px rgba(90, 38, 51, 0.12);

/* Premium (Layered) */
box-shadow: 0 2px 8px rgba(90, 38, 51, 0.04), 
            0 8px 24px rgba(90, 38, 51, 0.06);
```

---

## Spacing Scale (4px grid)

```tsx
gap: "0.25rem"  /* 4px */
gap: "0.5rem"   /* 8px */
gap: "1rem"     /* 16px */
gap: "1.5rem"   /* 24px */
gap: "2rem"     /* 32px */
gap: "3rem"     /* 48px */
gap: "4rem"     /* 64px */
gap: "5rem"     /* 80px */
```

---

## Premium Unsplash Images

### Hero Section
```tsx
/* Background */
https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=1920&h=1080&fit=crop&q=80&blend=F5F1E8&blend-mode=overlay&blend-alpha=85

/* Dashboard Preview */
https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=750&fit=crop&q=90
```

### Feature Cards (Professional Settings)
```tsx
https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&h=250&fit=crop&q=80  /* Research */
https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=250&fit=crop&q=80  /* Documents */
https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=250&fit=crop&q=80  /* Drafting */
https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop&q=80  /* AI */
```

---

## Animation Presets

### Page Entrance (Framer Motion)
```tsx
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ duration: 0.6 }}
```

### Card Hover
```tsx
whileHover={{ y: -8, scale: 1.02 }}
```

### Staggered Children
```tsx
transition={{ duration: 0.5, delay: index * 0.1 }}
```

### Smooth Transition
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Badge/Tag
```tsx
style={{
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.5rem 1rem",
  borderRadius: "9999px",
  background: "linear-gradient(135deg, rgba(180, 154, 103, 0.15), rgba(90, 38, 51, 0.1))",
  border: "1px solid rgba(180, 154, 103, 0.3)",
}}
```

---

## Icon Styling
```tsx
/* Primary Icon */
style={{ width: "1.5rem", height: "1.5rem", color: "#5A2633" }}

/* Accent Icon */
style={{ width: "1.25rem", height: "1.25rem", color: "#B49A67" }}

/* Large Featured Icon */
style={{ width: "2rem", height: "2rem", color: "white" }}
```

---

## Responsive Breakpoints

```tsx
/* Mobile First */
className="block lg:hidden"     /* Show on mobile, hide on desktop */
className="hidden lg:block"     /* Hide on mobile, show on desktop */
className="sm:flex-row"         /* Column on mobile, row on tablet+ */
className="lg:grid-cols-3"      /* 1 col mobile, 3 cols desktop */
```

---

## Container Patterns

```tsx
/* Full Width Container */
className="container-custom"
/* max-width: 80rem (1280px), responsive padding */

/* Narrow Container */
className="container-narrow"
/* max-width: 56rem (896px), for text-heavy content */

/* Section Padding */
className="section-padding"
/* 5rem vertical padding on mobile, 6rem tablet, 8rem desktop */
```

---

## Common Hover States

### Link Hover
```tsx
onMouseEnter={(e) => {
  e.currentTarget.style.color = "#5A2633";
}}
onMouseLeave={(e) => {
  e.currentTarget.style.color = "#5f5f5f";
}}
```

### Card Hover (CSS)
```css
&:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(90, 38, 51, 0.12);
  border-color: rgba(180, 154, 103, 0.3);
}
```

---

## Accessibility Essentials

```tsx
/* Focus State */
style={{
  outline: "none",
  outlineOffset: "2px",
}}
onFocus={(e) => {
  e.target.style.borderColor = "#5A2633";
  e.target.style.boxShadow = "0 0 0 3px rgba(90, 38, 51, 0.1)";
}}

/* ARIA Label */
aria-label="Close navigation menu"

/* Alt Text */
alt="CIMA AI Dashboard showing legal research interface"

/* Semantic HTML */
<nav>, <main>, <section>, <article>, <aside>, <footer>
```

---

## Files to Reference

1. **COLOR_SCHEME_UPDATE.md** - Complete color documentation
2. **DESIGN_SYSTEM_COMPLETE.md** - Full design system
3. **TRANSFORMATION_COMPLETE.md** - Implementation summary
4. **QUICK_REFERENCE.md** - This file

---

## Quick Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check for color consistency
grep -r "#8B0E1E" src/  # Should return nothing
grep -r "#5A2633" src/  # Should return many matches
```

---

## Pro Tips

1. **Always use the gradient** for primary buttons, not flat colors
2. **Layer shadows** for premium depth effect
3. **Add loading="lazy"** to all images below the fold
4. **Use cubic-bezier(0.4, 0, 0.2, 1)** for smooth transitions
5. **Keep 4px grid spacing** for consistency
6. **Test on mobile first**, then enhance for desktop
7. **Use Playfair Display** for headings, **Inter** for body
8. **Add hover states** to all interactive elements
9. **Use backdrop-filter: blur()** for glassmorphism
10. **Keep contrast ratio** above 4.5:1 for WCAG AA

---

**Quick Access**: Bookmark this file for instant reference! 🔖

**Need Help?** Check the other documentation files for deeper dives into specific topics.

**Happy Building!** 🚀✨
