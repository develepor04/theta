# Backend Integration Guide

## Overview

This guide explains how to connect the React frontend with the Python backend (`App.py`) to enable actual EDDR file processing.

## Option 1: Flask Backend (Recommended)

### Step 1: Install Flask

```powershell
pip install flask flask-cors openpyxl
```

### Step 2: Create Flask Server

Create `backend_server.py` in the root directory:

```python
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
from App import extract_eddr_data
import tempfile
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Backend is running'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload and process EDDR Excel file
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return jsonify({'error': 'Invalid file type. Please upload Excel files only'}), 400
    
    try:
        # Generate unique ID for this processing job
        job_id = str(uuid.uuid4())
        
        # Save uploaded file
        input_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_{file.filename}")
        file.save(input_path)
        
        # Generate output file path
        output_filename = f"EDDR_Output_{job_id}.xlsx"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        # Process the file using App.py function
        success = extract_eddr_data(input_path, output_path)
        
        if success:
            return jsonify({
                'status': 'success',
                'message': 'File processed successfully',
                'jobId': job_id,
                'outputFile': output_filename,
                'downloadUrl': f'/api/download/{job_id}'
            })
        else:
            return jsonify({'error': 'Processing failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<job_id>', methods=['GET'])
def download_file(job_id):
    """
    Download processed output file
    """
    try:
        # Find the output file
        for filename in os.listdir(OUTPUT_FOLDER):
            if filename.startswith(f"EDDR_Output_{job_id}"):
                file_path = os.path.join(OUTPUT_FOLDER, filename)
                return send_file(
                    file_path,
                    as_attachment=True,
                    download_name=filename
                )
        
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """
    Get list of all processed files
    """
    try:
        files = []
        for filename in os.listdir(OUTPUT_FOLDER):
            file_path = os.path.join(OUTPUT_FOLDER, filename)
            files.append({
                'filename': filename,
                'size': os.path.getsize(file_path),
                'modified': os.path.getmtime(file_path)
            })
        
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### Step 3: Start Flask Server

```powershell
python backend_server.py
```

Server will run on `http://localhost:5000`

## Option 2: FastAPI Backend (Alternative)

### Step 1: Install FastAPI

```powershell
pip install fastapi uvicorn python-multipart openpyxl
```

### Step 2: Create FastAPI Server

Create `backend_server_fastapi.py`:

```python
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import uuid
from App import extract_eddr_data

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Backend is running"}

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        job_id = str(uuid.uuid4())
        
        # Save uploaded file
        input_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_{file.filename}")
        with open(input_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Process
        output_filename = f"EDDR_Output_{job_id}.xlsx"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        
        success = extract_eddr_data(input_path, output_path)
        
        if success:
            return {
                "status": "success",
                "jobId": job_id,
                "outputFile": output_filename,
                "downloadUrl": f"/api/download/{job_id}"
            }
        else:
            raise HTTPException(status_code=500, detail="Processing failed")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{job_id}")
async def download_file(job_id: str):
    for filename in os.listdir(OUTPUT_FOLDER):
        if filename.startswith(f"EDDR_Output_{job_id}"):
            file_path = os.path.join(OUTPUT_FOLDER, filename)
            return FileResponse(file_path, filename=filename)
    
    raise HTTPException(status_code=404, detail="File not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
```

### Step 3: Start FastAPI Server

```powershell
python backend_server_fastapi.py
```

## Frontend Integration

### Update Dashboard.jsx

Replace the `handleProcess` function:

```javascript
const handleProcess = async () => {
  if (uploadedFiles.length === 0) {
    alert('Please upload at least one file first');
    return;
  }

  if (subscription.isLocked) {
    alert('You have reached your upload limit. Please upgrade to continue.');
    navigate('/subscription');
    return;
  }

  setProcessing(true);

  try {
    // Upload each file to backend
    const uploadPromises = uploadedFiles.map(async (fileData) => {
      const formData = new FormData();
      formData.append('file', fileData.file); // Add actual File object
      
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return await response.json();
    });

    const results = await Promise.all(uploadPromises);

    // Create history entry
    const historyItem = {
      id: Date.now(),
      files: uploadedFiles,
      processedAt: new Date().toISOString(),
      columns: selectedColumns,
      status: 'completed',
      outputId: Date.now(),
      jobIds: results.map(r => r.jobId),
    };

    addToHistory(historyItem);
    setProcessing(false);

    // Navigate to output
    navigate(`/output/${historyItem.outputId}`);
  } catch (error) {
    console.error('Processing error:', error);
    alert('Error processing files. Please try again.');
    setProcessing(false);
  }
};
```

### Update handleFiles to store actual File object

```javascript
const handleFiles = (files) => {
  if (subscription.isLocked) {
    alert('You have reached your upload limit. Please upgrade to Pro or Enterprise.');
    navigate('/subscription');
    return;
  }

  const excelFiles = files.filter(
    (file) =>
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
  );

  if (excelFiles.length === 0) {
    alert('Please upload Excel files (.xlsx or .xls)');
    return;
  }

  excelFiles.forEach((file) => {
    const fileData = {
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded',
      file: file, // Store the actual File object
    };
    addUploadedFile(fileData);
  });
};
```

## Testing the Integration

### 1. Start Backend

```powershell
python backend_server.py
```

### 2. Start Frontend

```powershell
cd frontend
npm run dev
```

### 3. Test Upload

1. Go to `http://localhost:3000`
2. Sign up/Login
3. Upload an Excel file with EDDR sheet
4. Click "Process Files"
5. Check console for API calls
6. View output when processing completes

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check if backend is running |
| `/api/upload` | POST | Upload and process an EDDR file |
| `/api/download/:jobId` | GET | Download processed output file |
| `/api/history` | GET | Get list of all processed files |

## Environment Variables

Create `.env` in frontend directory:

```env
VITE_API_URL=http://localhost:5000
```

Update `vite.config.js`:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL || 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

## Production Deployment

### Backend
- Deploy Flask/FastAPI to Heroku, AWS, or Azure
- Use gunicorn/uvicorn as WSGI server
- Set up proper CORS origins
- Use environment variables for configuration

### Frontend
- Build React app: `npm run build`
- Deploy to Vercel, Netlify, or AWS S3
- Update API URL to production backend

## Troubleshooting

### CORS Errors
- Make sure Flask-CORS or FastAPI CORS middleware is enabled
- Check that frontend origin is allowed

### Upload Fails
- Verify file size limits (default 16MB in Flask)
- Check file permissions in upload/output folders
- Ensure App.py is in the same directory

### Processing Errors
- Check that EDDR sheet exists in uploaded file
- Verify column mappings match your data structure
- Check backend logs for detailed error messages

---

Now your React frontend is fully integrated with the Python backend! 🎉
