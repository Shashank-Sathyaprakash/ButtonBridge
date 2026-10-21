## ButtonBridge
Local Mouse Button Manager for Restricted Enterprise Environments

ButtonBridge is a lightweight local mouse button management solution designed for environments where third-party device management software may be restricted.

The application provides a browser-based interface for configuring mouse button actions while using a local Python agent to detect and execute button events. The frontend is hosted through IIS as a static React application, while the Python agent runs locally on the same machine and communicates directly with the browser.

This allows users to customize and manage mouse button mappings without requiring cloud connectivity, external services, or vendor-specific software.

Features
Local-only architecture
No cloud dependencies
Browser-based configuration UI
Custom button-action mapping
Lightweight Python background agent
IIS hosting support
Enterprise-friendly deployment model
Direct communication between browser and local Python agent
No dependency on Logitech Options+ or similar vendor software

Architecture
+-----------------------------+
| Chrome / Edge Browser       |
| React Frontend              |
+-------------+---------------+
              |
              |
              v
      HTTP Requests
              |
              |
      127.0.0.1:8765
              |
              v
+-----------------------------+
| Local Python Agent          |
| server.py                   |
| Port 8765                   |
+-----------------------------+


Frontend Hosting
----------------
+-----------------------------+
| IIS Website                 |
| Port 8080                   |
| React dist/ files           |
+-----------------------------+
Communication Flow
React application is served as static content from IIS.
User accesses the application through Chrome or Edge.
The browser loads the application from IIS.
The browser communicates directly with the local Python Agent on 127.0.0.1:8765.
The Python Agent processes button events and configuration requests.
Configured actions are executed locally on the user's machine.
Important
The React application does not communicate with the Python Agent through IIS.

Instead, the browser directly calls:

http://127.0.0.1:8765
Therefore, the Python Agent must always run on the same machine as the browser.

Technology Stack
Frontend
React
Vite
TypeScript
Backend
Python
server.py
Hosting
Microsoft IIS
API Endpoints
GET   /config
POST  /config

GET   /events

POST  /test
Project Structure
ButtonBridge
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── dist/
│
├── backend/
│   └── server.py
│
└── README.md
Local Development
Frontend
npm install
npm run dev
Production Build
npm install
npm run build
Output:

dist/
Running the Python Agent
Navigate to the backend folder and start:

python server.py
Expected output:

Listening on Port 8765
You can verify the agent by opening:

http://127.0.0.1:8765
IIS Deployment
Step 1 - Build the Frontend
npm install
npm run build
This produces:

dist/
Step 2 - Create IIS Site
Open IIS Manager (inetmgr).
Create a new Website or Application.
Set the Physical Path to the generated dist folder.
Configure a free port (example: 8080).
Example:

Physical Path : C:\Projects\ButtonBridge\dist
Port          : 8080
Step 3 - Install URL Rewrite Module
Install the IIS URL Rewrite Module if it is not already installed.

This is required so React routes are correctly redirected to index.html.

Step 4 - Configure web.config
Place the following web.config file inside the dist folder alongside index.html.

<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logical*rouping="MatchAll">
            <a*d input="{REQUEST_FILENAME}" match*ype="IsFile" negate="true" />
    *       <add input="{REQUEST_FILENA*E}" matchType="IsDirectory" negate*"true" />
          </conditions>
*         <action type="Rewrite" ur*="/" />
        </rule>
      </ru*es>
    </rewrite>
  </system.webS*rver>
</configuration>
#* Step 5 - Start the Python Agent

*un:

python server.py
Verify that the agent is listeningon:

http://127.0.0.1:8765*```

---

## Step 6 - Access the A*plication

Open:

```text
http://localhost:8080
or

http://<machine-ip>:8080
P*ivate Network Access (PNA)
When te application is opened for the fist time, Chrome or Edge may displa* a one-time Private Network Acce*s permission request because the*browser is communicating with:

``*text http://127.0.0.1:8765


Ac*ept the prompt to allow communicat*on with the local Python Agent.

T*is confirmation is typically shown*only once.

---

## Deployment Ove*view

```text
IIS Website (8080)
 *      │
        ▼
 React Frontend
*       │
        ▼
 Chrome / Edge
*       │
        ▼
127.0.0.*:8765
        │
        ▼
 Python*Agent
        │
        ▼
 Mouse B*tton Actions
*``

---

## Enterprise Use Case

M*ny organizations*restrict mouse management software*due to security* compliance, or software installat*on policies.

ButtonBridge provide* a lightweight alternative by:

* Hosting the UI locally via IIS
- *unning a local*Python service for button detectio* and execution
- Keeping all commu*ication within the user's machine
* Avoiding external cloud services*- Providing customizable button-to*action mapping through a web*interface

---

## Disclaimer

Thi* project is an independent utility*and is not affiliated with, endors*d by, or supported by Logitech or *ny other hardware manufacturer. An* product names referenced are used*solely for compatibility and identification purposes.
