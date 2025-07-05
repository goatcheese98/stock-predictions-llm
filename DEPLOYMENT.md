# GitHub Pages Deployment Guide

This guide will help you deploy your Stock Predictions AI app to GitHub Pages using GitHub Actions.

## Prerequisites

1. Your repository must be public (or you need GitHub Pro for private repos)
2. You need to enable GitHub Pages in your repository settings

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. Save the settings

### 2. Repository Name Configuration

The current Vite configuration is set for the repository `stock-predictions-llm`. If your repository has a different name, update the `base` path in `vite.config.js`:

```javascript
base: process.env.NODE_ENV === 'production' ? '/YOUR-REPO-NAME/' : '/',
```

Replace `YOUR-REPO-NAME` with your actual repository name.

### 3. Deploy

Once you've completed the setup:

1. Commit all your changes
2. Push to the `main` branch
3. The GitHub Action will automatically trigger
4. Your app will be available at: `https://goatcheese98.github.io/stock-predictions-llm/`

## GitHub Actions Workflow

The workflow (`.github/workflows/deploy.yml`) will:

1. **Build Phase**:
   - Install Node.js 18
   - Install dependencies with `npm ci`
   - Build the app with `npm run build`
   - Upload the build artifacts

2. **Deploy Phase**:
   - Deploy the built app to GitHub Pages
   - Provide the deployment URL

## Manual Deployment

You can also trigger the deployment manually:

1. Go to **Actions** tab in your repository
2. Click on **Deploy to GitHub Pages** workflow
3. Click **Run workflow** button
4. Select the branch (main) and click **Run workflow**

## Troubleshooting

### Common Issues

1. **404 Error**: Check that your repository name matches the `base` path in `vite.config.js`
2. **Build Fails**: Ensure all dependencies are listed in `package.json`
3. **Assets Not Loading**: Verify the `base` path configuration

### Checking Deployment Status

1. Go to **Actions** tab to see workflow runs
2. Click on a specific run to see detailed logs
3. Check the **deploy** job for the final deployment URL

## Local Testing

To test the production build locally:

```bash
npm run build
npm run preview
```

This will build and serve the app locally with production settings.

## Environment Variables

If you need to add environment variables for production:

1. Go to **Settings** > **Secrets and variables** > **Actions**
2. Add your secrets
3. Update the GitHub Actions workflow to use them

## Notes

- The app uses Cloudflare Workers for API security, so no API keys are exposed in the frontend
- All static assets (images, CSS, JS) will be served from GitHub Pages
- The deployment typically takes 2-5 minutes to complete
- Changes to the `main` branch will automatically trigger a new deployment
- The build process automatically optimizes and minifies all assets
- Large personality images (648KB-1.6MB) are automatically included in the build

## Build Success

✅ **Local build tested successfully!**
- Build output: `dist/` folder
- Assets optimized and minified
- All personality images included
- Ready for GitHub Pages deployment 