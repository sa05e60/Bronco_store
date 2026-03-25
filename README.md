# BRONCO Store 🤠

An authentic western-wear e-commerce application.

## Architecture

This project has been restructured for modern, free-tier deployment:
*   **Frontend**: Static HTML, CSS, Vanilla JS. Deployable on **Vercel** or **Netlify**.
*   **Backend**: Node.js & Express API. Deployable on **Render**.
*   **Database**: MySQL. Requires a free external provider (like Railway, Aiven, or TiDB Cloud).

---

## Deployment Guide (Free Plan)

Follow these steps to deploy the application for free.

### Phase 1: Database Setup
1.  Create a free database on [Aiven](https://aiven.io/mysql) or [TiDB Cloud](https://tidbcloud.com/).
2.  Get your connection details (Host, Port, User, Password, Database Name).
3.  Connect to your database using a local client (like DBeaver or MySQL Workbench) and import the `bronco_db.sql` file located in the root directory to create the tables.

### Phase 2: Deploy the Backend (Render)
1.  Push this entire repository to GitHub.
2.  Go to [Render.com](https://render.com) and create a new **Web Service**.
3.  Connect your GitHub repository.
4.  Render will automatically detect the settings from `render.yaml`.
5.  In the Render Dashboard, fill in the **Environment Variables**:
    *   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` (from Phase 1)
    *   `STORE_EMAIL` and `STORE_EMAIL_PASSWORD` (Your Gmail and App Password for sending emails)
    *   `CORS_ORIGINS`: Set this to your frontend domain later (e.g., `https://bronco-store.vercel.app`)
    *   `BASE_URL`: Set this to your frontend domain as well.
6.  Deploy! Once live, copy the Render URL (e.g., `https://bronco-api-xyz.onrender.com`).

### Phase 3: Deploy the Frontend (Vercel)
1.  Open the `config.js` file in the root directory.
2.  Update `window.BRONCO_API_URL` to your Render backend URL:
    ```javascript
    window.BRONCO_API_URL = 'https://bronco-api-xyz.onrender.com';
    ```
3.  Commit and push this change to GitHub.
4.  Go to [Vercel.com](https://vercel.com) and create a **New Project**.
5.  Import your GitHub repository.
6.  The `vercel.json` file will automatically configure the routing.
7.  Deploy!

### Phase 4: Final Connection
1.  Copy your new Vercel frontend URL.
2.  Go back to your Render Dashboard > Environment Variables.
3.  Update the `CORS_ORIGINS` and `BASE_URL` variables with your Vercel URL.
4.  Restart the Render Web Service.

You're done! Your BRONCO store is now live.

---

## Local Development

If you want to run the project locally on your machine:

1.  **Start MySQL**: Use XAMPP or a local MySQL server. Import `bronco_db.sql`.
2.  **Configure Backend**:
    *   `cd server`
    *   Copy `.env.example` to `.env` and update your DB credentials.
    *   Run `npm install`
    *   Run `npm start` (API runs on port 3001)
3.  **Configure Frontend**:
    *   Open `config.js` and set `window.BRONCO_API_URL = 'http://localhost:3001';`
4.  **Run Frontend**:
    *   Use an extension like Live Server in VS Code to open `index.html`.
