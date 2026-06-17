FP Analyzer - Complete Development Document
Document Type: Technical Development Roadmap & Implementation Guide
Target Audience: Development Team, Technical Stakeholders
Date: June 2026
Purpose: Document what exists, what needs development, and complete implementation roadmap.

Table of Contents
Executive Summary - Development Status

Existing Features (Already Built - Laravel Live Version)

Under Development (Next.js + Express.js)

What Needs to Be Built - Complete List

Complete Flow Diagrams by Role

Industry Standard - How Competitors Built Their Products

Database Schema - Complete

API Endpoints - Complete List

Development Priority & Timeline

Technology Stack Recommendations

Conclusion

1. Executive Summary - Development Status
1.1 Current Reality - Two Versions
Version	Stack	Status	Customers	Features
Live Version	Laravel (PHP)	✅ Live, working	1 active customer	Basic OEE, machine monitoring, issue reporting
New Version	Next.js + Express.js	🔄 Under development	0 customers	Same features as live + improvements
1.2 What is Missing (Partner Requirements)
Missing Feature	Status in Live	Status in New	Priority
Visual Bottleneck Dashboard (#1 in RED)	❌	❌	P0
Shift Logbook (searchable/filterable)	❌	❌	P0
Issue Grouping (same issue different names)	❌	❌	P0
AI Auto-grouping	❌	❌	P1
Maintenance Workflow (assign, status)	❌	❌	P1
Multi-plant support	❌	❌	P1
Company Admin features	❌	❌	P1
Super Admin features	❌	❌	P2
1.3 Development Summary
Category	Count
Existing Features (Live)	15+
Features to Build in New	30+
Database Tables Needed	12
API Endpoints Needed	25+
Frontend Screens	40+
Estimated Development Time	60 days
2. Existing Features (Already Built - Laravel Live Version)
2.1 What Works Today
Feature	Description	Status
Authentication	Login/logout with email/password	✅
User Roles	Operator, Supervisor, Admin	✅
Machine Management	Add/edit/delete machines	✅
Operator Assignment	Assign operators to specific machines	✅
Issue Reporting	Dropdown-based stop reasons	✅
Scrap Reporting	Dropdown-based scrap reasons	✅
Production Recording	Good parts, target, work hours	✅
Photo Attachment	Take/attach photos to issues	✅
SOP Viewing	View work instructions per machine	✅
Shift Configuration	Morning, Evening, Night shifts	✅
Basic Dashboard	Summary counters, area chart	✅
Export to Excel	Basic export functionality	✅
2.2 Database Tables (Existing)
sql
-- Users & Authentication
users (id, name, email, password, role, company_id, plant_id)
sessions (id, user_id, token, expires_at)

-- Equipment & Machines
equipment (id, name, type, parent_id, status, company_id, plant_id)
equipment_assign (id, equipment_id, user_id, assigned_at)

-- Production Data
production_data (id, equipment_id, user_id, work_hours, good_qty, planned_qty, shift, recorded_at)
scrap_data (id, equipment_id, user_id, scrap_reason_type, scrap_reason, quantity, comment, photo, shift, recorded_at)
stop_data (id, equipment_id, user_id, stop_reason_type, stop_reason, duration_minutes, quantity_lost, comment, photo, shift, recorded_at)

-- Configuration
stop_reasons (id, type, reason, equipment_id)  -- type: Mechanical, Electrical, Operator, Material
scrap_reasons (id, type, reason, equipment_id) -- type: Dimensional, Surface, Material
work_shifts (id, name, start_time, end_time, break_start, break_end)

-- SOP Management
programmes (id, equipment_id, file_name, file_path, file_type, uploaded_at)
3. Under Development (Next.js + Express.js)
3.1 What Has Been Migrated
Component	Status	Notes
Next.js frontend framework	✅	Basic setup complete
Express.js backend	✅	API structure ready
PostgreSQL connection	✅	Database connected
Authentication (JWT)	✅	Login/logout working
User roles structure	⚠️	Partial implementation
Machine monitoring	✅	Basic working
MQTT integration	✅	Sensor data flowing
Docker configuration	✅	Containerized
3.2 What is Partially Done
Component	Status	What's Missing
Dashboard	⚠️	Bottleneck visualization, RED box
Issue Reporting	⚠️	Needs shift logbook integration
User Management	⚠️	Multi-plant support missing
Equipment Management	⚠️	Plant assignment missing
3.3 What Has NOT Been Started
Shift Logbook (searchable/filterable)

Visual Bottleneck Dashboard

Issue Grouping (manual + AI)

Multi-plant architecture

Company Admin features

Super Admin features

Maintenance workflow

AI auto-grouping

Predictive maintenance alerts

4. What Needs to Be Built - Complete List
4.1 Priority 0 (P0) - MUST HAVE for Launch
#	Feature	Description	Time	Dependencies
1	Shift Logbook Database	Create shift_log_issues table with all fields	0.5 day	None
2	Shift Logbook API	POST /api/issues, GET /api/shift-logbook with search/filter	1 day	#1
3	Shift Logbook Frontend	Table with search input, date picker, filters, pagination	1.5 days	#2
4	Shift Logbook Export	Export filtered results to Excel/CSV	0.5 day	#2
5	Bottleneck API	GET /api/bottlenecks - calculate top issues by downtime	1 day	#1
6	Bottleneck Frontend	RED card for #1 issue, bar chart for top 5	1 day	#5
7	Issue Grouping Tables	issue_groups, issue_group_members	0.5 day	None
8	Issue Grouping API	POST /api/issue-groups, PUT /api/issues/:id/group	1 day	#7
9	Issue Grouping Frontend	Admin UI to select and group issues	1.5 days	#8
10	Update Bottleneck for Groups	Dashboard uses grouped data	0.5 day	#6, #8
P0 Total: 9 days

4.2 Priority 1 (P1) - SHOULD HAVE for Beta
#	Feature	Description	Time	Dependencies
11	AI Auto-grouping - Embeddings	sentence-transformers integration	2 days	#7
12	AI Auto-grouping - Similarity	Compare new issue with existing groups	1.5 days	#11
13	AI Similar Issue Suggestion	Suggest groups while operator types	1.5 days	#12
14	Maintenance Workflow Tables	Add assigned_to, status, resolution_notes to shift_log_issues	0.5 day	#1
15	Maintenance Assignment API	PUT /api/issues/:id/assign, PUT /api/issues/:id/status	1 day	#14
16	Maintenance Dashboard	View assigned issues, update status	1.5 days	#15
17	Multi-plant Tables	Add plants table, company_id, plant_id to users/equipment	1 day	None
18	Plant Management API	CRUD for plants	1 day	#17
19	Plant Management Frontend	Add/edit/delete plants	1 day	#18
20	Company Admin Dashboard	Multi-plant overview, company-wide reports	2 days	#17, #19
21	AI Anomaly Detection	Detect unusual stop patterns	2 days	#1
22	SOP Compliance Tracking	Track who viewed/completed SOPs	1.5 days	Existing programmes table
P1 Total: 16 days

4.3 Priority 2 (P2) - NICE TO HAVE for V2
#	Feature	Description	Time
23	Super Admin Dashboard	All companies overview, system health	1.5 days
24	Company Management (Super Admin)	Add/edit/delete companies, assign plans	2 days
25	AI Root Cause Recommendation	Suggest probable causes based on patterns	3 days
26	AI Predictive Maintenance Alerts	Predict failures based on degradation patterns	4 days
27	Real-time WebSocket Updates	Push notifications for new issues	2 days
28	Mobile App (React Native)	Dedicated mobile app for operators	10 days
29	OEE Calculation	Availability × Performance × Quality	2 days
30	Shift Comparison Report	Compare morning vs evening vs night	1.5 days
31	Audit Logs (Super Admin)	Track all actions across all companies	1.5 days
32	Billing & Subscription Management	Plan management, invoicing	3 days
P2 Total: 30.5 days

5. Complete Flow Diagrams by Role
5.1 Operator Flow
flowchart TD
    START([Operator Login]) --> A[Dashboard Home]
    
    A --> B{Choose Action}
    
    B -->|Start Shift| C[Flow Monitor Screen]
    B -->|View Results| D[My Results Screen]
    B -->|View SOP| E[SOP Viewer]
    
    C --> F{Machine Status}
    F -->|Running| G[Register Production]
    F -->|Stopped| H[Report Stop]
    F -->|Defect| I[Report Scrap]
    
    G --> G1[Enter: work hours, good qty, planned qty]
    G1 --> G2[Save → Update dashboard]
    
    H --> H1[Select category + reason from dropdown]
    H1 --> H2[Enter: duration, quantity lost]
    H2 --> H3[Add photo optional]
    H3 --> H4[Submit → Save to shift logbook]
    
    I --> I1[Select scrap category + reason]
    I1 --> I2[Enter quantity]
    I2 --> I3[Add photo optional]
    I3 --> I4[Submit → Save]
    
    C --> J[End Shift]
    J --> K[Show End of Shift Summary]
    K --> END([Logout])
    
    D --> D1[View: today's production, stops, scrap]
    D1 --> D2[View: efficiency percentage]
    
    E --> E1[View step-by-step instructions]
    E1 --> E2[Confirm completion]
    E2 --> E3[Track compliance]
5.2 Supervisor Flow
flowchart TD
    START([Supervisor Login]) --> A[Dashboard - Overview]
    
    A --> B[View 4 Summary Cards]
    B --> B1[Machines: running/stopped/idle]
    B --> B2[Production: good vs target]
    B --> B3[Scrap: quantity and rate]
    B --> B4[Stops: count and hours]
    
    A --> C[View #1 Bottleneck in RED]
    C --> C1[Shows: issue name, machine, count, downtime]
    C --> C2[Click → View Details]
    C2 --> C2a[Assign to maintenance]
    C2 --> C2b[Group with other issues]
    
    A --> D[Quick Actions]
    D --> D1[Shift Logbook]
    D --> D2[Stop Data]
    D --> D3[Scrap Data]
    D --> D4[Export Reports]
    
    D1 --> E[Shift Logbook Screen]
    E --> E1[Search by keyword]
    E --> E2[Filter by date/shift/machine/operator]
    E --> E3[View results table]
    E --> E4[Export to Excel]
    E --> E5[Group similar issues]
    
    D2 --> F[Stop Data Screen]
    F --> F1[View all stops with photos]
    F --> F2[Assign to maintenance]
    F --> F3[Group issues]
    
    D3 --> G[Scrap Data Screen]
    G --> G1[View top scrap reasons chart]
    G --> G2[Scrap by machine]
    G --> G3[Recent scrap entries]
    
    D4 --> H[Reports Screen]
    H --> H1[Select report type]
    H --> H2[Select date range]
    H --> H3[Apply filters]
    H --> H4[Generate & Export]
5.3 Plant Admin Flow
flowchart TD
    START([Plant Admin Login]) --> A[All Supervisor Features]
    
    A --> B[Equipment Management]
    B --> B1[Add new machine]
    B1 --> B1a[Enter name, type, parent]
    B1 --> B1b[Upload machine icon]
    B1 --> B1c[Assign stop reasons]
    B1 --> B1d[Assign scrap reasons]
    
    B --> B2[Edit/Delete machine]
    B --> B3[Assign operators to machine]
    
    A --> C[User Management]
    C --> C1[Add new user]
    C1 --> C1a[Enter name, email, password]
    C1 --> C1b[Assign role: Operator/Supervisor]
    C1 --> C1c[Assign to machine]
    
    C --> C2[Edit/Delete user]
    C --> C3[Reset password]
    
    A --> D[Stop Reasons Configuration]
    D --> D1[Add stop reason type]
    D1 --> D1a[Mechanical, Electrical, Operator, Material]
    D --> D2[Add sub-reasons under type]
    D2 --> D2a[Belt Issue, Motor Fault, etc.]
    D --> D3[Assign to specific machines]
    
    A --> E[Scrap Reasons Configuration]
    E --> E1[Add scrap reason type]
    E1 --> E1a[Dimensional, Surface, Material]
    E --> E2[Add sub-reasons]
    E --> E3[Assign to machines]
    
    A --> F[Shift Configuration]
    F --> F1[Add/Edit shifts]
    F1 --> F1a[Morning, Evening, Night]
    F1 --> F1b[Set start/end times]
    F1 --> F1c[Set break times]
    
    A --> G[SOP Management]
    G --> G1[Upload SOP per machine]
    G1 --> G1a[PDF, images, videos]
    G --> G2[Edit/Delete SOP]
5.4 Company Admin Flow





























5.5 Super Admin Flow
flowchart TD
    START([Super Admin Login]) --> A[System Dashboard]
    
    A --> B[System Overview]
    B --> B1[Companies count, users count, machines count]
    B --> B2[System health: API, DB, MQTT, WebSocket]
    B --> B3[Top performing companies]
    B --> B4[Recent activity feed]
    
    A --> C[Company Management]
    C --> C1[View all companies]
    C1 --> C1a[Company name, plants, users, status]
    C --> C2[Add new company]
    C2 --> C2a[Enter company details]
    C2 --> C2b[Assign subscription plan]
    C2 --> C2c[Send welcome email]
    C --> C3[Edit/Suspend/Delete company]
    
    A --> D[User Management - All Companies]
    D --> D1[View all users across all companies]
    D --> D2[Filter by company, role, status]
    D --> D3[Impersonate user for support]
    
    A --> E[System Settings]
    E --> E1[General: system name, support email, timezone]
    E --> E2[Feature flags: enable/disable features globally]
    E --> E3[Default values for new companies]
    
    A --> F[Global Configuration]
    F --> F1[Global stop reasons template]
    F --> F2[Global scrap reasons template]
    F --> F3[Default shifts]
    
    A --> G[License & Billing]
    G --> G1[License information]
    G --> G2[Company billing summary]
    G --> G3[Total revenue]
    G --> G4[Generate invoices]
    
    A --> H[All Audit Logs]
    H --> H1[View all actions across all companies]
    H --> H2[Filter by company, user, action]
    H --> H3[Export for security audit]
    
    A --> I[Announcements]
    I --> I1[Send to all companies]
    I --> I2[Send to specific company]
    I --> I3[Maintenance notifications]
    I --> I4[Feature update announcements]
6. Industry Standard - How Competitors Built Their Products
6.1 TeepTrak Architecture
flowchart LR
    subgraph FACTORY["Factory Floor"]
        S[Sensors: current, vibration]
        T[Industrial Tablet]
    end
    
    subgraph EDGE["Edge Layer"]
        E[Field V4 Gateway]
    end
    
    subgraph CLOUD["Cloud Platform"]
        API[REST API]
        DB[(PostgreSQL)]
        AI[JEMBA AI Engine]
        WS[WebSocket Server]
    end
    
    subgraph UI["User Interface"]
        W[Web Dashboard]
        M[Mobile App]
    end
    
    S --> T --> E --> API
    API --> DB
    DB --> AI
    API --> WS
    WS --> W
    WS --> M
TeepTrak Key Technical Decisions:

Non-intrusive sensors - No PLC access required (48-hour deployment)

Industrial tablet as edge - Pre-configured, plug-and-play

Cloud-first architecture - No on-premise option

JEMBA AI - Trained on 450+ factories' data

Mobile-first operator interface - Tablet/phone primary

6.2 TRACTIAN Architecture
flowchart LR
    subgraph FACTORY["Factory Floor"]
        S1[Smart Trac: vibration]
        S2[Smart Trac: temperature]
        S3[Smart Trac: ultrasound]
    end
    
    subgraph EDGE["Edge Layer"]
        R[Receiver Gateway]
    end
    
    subgraph CLOUD["Cloud Platform"]
        API[REST API]
        DB[(Time-series DB)]
        AI[Auto Diagnosis AI]
        CMMS[CMMS Module]
    end
    
    subgraph UI["User Interface"]
        W[Web Dashboard]
        M[Mobile App]
    end
    
    S1 --> R
    S2 --> R
    S3 --> R
    R --> API
    API --> DB
    DB --> AI
    AI --> CMMS
    API --> W
    API --> M
TRACTIAN Key Technical Decisions:

Hardware-first approach - Patented wireless sensors (3-year battery)

Time-series database - Optimized for sensor data

Auto Diagnosis AI - Trained on 3.5B+ vibration samples

CMMS integration - Full maintenance workflow

GenAI copilot - Query manuals, SOPs, work orders

6.3 Tulip Architecture
flowchart LR
    subgraph FACTORY["Factory Floor"]
        V[Cameras/Video]
        M[Machine Telemetry]
        O[Operator Workflows]
    end
    
    subgraph PLATFORM["Tulip Platform"]
        E[Edge Device]
        C[Cloud Platform]
        NV[NVIDIA AI]
        DB[(Database)]
    end
    
    subgraph UI["User Interface"]
        S[Studio: No-code builder]
        W[Web Dashboard]
        FP[Factory Playback]
    end
    
    V --> E
    M --> E
    O --> E
    E --> C
    C --> NV
    C --> DB
    C --> S
    C --> FP
    C --> W
Tulip Key Technical Decisions:

No-code platform - Customers build their own apps

Video + data integration - Factory Playback with NVIDIA AI

Edge-first - Local processing for video

Human-first AI - "AI should increase leverage of people"

6.4 FP Analyzer Proposed Architecture
flowchart TD
    subgraph FACTORY["Factory Floor"]
        S1[Current Sensors: Shelly]
        S2[Temperature: DS18B20]
        S3[Manual: Tablet/Phone]
    end
    
    subgraph EDGE["Edge Layer - Optional"]
        R[Raspberry Pi / Industrial Gateway]
        M[MQTT Broker - Mosquitto]
    end
    
    subgraph CLOUD["Cloud Platform - Next.js + Express"]
        API[REST API - Express]
        DB[(PostgreSQL)]
        AI[AI Service - sentence-transformers]
        WS[WebSocket - Socket.io]
    end
    
    subgraph FRONTEND["Frontend - Next.js"]
        O[Operator App]
        S[Supervisor Dashboard]
        A[Admin Panel]
        SA[Super Admin Panel]
    end
    
    S1 --> R
    S2 --> R
    S3 --> API
    R --> M
    M --> API
    API --> DB
    DB --> AI
    API --> WS
    WS --> O
    WS --> S
    WS --> A
    WS --> SA
FP Analyzer Key Technical Decisions:

Optional hardware - Raspberry Pi or industrial gateway

MQTT for sensor data - Lightweight, offline buffering

Cloud-native - Docker + AWS Lightsail ready

AI for auto-grouping - sentence-transformers (free, open source)

Multi-tenant - Each company isolated

Role-based access - 5 distinct roles

6.5 What FP Analyzer Should Learn from Competitors
Competitor	What FP Analyzer Should Adopt	What FP Analyzer Should Avoid
TeepTrak	48-hour deployment, non-intrusive sensors, simple UI	High price (€160k/year)
TRACTIAN	AI-driven insights, prescriptive actions	Hardware-only approach, complexity
Tulip	Video integration (future), no-code flexibility (future)	Platform complexity, higher price
All	Cloud-first, real-time updates, mobile access	Over-engineering for SMEs
7. Database Schema - Complete
7.1 Core Tables
sql
-- Companies (Super Admin only)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    subscription_plan VARCHAR(50) DEFAULT 'professional', -- basic, professional, enterprise
    subscription_valid_until DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Plants (within a company)
CREATE TABLE plants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (all roles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- super_admin, company_admin, plant_admin, supervisor, operator, maintenance
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment / Machines
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'machine', -- machine, assembly_station, manual_station
    status VARCHAR(20) DEFAULT 'offline',
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Assignment (which operator works on which machine)
CREATE TABLE equipment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(equipment_id, user_id)
);
7.2 Shift Logbook & Issues
sql
-- Shift Logbook Issues (P0 - New table)
CREATE TABLE shift_log_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shift VARCHAR(20) NOT NULL, -- Morning, Evening, Night
    category VARCHAR(50) NOT NULL, -- Mechanical, Electrical, Operator, Material
    issue_type VARCHAR(100) NOT NULL, -- Belt Issue, Motor Fault, etc.
    description TEXT,
    duration_minutes INTEGER DEFAULT 0,
    quantity_lost INTEGER DEFAULT 0,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, closed
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    reported_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Issue Groups (for correlation - P0)
CREATE TABLE issue_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    group_name VARCHAR(255) NOT NULL,
    root_cause TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Issue Group Members (which issue types belong to which group)
CREATE TABLE issue_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES issue_groups(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL, -- NULL = applies to all machines
    created_at TIMESTAMP DEFAULT NOW()
);
7.3 Production & Quality Data
sql
-- Production Data
CREATE TABLE production_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shift VARCHAR(20) NOT NULL,
    work_hours DECIMAL(5,2),
    good_quantity INTEGER,
    planned_quantity INTEGER,
    comment TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Scrap Data
CREATE TABLE scrap_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shift VARCHAR(20) NOT NULL,
    scrap_reason_type VARCHAR(50) NOT NULL, -- Dimensional, Surface, Material
    scrap_reason VARCHAR(100) NOT NULL, -- Oversize, Scratch, etc.
    quantity INTEGER,
    comment TEXT,
    photo_url TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Stop Data (from sensors or manual)
CREATE TABLE stop_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    shift VARCHAR(20) NOT NULL,
    stop_reason_type VARCHAR(50) NOT NULL,
    stop_reason VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    quantity_lost INTEGER,
    comment TEXT,
    photo_url TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
7.4 Configuration Tables
sql
-- Stop Reasons Configuration
CREATE TABLE stop_reasons_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = global
    reason_type VARCHAR(50) NOT NULL, -- Mechanical, Electrical, Operator, Material
    reason_name VARCHAR(100) NOT NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL, -- NULL = applies to all
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scrap Reasons Configuration
CREATE TABLE scrap_reasons_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = global
    reason_type VARCHAR(50) NOT NULL, -- Dimensional, Surface, Material
    reason_name VARCHAR(100) NOT NULL,
    equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Shifts Configuration
CREATE TABLE shifts_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL, -- Morning, Evening, Night
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start TIME,
    break_end TIME,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SOP / Programmes
CREATE TABLE programmes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plant_id UUID REFERENCES plants(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50), -- pdf, image, video
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- SOP Compliance Tracking (P1)
CREATE TABLE sop_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programme_id UUID REFERENCES programmes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    shift VARCHAR(20),
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    deviation_reason TEXT
);
7.5 System Tables (Super Admin)
sql
-- Audit Logs (P2)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value TEXT,
    new_value TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements (P2)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = all companies
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- System Settings (Super Admin)
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
8. API Endpoints - Complete List
8.1 Authentication
Method	Endpoint	Description	Role
POST	/api/auth/login	User login	All
POST	/api/auth/logout	User logout	All
POST	/api/auth/refresh	Refresh JWT token	All
GET	/api/auth/me	Get current user	All
POST	/api/auth/change-password	Change password	All
8.2 Users
Method	Endpoint	Description	Role
GET	/api/users	Get all users (filter by company/plant)	Admin+
GET	/api/users/:id	Get user by ID	Admin+
POST	/api/users	Create user	Admin+
PUT	/api/users/:id	Update user	Admin+
DELETE	/api/users/:id	Delete user	Admin+
POST	/api/users/:id/reset-password	Reset password	Admin+
8.3 Equipment / Machines
Method	Endpoint	Description	Role
GET	/api/equipment	Get all equipment	Supervisor+
GET	/api/equipment/:id	Get equipment by ID	Supervisor+
POST	/api/equipment	Create equipment	Plant Admin+
PUT	/api/equipment/:id	Update equipment	Plant Admin+
DELETE	/api/equipment/:id	Delete equipment	Plant Admin+
POST	/api/equipment/:id/assign	Assign operator to equipment	Plant Admin+
8.4 Shift Logbook (P0)
Method	Endpoint	Description	Role
GET	/api/shift-logbook	Get issues with search/filter	Supervisor+
GET	/api/shift-logbook/export	Export to Excel/CSV	Supervisor+
POST	/api/issues	Create new issue	Operator+
GET	/api/issues/:id	Get issue by ID	Supervisor+
PUT	/api/issues/:id	Update issue	Admin+
PUT	/api/issues/:id/assign	Assign issue to maintenance	Supervisor+
PUT	/api/issues/:id/status	Update issue status	Maintenance+
8.5 Bottleneck Dashboard (P0)
Method	Endpoint	Description	Role
GET	/api/bottlenecks	Get top issues by downtime	Supervisor+
GET	/api/bottlenecks/trend	Get trend vs previous period	Supervisor+
GET	/api/bottlenecks/machine	Get bottlenecks by machine	Supervisor+
8.6 Issue Grouping (P0)
Method	Endpoint	Description	Role
GET	/api/issue-groups	Get all issue groups	Supervisor+
POST	/api/issue-groups	Create new group	Supervisor+
PUT	/api/issue-groups/:id	Update group	Supervisor+
DELETE	/api/issue-groups/:id	Delete group	Supervisor+
POST	/api/issue-groups/:id/members	Add issue type to group	Supervisor+
DELETE	/api/issue-groups/:id/members/:memberId	Remove from group	Supervisor+
8.7 AI Features (P1-P2)
Method	Endpoint	Description	Role
POST	/api/ai/similar-issues	Suggest similar issues	Operator+
POST	/api/ai/auto-group	Suggest auto-grouping	Supervisor+
POST	/api/ai/root-cause	Suggest root cause	Supervisor+
GET	/api/ai/anomalies	Detect anomalies	Supervisor+
GET	/api/ai/predictive-alerts	Get predictive alerts	Supervisor+
8.8 Production & Quality
Method	Endpoint	Description	Role
GET	/api/production	Get production data	Supervisor+
POST	/api/production	Record production	Operator+
GET	/api/scrap	Get scrap data	Supervisor+
POST	/api/scrap	Record scrap	Operator+
GET	/api/stops	Get stop data	Supervisor+
POST	/api/stops	Record stop (manual)	Operator+
8.9 Configuration
Method	Endpoint	Description	Role
GET	/api/stop-reasons	Get stop reasons	All
POST	/api/stop-reasons	Add stop reason	Plant Admin+
GET	/api/scrap-reasons	Get scrap reasons	All
POST	/api/scrap-reasons	Add scrap reason	Plant Admin+
GET	/api/shifts	Get shifts	All
POST	/api/shifts	Add shift	Plant Admin+
8.10 Plants & Companies (Multi-plant)
Method	Endpoint	Description	Role
GET	/api/plants	Get all plants	Company Admin+
POST	/api/plants	Create plant	Company Admin+
PUT	/api/plants/:id	Update plant	Company Admin+
DELETE	/api/plants/:id	Delete plant	Company Admin+
GET	/api/company/reports	Company-wide reports	Company Admin+
GET	/api/company/compare	Compare plants	Company Admin+
8.11 Super Admin Only
Method	Endpoint	Description
GET	/api/admin/companies	Get all companies
POST	/api/admin/companies	Create company
PUT	/api/admin/companies/:id	Update company
DELETE	/api/admin/companies/:id	Delete company
GET	/api/admin/audit-logs	Get all audit logs
GET	/api/admin/system-health	Get system health
PUT	/api/admin/settings	Update system settings
POST	/api/admin/announcements	Send announcement
9. Development Priority & Timeline
9.1 Phase 0: Foundation (Week 1) - Already Partially Done
Task	Time	Status
Next.js project setup	1 day	✅ Done
Express.js API setup	1 day	✅ Done
PostgreSQL database	1 day	✅ Done
Authentication (JWT)	1 day	✅ Done
Docker configuration	1 day	✅ Done
Basic user roles	1 day	⚠️ Partial
9.2 Phase 1: P0 Features (Weeks 2-4) - 9 days
Task	Time	Day
Create shift_log_issues table	0.5 day	Day 1
Shift Logbook API (POST, GET, search/filter)	1 day	Day 1-2
Shift Logbook Frontend (table, search, filters)	1.5 days	Day 2-3
Shift Logbook Export (Excel/CSV)	0.5 day	Day 3-4
Bottleneck API (calculate top issues)	1 day	Day 4-5
Bottleneck Frontend (RED card, bar chart)	1 day	Day 5-6
Issue Grouping tables (groups, members)	0.5 day	Day 6
Issue Grouping API (CRUD, assign)	1 day	Day 6-7
Issue Grouping Frontend (admin UI)	1.5 days	Day 7-8
Update Bottleneck to use groups	0.5 day	Day 8-9
Testing & Integration	1 day	Day 9-10
Phase 1 Total: 10 days

9.3 Phase 2: P1 Features (Weeks 5-8) - 16 days
Task	Time	Day
AI Auto-grouping - Embeddings	2 days	Day 1-2
AI Auto-grouping - Similarity	1.5 days	Day 2-3
AI Similar Issue Suggestion	1.5 days	Day 3-4
Maintenance tables (assign, status)	0.5 day	Day 4-5
Maintenance Assignment API	1 day	Day 5-6
Maintenance Dashboard Frontend	1.5 days	Day 6-7
Multi-plant tables (plants, company_id)	1 day	Day 7-8
Plant Management API	1 day	Day 8-9
Plant Management Frontend	1 day	Day 9-10
Company Admin Dashboard	2 days	Day 10-12
AI Anomaly Detection	2 days	Day 12-14
SOP Compliance Tracking	1.5 days	Day 14-15
Testing & Integration	1 day	Day 15-16
Phase 2 Total: 16 days

9.4 Phase 3: P2 Features (Weeks 9-13) - 30 days
Task	Time	Day
Super Admin Dashboard	1.5 days	Day 1-2
Company Management (Super Admin)	2 days	Day 2-4
AI Root Cause Recommendation	3 days	Day 4-7
AI Predictive Maintenance Alerts	4 days	Day 7-11
Real-time WebSocket Updates	2 days	Day 11-13
Mobile App (React Native)	10 days	Day 13-23
OEE Calculation	2 days	Day 23-25
Shift Comparison Report	1.5 days	Day 25-26
Audit Logs (Super Admin)	1.5 days	Day 26-28
Billing & Subscription Management	3 days	Day 28-31
Testing & Integration	2 days	Day 31-33
Phase 3 Total: 33 days

9.5 Complete Timeline Summary
Phase	Focus	Time	Cumulative
Phase 0	Foundation	5 days	5 days
Phase 1	P0 Features (Shift Logbook, Bottleneck, Grouping)	10 days	15 days
Phase 2	P1 Features (AI, Maintenance, Multi-plant)	16 days	31 days
Phase 3	P2 Features (Super Admin, Mobile, Predictive)	33 days	64 days
Total	All Features	~60-65 days	-
10. Technology Stack Recommendations
10.1 Current Stack (FP Analyzer New Version)
Layer	Technology	Purpose
Frontend	Next.js 14+	React framework, SSR optional
Backend	Express.js	Node.js API server
Database	PostgreSQL	Primary database
Authentication	JWT + bcrypt	User authentication
Real-time	Socket.io	WebSocket for live updates
MQTT	Mosquitto	Sensor data ingestion
Container	Docker	Deployment
Cloud	AWS Lightsail	Hosting
10.2 Recommended Additions for AI
AI Component	Technology	Why
Text Embeddings	sentence-transformers (all-MiniLM-L6-v2)	Free, runs locally, good accuracy
Vector Database	Chroma / FAISS	Store embeddings for similarity search
Similarity Threshold	85%	Auto-group when confidence high
Anomaly Detection	Isolation Forest (scikit-learn)	Detect unusual stop patterns
Time Series	Prophet (Facebook)	Predictive maintenance (future)
ML Model Serving	TensorFlow.js or ONNX	Run models in Node.js
10.3 Recommended for Frontend
Component	Technology	Purpose
UI Framework	Tailwind CSS	Styling
Charts	Recharts / Chart.js	Dashboard charts
Tables	React Table / AG Grid	Shift logbook tables
Forms	React Hook Form	Issue reporting forms
State Management	Zustand / Context API	Global state
Date Pickers	react-datepicker	Filter by date
10.4 Deployment Architecture
yaml
# Docker Compose for Production
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fpanalyzer
      POSTGRES_USER: fpuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://fpuser:${DB_PASSWORD}@postgres:5432/fpanalyzer
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
  
  mqtt:
    image: eclipse-mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
  
  ai-service:
    build: ./ai-service
    environment:
      MODEL_PATH: /models/all-MiniLM-L6-v2
    ports:
      - "5000:5000"
    depends_on:
      - backend
11. Conclusion
11.1 Development Status Summary
Category	Status	Completion
Existing Features (Laravel Live)	✅ Complete	100%
New Version Foundation (Next.js)	✅ Partial	60%
P0 Features (Launch Requirements)	❌ Not Started	0%
P1 Features (Beta Requirements)	❌ Not Started	0%
P2 Features (V2 Requirements)	❌ Not Started	0%
11.2 What You Need to Build Next (Tomorrow Morning)
Priority	Feature	Time
1	Create shift_log_issues database table	0.5 day
2	Build Shift Logbook API (POST /api/issues, GET /api/shift-logbook)	1 day
3	Build Shift Logbook Frontend (table with search/filter)	1.5 days
4	Build Bottleneck API (calculate top issues)	1 day
5	Build Bottleneck Frontend (RED box for #1, bar chart)	1 day
6	Build Issue Grouping tables and API	1.5 days
7	Build Issue Grouping Frontend	1.5 days
Total: 8 days to have P0 features complete

11.3 Critical Success Factors
Focus on P0 first - Don't start P1/P2 until P0 is complete

Test with real data - Use your existing customer's data

Get feedback early - Show supervisor dashboard to your partner

Iterate quickly - Build, test, fix, repeat

11.4 Final Word
You have a clear roadmap now.

Document	Purpose
Business Document	Market analysis, competitors, strategy
This Development Document	What to build, how to build, timeline