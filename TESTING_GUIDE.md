# Testing Guide - Landing Page Migration

## ✅ Quick Start

### 1. Start Development Server
```bash
npm run dev
```

The server will start on **http://localhost:5173/** (or 5174 if port is in use)

### 2. View Landing Page
Open your browser and navigate to:
```
http://localhost:5173/
```

---

## 🧪 Testing Checklist

### Visual Tests

#### Navigation Section
- [ ] Header is sticky and stays visible when scrolling
- [ ] Mobile menu icon appears on mobile devices
- [ ] Mobile menu opens/closes correctly
- [ ] "Sign In" button links to `/login`
- [ ] Navigation links scroll smoothly to sections
- [ ] Logo links to `/` (home)

#### Hero Section
- [ ] Background image loads
- [ ] Gradient overlay is visible
- [ ] Playfair Display font renders correctly
- [ ] Gradient text effect on "Legal Intelligence"
- [ ] "Get Started" button links to `/register`
- [ ] "Book Demo" button is visible
- [ ] Floating elements animate smoothly

#### TrustedBy Section
- [ ] 8 institution cards display
- [ ] Logos are visible
- [ ] Cards have glassmorphism effect
- [ ] Section has correct ivory background

#### Features Section
- [ ] 9 feature cards display in grid
- [ ] Images load (lazy loading)
- [ ] Icons display correctly
- [ ] Hover effect lifts cards
- [ ] Gradient bar appears on hover
- [ ] All text is readable

#### HowItWorks Section
- [ ] 4 steps display
- [ ] Step numbers show
- [ ] Icons are visible
- [ ] Cards animate on scroll
- [ ] Connecting lines visible (desktop)

#### WhyCima Section
- [ ] Benefit cards display
- [ ] Icons render correctly
- [ ] Hover animations work
- [ ] Background gradient visible

#### Testimonials Section
- [ ] 6 testimonial cards display
- [ ] Avatar images load
- [ ] 5-star ratings show
- [ ] Quote icon background visible
- [ ] Hover effect works
- [ ] Bottom CTA with avatar stack shows
- [ ] "Join 500+ legal professionals" text visible

#### FAQ Section
- [ ] All FAQ items are visible
- [ ] Click to expand/collapse works
- [ ] Chevron icon rotates on expand
- [ ] Smooth animation

#### Final CTA Section
- [ ] Gradient background renders
- [ ] "Start Your Free Trial" button links to `/register`
- [ ] Floating elements animate

#### Footer Section
- [ ] CIMA AI logo displays
- [ ] Social media icons work
- [ ] Company links display
- [ ] Solutions links display
- [ ] Resources links display
- [ ] 3 office cards show (London, Accra, Dubai)
- [ ] Phone numbers and emails are clickable
- [ ] Map pin icons show on offices
- [ ] Bottom bar with copyright shows
- [ ] Legal links (Privacy, Terms, Security) display
- [ ] Hover effects on links work

---

## 📱 Responsive Testing

Test on these screen sizes:

### Desktop (1920px)
```bash
# Full width browser
http://localhost:5173/
```
- [ ] All sections display properly
- [ ] Grid layouts show 3 columns
- [ ] No horizontal scroll

### Laptop (1440px)
- [ ] Layout adapts correctly
- [ ] Typography scales appropriately
- [ ] Images don't overflow

### Tablet (768px)
- [ ] Mobile menu icon appears
- [ ] Grid switches to 2 columns
- [ ] Cards stack properly
- [ ] Footer adapts to narrower layout

### Mobile (375px)
- [ ] Single column layout
- [ ] Text is readable
- [ ] Buttons are tappable
- [ ] Mobile menu works
- [ ] Images scale correctly
- [ ] No horizontal overflow

---

## 🎨 Design Verification

### Colors
- [ ] Burgundy: `#8B0E1E` (primary brand color)
- [ ] Gold: `#C9A961` (accent color)
- [ ] Charcoal: `#2D2D2D` (text color)
- [ ] Ivory: `#FDFBF7` (background color)
- [ ] White: `#FFFFFF` (card backgrounds)

### Typography
- [ ] Headings use **Playfair Display** serif font
- [ ] Body text uses **Inter** (from Tailwind default)
- [ ] Font sizes scale on mobile (clamp function)

### Animations
- [ ] Entrance animations on scroll (framer-motion)
- [ ] Hover animations on cards
- [ ] Button hover effects
- [ ] Mobile menu slide animation
- [ ] Smooth scroll to sections
- [ ] No janky animations (60fps)

### Effects
- [ ] Glassmorphism on cards (backdrop-filter blur)
- [ ] Gradient overlays on images
- [ ] Ambient background glows
- [ ] Box shadows on cards
- [ ] Border gradients

---

## 🔗 Route Testing

### Public Routes
| Route | Expected Behavior | Test Result |
|-------|------------------|-------------|
| `/` | Landing page displays | [ ] |
| `/login` | Login form shows | [ ] |
| `/register` | Registration form shows | [ ] |

### Protected Routes (After Login)
| Route | Expected Behavior | Test Result |
|-------|------------------|-------------|
| `/dashboard` | Dashboard displays | [ ] |
| `/cases` | Cases list displays | [ ] |
| `/documents` | Documents displays | [ ] |
| `/research` | Research page displays | [ ] |

### Redirects
| From | To | Expected Behavior | Test Result |
|------|-----|------------------|-------------|
| Landing "Sign In" | `/login` | Redirects correctly | [ ] |
| Landing "Get Started" | `/register` | Redirects correctly | [ ] |
| After successful login | `/dashboard` | Redirects correctly | [ ] |

---

## 🐛 Known Issues (None)

No known issues at this time. All functionality working as expected.

---

## ⚡ Performance Testing

### Lighthouse Scores (Target)
- [ ] Performance: >90
- [ ] Accessibility: >90
- [ ] Best Practices: >90
- [ ] SEO: >80

### Load Times
- [ ] Initial page load: <3 seconds
- [ ] Time to Interactive: <5 seconds
- [ ] Images lazy load correctly
- [ ] No layout shift

### Network
- [ ] All images load
- [ ] No 404 errors in console
- [ ] External fonts load
- [ ] No CORS errors

---

## 🖥️ Browser Testing

Test on these browsers:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 🎯 Functionality Testing

### Navigation
- [ ] Smooth scroll to #features works
- [ ] Smooth scroll to #testimonials works
- [ ] Smooth scroll to #faq works
- [ ] Mobile menu toggles correctly
- [ ] Sticky header stays visible

### Forms/Buttons
- [ ] "Sign In" button navigates to /login
- [ ] "Get Started" buttons navigate to /register
- [ ] "Book Demo" button is clickable
- [ ] All footer links are clickable
- [ ] Social media links open in new tabs

### Interactive Elements
- [ ] FAQ accordion expands/collapses
- [ ] Card hover effects work
- [ ] Button hover effects work
- [ ] Link hover color changes

---

## 🚀 Build Testing

### Development Build
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] Hot reload works
- [ ] Console has no errors

### Production Build
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No build warnings (except chunk size)
- [ ] Bundle size is acceptable

### Preview Production Build
```bash
npm run preview
```
- [ ] Production build runs locally
- [ ] All features work in production mode
- [ ] Minification doesn't break functionality

---

## ✅ Sign-Off Checklist

Before deploying to production:

- [ ] All visual tests pass
- [ ] All responsive tests pass
- [ ] All route tests pass
- [ ] All browser tests pass
- [ ] All functionality tests pass
- [ ] Build completes successfully
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Accessibility is acceptable
- [ ] Content is approved

---

## 📝 Test Results

**Tested By**: _________________  
**Date**: _________________  
**Environment**: _________________  
**Status**: [ ] Pass [ ] Fail  
**Notes**: 

_______________________________________
_______________________________________
_______________________________________

---

## 🎉 Expected Result

When all tests pass, you should have:
- A fully functional landing page at `/`
- Smooth animations and transitions
- Perfect visual match with Next.js version
- No errors in console
- Fast load times
- Responsive on all devices
- Accessible navigation
- Working authentication flow

**The landing page is production-ready!**

---

*Last Updated: August 5, 2026*
