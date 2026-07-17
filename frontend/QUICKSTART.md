# 🚀 Quick Start Guide for PMO Frontend

## Step 1: Install Dependencies

Open PowerShell in the `frontend` directory and run:

```powershell
cd frontend
npm install
```

This will install all required packages:
- React 18
- React Router
- Zustand (state management)
- GSAP (animations)
- Lucide React (icons)
- Axios (HTTP client)

## Step 2: Start Development Server

```powershell
npm run dev
```

The application will start on `http://localhost:3000`

## Step 3: Explore the Application

### Landing Page (`/`)
- View the marketing page with features and pricing
- Click "Get Started" or "Sign Up" to create an account

### Sign Up (`/signup`)
- Create a new account (mock authentication)
- Enter any name, email, and password
- You'll be automatically logged in

### Dashboard (`/dashboard`)
Main workspace with:
- **Sidebar**: Navigation and user info
- **File Uploader**: Drag & drop or click to upload Excel files (.xlsx, .xls)
- **Uploaded Files List**: View and manage uploaded files
- **Column Selector**: Choose and customize output columns
- **Process Button**: Process uploaded files

### Upload Limits (Free Plan)
- 1 upload per day
- Maximum 3 total uploads
- After 3 uploads, you'll be prompted to upgrade

### History (`/history`)
- View all past processing jobs
- Click "View Output" to see results
- Download processed files

### Output (`/output/:id`)
- View processed data in a table format
- Filter and search results
- Export to Excel

### Subscription (`/subscription`)
- View current plan details
- See usage statistics
- Upgrade to Pro or Enterprise plans

## Step 4: Test the Workflow

1. **Sign Up**: Create an account
2. **Upload Files**: Drag and drop an Excel file (or select from file picker)
3. **Select Columns**: Click "Columns" in sidebar to customize output
4. **Process**: Click "Process Files" button
5. **View Output**: Automatically redirected to output page
6. **History**: Check history page to see all past jobs

## 🎨 Features to Explore

### Animations
- Smooth page transitions powered by GSAP
- Hover effects on cards and buttons
- Interactive drag & drop area

### Responsive Design
- Resize your browser to see mobile/tablet layouts
- Sidebar collapses on smaller screens
- Touch-friendly interface

### State Management
- User session persists across page reloads (Zustand store)
- Upload counts and limits tracked
- History maintained

## 🔧 Configuration

### Change API URL (for backend integration)

Edit `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000', // Change to your backend URL
    changeOrigin: true,
  },
}
```

### Customize Theme

Edit CSS variables in `src/index.css`:

```css
:root {
  --primary-blue: #0073ea;    /* Main brand color */
  --dark-blue: #0060b9;       /* Hover states */
  --light-blue: #e6f3ff;      /* Backgrounds */
  /* ...more colors */
}
```

## 📝 Mock Features (To Be Implemented)

Currently using mock data for:
- **Authentication**: Replace with real API calls
- **File Processing**: Connect to Python backend (App.py)
- **Payments**: Integrate Stripe/PayPal for subscriptions
- **Data**: Replace mock output data with real processed results

## 🐛 Troubleshooting

### Port 3000 already in use?
```powershell
# Kill the process or change the port in vite.config.js
server: {
  port: 3001, // Use different port
}
```

### Dependencies not installing?
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Build errors?
```powershell
# Clean build and retry
npm run build
```

## 📚 Next Development Steps

1. **Backend Integration**:
   - Create Flask/FastAPI endpoints
   - Connect file upload to App.py processing
   - Return JSON responses

2. **Real Authentication**:
   - Implement JWT tokens
   - Add password hashing
   - Secure routes

3. **Payment Integration**:
   - Add Stripe/PayPal SDK
   - Implement checkout flow
   - Webhook handling

4. **Enhanced Features**:
   - Data visualization with charts
   - Advanced filtering
   - Batch operations
   - Export to multiple formats

## 💡 Tips

- Use Chrome DevTools to inspect network requests
- Check browser console for any errors
- React DevTools extension helpful for debugging
- Test different screen sizes for responsiveness

## 🎉 You're All Set!

The PMO frontend is now running. Start uploading files and exploring the features!

For detailed documentation, see [README.md](README.md)
