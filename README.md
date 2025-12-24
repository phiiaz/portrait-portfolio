# PHIIAZ | Portrait Photography Portfolio

A modern 3D portfolio website showcasing portrait photography with an immersive WebGL gallery experience.

## 🎨 Features

- **3D Gallery**: Interactive WebGL-based photo gallery with depth-based parallax effects
- **31 Portfolio Images**: High-quality portrait photographs displayed in randomized order
- **Smooth Animations**: Custom shader materials with blur, cloth folding, and flag-waving effects
- **Interactive Controls**: Mouse wheel, arrow keys, and touch navigation
- **Auto-play**: Gallery auto-scrolls after 3 seconds of inactivity
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern Stack**: Built with Next.js 16, TypeScript, Tailwind CSS, and Three.js

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portfolio.

### Build for Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
portrait/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main gallery page
│   ├── layout.tsx         # Root layout with fonts
│   └── globals.css        # Global styles with Tailwind
├── components/
│   └── ui/
│       └── 3d-gallery-photography.tsx  # 3D gallery component
├── public/
│   └── images/            # Portfolio images (001.jpeg - 031.JPG)
├── lib/                   # Utility functions
└── package.json           # Dependencies and scripts
```

## 🎯 Technologies

- **Framework**: Next.js 16.1.1 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Fonts**: Inter (sans-serif), Playfair Display (serif)
- **UI Components**: shadcn/ui architecture

## 🌐 Deployment

Deploy to Vercel with one click:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📝 Customization

### Update Images

Replace images in `public/images/` with your own photos. Images are automatically randomized on each page load.

### Modify Gallery Settings

Edit `app/page.tsx` to customize:
- `speed`: Scroll speed multiplier
- `visibleCount`: Number of visible images in 3D space
- `fadeSettings`: Fade in/out ranges
- `blurSettings`: Blur effects and intensity

### Change Branding

Update the hero text in `app/page.tsx` and metadata in `app/layout.tsx`.

## 📄 License

© 2025 PHIIAZ. All rights reserved.

## 🔗 Links

- Portfolio: [portrait.phiiaz.com](https://portrait.phiiaz.com)
- Instagram: [@portraitbyphiiaz](https://www.instagram.com/portraitbyphiiaz/)
