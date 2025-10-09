# Arch Daily Slideshow Viewer

A Next.js application that displays Arch Daily slideshow galleries in a customizable, easy-to-navigate interface.

## Features

- **Simple URL Input**: Paste any Arch Daily slideshow link to view the gallery
- **Beautiful Slideshow**: Clean, modern interface with smooth navigation
- **Keyboard Support**: Use arrow keys to navigate between images
- **Image Counter**: Always know which image you're viewing (x/y format)
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Visual feedback while fetching data

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## How to Use

1. Copy a link to an Arch Daily slideshow (e.g., from archdaily.com)
2. Paste the link into the input field on the homepage
3. Click "Generate" or press Enter
4. Browse through the slideshow using:
   - Navigation arrows (previous/next)
   - Keyboard arrow keys
   - Click "Back" to return to the input screen

## Technical Details

The app consists of:
- **Frontend** (`app/page.tsx`): Input interface and slideshow display
- **API Route** (`app/api/parse-slideshow/route.ts`): Fetches and parses HTML to extract image data
- **Components**:
  - `Slideshow.tsx`: Main slideshow component with navigation
  - `LoadingSpinner.tsx`: Loading indicator

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
