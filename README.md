# Smart Khata AI - Digital Ledger & Face Recognition System

## Project Overview
Smart Khata AI is a modern, responsive web application designed to digitize local store registries and ledger systems. It transitions traditional store bookkeeping into a secure, automated digital environment. The core feature of the system is real-time **AI Face Recognition**, which instantly identifies customers using their facial biometrics, allowing store owners to quickly access their outstanding tabs (Udhaar) and credit limits without manual searching.

## Features
- **Face Recognition Terminal**: Automatically scans and matches customer faces against the store registry in real-time with manual confirmation step for security.
- **Digital Ledger Management**: Track customer credits, transactions, and outstanding tabs seamlessly.
- **Secure Master Dashboard**: Dedicated environment for business owners to securely access sensitive financial data.
- **Glassmorphism UI**: High-end, premium user interface designed for an excellent and smooth user experience.

## Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas (cloud-based NoSQL database)
- **Computer Vision**: Local Python service using OpenCV YuNet for face detection and SFace for face embeddings and cosine-similarity matching. No Gemini API is required for face recognition.

## Setup Instructions

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Install all required dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Copy `.env.example` to `.env.local` and add your own MongoDB Atlas connection string. The face-recognition service runs locally at `http://127.0.0.1:8001`.

   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   MONGO_DB_NAME=smart_khata_ai
   PYTHON_FACE_SERVICE_URL=http://127.0.0.1:8001
   APP_URL=http://localhost:3000
   ```

3. Start the Python face-recognition service first:
   ```powershell
   .\start-face-service.ps1
   ```

4. In a second terminal, run the application:
   ```bash
   npm install
   npm run dev
   ```

The application will be accessible at `http://localhost:3000`.

## Database Architecture

### MongoDB Atlas (Cloud Database)

The application uses **MongoDB Atlas** for persistent cloud storage:

- **Database**: `smart_khata_ai`
- **Collection**: `smart_khata`
- **Type**: Cloud-hosted NoSQL database

### Data Schema

The application stores data in a single document structure:

```javascript
{
  customers: [
    {
      id: string,
      name: string,
      phone: string,
      address: string,
      image: string, // base64 encoded face
      creditLimit: number,
      balance: number,
      createdAt: ISO8601DateTime,
      transactions: [
        {
          id: string,
          type: 'credit' | 'payment',
          amount: number,
          description: string,
          date: ISO8601DateTime
        }
      ]
    }
  ],
  employees: array,
  profile: {
    name: string,
    ownerEmail: string,
    category: string,
    contact: string,
    address: string
  },
  session: {
    id: string,
    email: string,
    name: string,
    businessName: string,
    role: 'owner' | 'employee'
  }
}
```

## Face Recognition with Manual Confirmation

### Workflow

1. **Automatic Scanning**: Camera continuously scans for customer faces
2. **AI Matching**: Gemini Vision API extracts facial features and compares against stored templates
3. **Match Found**: When a match is detected, the customer details are displayed
4. **Manual Confirmation**: User must explicitly confirm the matched customer before opening their profile
5. **Actions Available**:
   - **Confirm**: Opens the customer's profile and ledger
   - **Reject**: Rejects the match and continues scanning for other customers

### Security Benefits

- ✅ Prevents accidental profile access
- ✅ Allows user to verify the AI match is correct
- ✅ Provides an extra security layer for sensitive data access
- ✅ Maintains audit trail of confirmed customers

## Project Structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for detailed folder organization and import conventions.
