# Luminary Nexus Hub PWA

A Progressive Web App for the Luminary Nexus decentralized community, built on principles of Radical Acceptance, Restorative Justice, and the Luminary Principle.

## 🚀 Quick Start

### 1. Start a Local Development Server

```bash
cd /home/josh/luminarynexustoken/pwa-starter
python3 -m http.server 8000
```

Then navigate to `http://localhost:8000` in your browser.

### 2. Test PWA Features

- **Installable**: Click the install prompt (or visit in Chrome/Edge mobile)
- **Offline Support**: Disconnect internet and reload - content still loads!
- **Add to Home Screen**: Available on mobile devices

## 📁 File Structure

```
pwa-starter/
├── public/
│   └── index.html          # Main PWA entry point
├── icons/                   # App icons (placeholder images needed)
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.json           # PWA manifest (app metadata)
├── service-worker.js       # Offline caching logic
└── README.md               # This file
```

## 🎨 Design Features

- **Theme**: Futuristic Utopian with light cyberpunk elements
- **Colors**: Dark theme (#0d1117) with blue accents (#58a6ff)
- **Responsive**: Mobile-first design
- **Accessible**: Semantic HTML, keyboard navigation

## 🛠️ Next Steps

1. **Add Real Icons**: Replace placeholder icons in `/icons/`
2. **Connect to Backend**: Add API calls to blockchain contracts
3. **Deploy**: Push to GitHub Pages or Netlify
4. **Add More Pages**: About, Governance, Roadmap, Community

## 📱 PWA Checklist

- [x] manifest.json configured
- [x] Service worker registered
- [x] HTTPS ready (required for production)
- [x] Offline support implemented
- [ ] Custom icons added
- [ ] App shell optimized
- [ ] Analytics integrated

## 🔧 Development Commands

```bash
# Start local server
python3 -m http.server 8000

# Lint manifest
npx @pwa-labs/manifest-validator public/manifest.json

# Test service worker
# Open DevTools > Application > Service Workers
```

## 🌐 Deployment Options

### GitHub Pages
```bash
# Push to gh-pages branch
git subtree push --prefix public origin gh-pages
```

### Netlify
```bash
# Deploy folder directly
netlify deploy --prod /home/josh/luminarynexustoken/pwa-starter/public
```

## 🎯 Mission Alignment

This PWA serves as the entry point for:
- Community onboarding and education
- Voting interface for DAO governance
- Resource sharing and collaboration
- Testnet deployment landing page

Built with Radical Acceptance at its core.
