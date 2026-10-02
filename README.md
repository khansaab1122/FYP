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
- **Computer Vision**: Local Python service using OpenCV YuNet for face detection and SFace for face embeddings and cosine-similarity matching.

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
  GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
  SMART_KHATA_OWNER_SETUP_TOKEN=your_random_secret_at_least_32_characters
  GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your_sender_email@gmail.com
  SMTP_PASS=your_google_app_password
  SMTP_FROM="Smart Khata <your_sender_email@gmail.com>"
   ```

  Configure SMTP to send password-reset codes. For Gmail, enable 2-Step Verification and use a Google App Password for `SMTP_PASS`, not your regular account password. Reset codes expire after 10 minutes, are limited to five verification attempts, and are stored hashed.

  For Google sign-in, create an OAuth 2.0 Client ID of type **Web application** in Google Cloud Console, configure the OAuth consent screen, and add your app origin (for example, `http://localhost:3000`) under **Authorized JavaScript origins**. Put the client ID in `GOOGLE_CLIENT_ID` in `.env.local` and restart the server. Google sign-in only works for the email already registered as the single Smart Khata owner.

  New account passwords must be 8 to 128 characters and are stored as salted scrypt hashes. For an existing account created before password verification was added, set `SMART_KHATA_PASSWORD_SETUP_TOKEN` in `.env.local` to a random secret of at least 32 characters and restart the server. On login, enter that token and choose a new password. Remove the setup token from `.env.local` after the password is initialized.

  The first owner signup in production requires `SMART_KHATA_OWNER_SETUP_TOKEN` (at least 32 random characters); enter it in the Owner Setup Token field. Business-data API routes require an HttpOnly session cookie. Do not expose the app publicly with real data until the production setup token and HTTPS are configured.

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
    role: 'owner'
  }
}
```

## Future Work

- Add employee accounts with role-based permissions and access to the same business ledger.

## Face Recognition with Manual Confirmation

### Workflow

1. **Automatic Scanning**: Camera continuously scans for customer faces
2. **AI Matching**: The local Python service uses OpenCV YuNet to detect faces, then SFace embeddings and cosine similarity to compare them against stored customer photos.
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
