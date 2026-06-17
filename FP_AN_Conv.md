FP Analyzer - Complete Master Document
Complete Documentation from First Principles to Final Strategy

Document Type: Comprehensive Reference Guide
Target Audience: Founder, Development Team, Investors, Partners, New Team Members
Date: June 2026
Purpose: Single source of truth - everything discussed, researched, and decided

Table of Contents
What is FP Analyzer? - The Core Question

The Problem We Are Solving

The Solution - FP Analyzer Explained

Current Status - Where Are We?

What We Have Built So Far (Existing Features)

What We Learned from Partner (The Requirements)

What is Missing - The Gap Analysis

User Roles - Who Uses FP Analyzer

Complete Flow Diagrams

Competitor Analysis - Who Else is in the Market

AI Features - What Competitors Are Doing

European Market Analysis

What We Need to Build - Complete Development List

Hardware Options - Raspberry Pi vs Industrial Gateways

Database Schema - Complete

API Endpoints - Complete List

Development Timeline & Priority

Technology Stack

Go-To-Market Strategy

FAQs - All Questions Asked

1. What is FP Analyzer? - The Core Question
1.1 Simple Definition
FP Analyzer is a manufacturing analytics platform that helps factories:

Track machine performance in real-time

Identify production bottlenecks visually

Log and search all issues by shift

Group similar issues reported with different names

Reduce downtime and improve efficiency

1.2 One Line Summary
"FP Analyzer is a simple, affordable, cloud-based system that shows factory supervisors their biggest production problem in a BIG RED BOX, helps operators log issues with photos, and lets anyone search past issues like a Google search for their factory."

1.3 What Problem Does It Solve?
Factory Problem	FP Analyzer Solution
"We don't know why machines stop"	Real-time stop tracking with reasons
"Same issue reported with different names"	AI auto-grouping of similar issues
"Can't find old issues when needed"	Searchable shift logbook
"Don't know what's the biggest problem"	Visual bottleneck dashboard (#1 in RED)
"Operators don't follow standard process"	SOP module with compliance tracking
"Maintenance doesn't know what to fix first"	Issue assignment and prioritization
1.4 Core Philosophy
"Simplicity is the key. Easy to set up. Easy to use. Visual presentation of what is the biggest bottleneck."

This came directly from our partner and drives every decision.

2. The Problem We Are Solving
2.1 Manufacturing Reality Today (Without FP Analyzer)
flowchart TD
    A[Factory Problem] --> B[Machine stops]
    B --> C[Operator writes on whiteboard or paper]
    C --> D[Different operators use different names]
    D --> E["'Belt loose', 'Belt slipping', 'Belt tension'"]
    E --> F[Supervisor doesn't know all are same issue]
    F --> G[Same problem repeats for weeks]
    G --> H[Production loss, customer delays]
2.2 Key Pain Points (From Real Customers)
Pain Point	Customer Quote (Paraphrased)
Quality issues untracked	"Defects and rework often go untracked and unresolved"
Maintenance problems	"Equipment issues causing production delays"
Process variation	"Assembly teams not following standardized instructions"
Root cause confusion	"Same issues reported with different terminology - can't identify true problems"
2.3 The "Shift Logbook" Gap
Factories today use:

Paper notebooks (lost, can't search)

Whiteboards (erased at end of shift)

Excel sheets (manual, time-consuming)

Nothing at all (problems forgotten)

What they need: A digital, searchable shift logbook that anyone can use.

2.4 The "Different Names" Problem
Actual Problem	Operator A Says	Operator B Says	Operator C Says
Loose belt	"Belt issue"	"Belt slipping"	"Belt loose"
Motor bearing wear	"Motor noise"	"Bearing problem"	"Motor fault"
Power fluctuation	"Power cut"	"Electricity issue"	"Voltage drop"
Result: Supervisor thinks there are 3 different problems. Actually, only 1 problem. Fix is delayed. Production suffers.

FP Analyzer Solution: AI auto-grouping that connects "Belt issue", "Belt slipping", and "Belt loose" as ONE issue - "BELT TENSION PROBLEM".

3. The Solution - FP Analyzer Explained
3.1 High-Level Architecture
flowchart LR
    subgraph FACTORY["🏭 Factory Floor"]
        S[Sensors]
        T[Tablet/Phone]
        M[Machine]
    end
    
    subgraph EDGE["📡 Edge Gateway"]
        R[Raspberry Pi]
        B[Offline Buffer]
    end
    
    subgraph CLOUD["☁️ FP Analyzer Cloud"]
        API[API Server]
        DB[(Database)]
        AI[AI Engine]
    end
    
    subgraph USERS["👥 Users"]
        OP[Operator]
        SP[Supervisor]
        AD[Admin]
    end
    
    S --> R
    T --> API
    M --> R
    R --> API
    B --> API
    API --> DB
    DB --> AI
    API --> OP
    API --> SP
    API --> AD
3.2 How It Works - Simple Explanation
Step 1 - Setup (One Time, 1 Hour)

Admin adds machines, operators, shifts

Configures stop reasons (dropdown options)

Uploads SOPs (work instructions)

Step 2 - Daily Operation

Operator logs in, sees their machine

Machine runs normally - system tracks automatically

Machine stops - operator selects reason from dropdown, takes photo

Issue saved to shift logbook

Step 3 - Supervisor Review

Opens dashboard - sees #1 bottleneck in RED

Searches shift logbook for any issue

Groups similar issues (or AI does automatically)

Step 4 - Continuous Improvement

Reports show trends

Problems get fixed permanently

OEE improves

3.3 Key Features Summary
Feature	What It Does	Who Uses It
Real-time Machine Monitoring	Shows if machine is running or stopped	Operator, Supervisor
Issue Reporting with Dropdown	Standardized reasons, no free text	Operator
Photo Attachment	Take photo of problem	Operator
Shift Logbook	Searchable database of all issues	Supervisor
Bottleneck Dashboard	Shows #1 problem in RED	Supervisor
Issue Grouping	Connect same issues with different names	Supervisor, AI
SOP Module	Show work instructions, track compliance	Operator, Supervisor
Multi-Plant Support	Manage multiple factories	Company Admin
Super Admin	Manage all companies	Platform Owner
4. Current Status - Where Are We?
4.1 Two Versions - Important to Understand
Version	Technology	Status	Customers	When to Use
Live Version (Old)	Laravel (PHP)	✅ Working	1 customer	Keep running for existing customer
New Version	Next.js + Express.js	🔄 Development	0 customers	Build all new features here
4.2 Why Two Versions?
Old Version: Built earlier, works fine, but hard to add new features (older stack)

New Version: Modern stack, easier to add features, but not complete yet

Strategy: Keep old version running for the 1 customer. Build new version with all partner-requested features. Migrate customer when ready.

4.3 Current Development Status of New Version
Component	Status	Notes
Next.js setup	✅ Complete	Basic framework ready
Express.js API	✅ Complete	Basic structure ready
PostgreSQL	✅ Complete	Connected and working
Authentication	✅ Complete	Login/logout working
Machine monitoring	✅ Complete	Basic working
Sensor data (MQTT)	✅ Complete	Data flowing
Docker configuration	✅ Complete	Ready for deployment
User roles	⚠️ Partial	Basic structure, needs refinement
Dashboard	⚠️ Partial	Basic, missing bottleneck view
Shift Logbook	❌ Missing	Priority to build
Bottleneck Dashboard	❌ Missing	Priority to build
Issue Grouping	❌ Missing	Priority to build
AI Features	❌ Missing	To be built
Multi-plant	❌ Missing	To be built
Company Admin	❌ Missing	To be built
Super Admin	❌ Missing	To be built
5. What We Have Built So Far (Existing Features)
5.1 Complete List of Working Features (Old Version - Laravel)
#	Feature	Description	Status
1	User Authentication	Login/logout with email/password	✅
2	Role-Based Access	Operator, Supervisor, Admin roles	✅
3	Machine Management	Add/edit/delete machines	✅
4	Operator Assignment	Assign operators to specific machines	✅
5	Stop Reason Configuration	Admin configures dropdown options	✅
6	Scrap Reason Configuration	Admin configures dropdown options	✅
7	Issue Reporting (Stop)	Operator selects reason, adds duration	✅
8	Issue Reporting (Scrap)	Operator selects reason, adds quantity	✅
9	Production Recording	Operator enters good parts, target	✅
10	Photo Attachment	Take/attach photo to issues	✅
11	SOP Viewing	View work instructions per machine	✅
12	Shift Configuration	Morning, Evening, Night shifts	✅
13	Basic Dashboard	Summary counters, area chart	✅
14	Stop Data List	View all stops with filters	✅
15	Scrap Data List	View all scrap with filters	✅
16	Production Data List	View all production entries	✅
17	Export to Excel	Basic export functionality	✅
5.2 What Is NOT in Existing Version
Missing Feature	Why Important
Visual bottleneck dashboard	Can't see #1 problem at a glance
Searchable shift logbook	Can't find old issues easily
Issue grouping	Same issues with different names appear separate
AI auto-grouping	Manual grouping is time-consuming
Maintenance workflow	No assignment or status tracking
Multi-plant support	Can't manage multiple factories
Company admin	No company-wide view
Super admin	No platform management
6. What We Learned from Partner (The Requirements)
6.1 Partner's Core Message
"The key is simplicity. Easy to set up, easy to use, and visual presentation of what is the biggest bottleneck."

6.2 Detailed Requirements (From Partner Document)
Requirement	Explanation	Priority
Simple, easy-to-setup system	No IT team needed, 1-day setup	High
Visual insights into bottlenecks	See biggest problem immediately	High
Shift logbook (searchable)	Find any issue from any shift quickly	High
Issue correlation	Same problem with different names - connect them	High
Quality issues tracking	Track defects and rework	Medium
Maintenance problem tracking	Track equipment issues	Medium
Process standardization	SOP module for assembly	Medium
Data-driven decisions	Reports and analytics	Medium
6.3 Partner's Success Criteria
"Easy implementation, high user adoption, and clear visibility into what's actually happening on the production floor."

6.4 The "Assembly/Human" Challenge
Partner specifically mentioned that FP Analyzer must work for:

Machine-based production (sensors, stops, OEE)

Assembly lines (humans are the biggest challenge)

For assembly lines, they need:

SOP (Standard Operating Procedure) visibility

Operator compliance tracking

Deviation reporting

Variation reduction

7. What is Missing - The Gap Analysis
7.1 Gap Between Current and Required
Required Feature	Exists in Old?	Exists in New?	Must Build
Visual bottleneck dashboard (#1 in RED)	❌	❌	✅ P0
Searchable shift logbook	❌	❌	✅ P0
Issue grouping (manual)	❌	❌	✅ P0
AI auto-grouping	❌	❌	✅ P1
Maintenance assignment workflow	❌	❌	✅ P1
Multi-plant support	❌	❌	✅ P1
Company admin features	❌	❌	✅ P1
Super admin features	❌	❌	✅ P2
SOP compliance tracking	⚠️ Basic	⚠️ Basic	✅ P1
AI anomaly detection	❌	❌	✅ P2
AI predictive maintenance	❌	❌	✅ P2
Real-time WebSocket	❌	❌	✅ P2
Mobile app	❌	❌	✅ P2
7.2 Priority Classification
Priority	Meaning	Features
P0	Must have for launch	Shift logbook, bottleneck dashboard, issue grouping
P1	Should have for beta	AI auto-grouping, maintenance, multi-plant, company admin
P2	Nice to have for V2	Super admin, predictive AI, mobile app, WebSocket
7.3 What Partner Asked vs What We Have - Final Verdict
Partner Asked	Current Status	Action
Visual bottleneck	❌ Missing	Build P0
Shift logbook	❌ Missing	Build P0
Issue correlation	❌ Missing	Build P0
Simplicity	✅ Mostly there	Keep as is
Easy setup	✅ Good	Keep as is
Conclusion: Partner requirements are NOT covered in current version. Must build P0 features.

8. User Roles - Who Uses FP Analyzer
8.1 The 5 Roles
flowchart TD
    subgraph ROLES["FP Analyzer User Roles"]
        OP[Operator<br/>Works on machine]
        SP[Supervisor<br/>Manages shift]
        PA[Plant Admin<br/>Manages one plant]
        CA[Company Admin<br/>Manages all plants]
        SA[Super Admin<br/>Manages all companies]
    end
    
    OP -->|Reports to| SP
    SP -->|Reports to| PA
    PA -->|Reports to| CA
    CA -->|Reports to| SA
8.2 Role Details - Complete Table
Role	Who	What They Can Do	What They Cannot Do
Operator	Machine operator	See own machine only, report issues, record production, view SOP, end shift	See other machines, edit issues, view reports, configure anything
Supervisor	Shift in-charge	See all machines in plant, bottleneck dashboard, shift logbook, group issues, assign to maintenance	Configure equipment, add users, change shifts
Plant Admin	Factory manager	All supervisor features + add/edit machines, add/edit users, configure shifts, configure stop reasons, upload SOP	See other plants, change company settings
Company Admin	Company owner	All plant admin features + see all plants, multi-plant dashboard, company-wide reports, global configuration	Change system settings, see other companies
Super Admin	Platform owner	All company admin features + add/edit companies, system settings, license management, audit logs, announcements	Nothing - highest access
8.3 Permission Matrix
Permission	Operator	Supervisor	Plant Admin	Company Admin	Super Admin
View own machine	✅	❌	❌	❌	❌
View all machines (plant)	❌	✅	✅	✅	✅
View all plants (company)	❌	❌	❌	✅	✅
View all companies	❌	❌	❌	❌	✅
Report issues	✅	✅	✅	✅	✅
View bottleneck dashboard	❌	✅	✅	✅	✅
Search shift logbook	❌	✅	✅	✅	✅
Group issues	❌	✅	✅	✅	✅
Manage equipment	❌	❌	✅	✅	✅
Manage users (own plant)	❌	❌	✅	✅	✅
Manage users (all plants)	❌	❌	❌	✅	✅
Manage plants	❌	❌	❌	✅	✅
Manage companies	❌	❌	❌	❌	✅
System settings	❌	❌	❌	❌	✅
Audit logs	❌	❌	❌	❌	✅
9. Complete Flow Diagrams
9.1 Operator Daily Flow
flowchart TD
    START([Operator logs in]) --> DASH[Dashboard]
    DASH --> MONITOR[Flow Monitor]
    
    MONITOR --> START_SHIFT[Start Shift]
    START_SHIFT --> WORK{During Shift}
    
    WORK -->|Machine Running| PROD[Record Production]
    PROD --> PROD1[Enter: work hours, good qty, planned qty]
    PROD1 --> PROD2[Save → Dashboard updates]
    PROD2 --> WORK
    
    WORK -->|Machine Stops| STOP[Report Stop]
    STOP --> STOP1[Select category + reason from dropdown]
    STOP1 --> STOP2[Enter: duration, quantity lost]
    STOP2 --> STOP3[Optional: take photo]
    STOP3 --> STOP4[Submit → Saves to shift logbook]
    STOP4 --> WORK
    
    WORK -->|Defective Part| SCRAP[Report Scrap]
    SCRAP --> SCRAP1[Select scrap reason from dropdown]
    SCRAP1 --> SCRAP2[Enter quantity]
    SCRAP2 --> SCRAP3[Optional: take photo]
    SCRAP3 --> SCRAP4[Submit → Saves]
    SCRAP4 --> WORK
    
    WORK -->|End of Shift| END[End Shift]
    END --> SUMMARY[Show Summary: production, stops, scrap]
    SUMMARY --> LOGOUT([Logout])
9.2 Supervisor Daily Flow
flowchart TD
    START([Supervisor logs in]) --> DASH[Dashboard]
    
    DASH --> SUMMARY[View 4 Summary Cards]
    SUMMARY --> S1[Machines: running/stopped/idle]
    SUMMARY --> S2[Production: good vs target]
    SUMMARY --> S3[Scrap: quantity and rate]
    SUMMARY --> S4[Stops: count and hours]
    
    DASH --> BOTTLENECK[View #1 Bottleneck in RED]
    BOTTLENECK --> B1[Shows: issue name, machine, count, downtime]
    B1 --> B2{Action}
    B2 -->|View Details| DETAIL[See all occurrences]
    B2 -->|Assign| ASSIGN[Assign to maintenance]
    B2 -->|Group| GROUP[Group with similar issues]
    
    DASH --> LOGBOOK[Open Shift Logbook]
    LOGBOOK --> SEARCH[Search by keyword]
    SEARCH --> FILTER[Filter by date/shift/machine/operator]
    FILTER --> VIEW[View results table]
    VIEW --> EXPORT[Export to Excel]
    VIEW --> GROUP2[Group selected issues]
    
    DASH --> REPORTS[Generate Reports]
    REPORTS --> SELECT[Select report type + date range]
    SELECT --> GENERATE[Generate & Export]
9.3 Issue Grouping Flow (Manual + AI)
flowchart TD
    START[Multiple issues reported] --> DISCOVER[Supervisor discovers similar issues]
    
    DISCOVER --> SELECT[Select issues from shift logbook]
    SELECT --> GROUP[Click 'Group Issues']
    GROUP --> MODAL[Modal opens]
    
    MODAL --> CHOICE{New or Existing Group?}
    CHOICE -->|New Group| NEW[Enter group name]
    NEW --> ROOT[Enter root cause]
    ROOT --> SAVE[Save group]
    
    CHOICE -->|Existing Group| EXISTING[Select existing group]
    EXISTING --> SAVE
    
    SAVE --> UPDATE[(Database updated: all issues linked to group)]
    UPDATE --> DASH[Dashboard shows grouped data]
    
    AI_START[AI Auto-grouping] --> AI_DETECT[AI detects similar new issue]
    AI_DETECT --> AI_SUGGEST[Suggests existing group to supervisor]
    AI_SUGGEST --> AI_CONFIRM[Supervisor confirms]
    AI_CONFIRM --> UPDATE
9.4 Machine Connection Flow (Hardware)
flowchart LR
    subgraph FACTORY["Factory Floor"]
        M[Machine]
        S[Shelly Current Sensor]
        T[Temperature Sensor]
    end
    
    subgraph EDGE["Edge Gateway"]
        R[Raspberry Pi]
        MQ[MQTT Broker]
        B[Offline Buffer]
    end
    
    subgraph CLOUD["Cloud"]
        API[Express API]
        DB[(PostgreSQL)]
        AI[AI Service]
    end
    
    subgraph UI["Dashboard"]
        WEB[Web Interface]
        MOB[Mobile App]
    end
    
    S -->|Current reading| R
    T -->|Temperature| R
    R -->|MQTT| MQ
    MQ -->|Real-time| API
    R -->|Offline| B
    B -->|When online| API
    API --> DB
    DB --> AI
    API --> WEB
    API --> MOB
10. Competitor Analysis - Who Else is in the Market
10.1 Market Overview
Metric	Value
Global Market Size (2026)	$12.18 Billion USD
Global Projected (2034)	$39.12 Billion USD
European Market Size (2024)	$5.64 Billion USD
European Projected (2035)	$9.02 Billion USD
10.2 Competitor Tiers
quadrantChart
    title Manufacturing Analytics Market
    x-axis "Low Price" --> "High Price"
    y-axis "Simple" --> "Complex"
    
    "FP Analyzer": [0.25, 0.3]
    "TeepTrak": [0.65, 0.7]
    "TRACTIAN": [0.7, 0.65]
    "Tulip": [0.75, 0.75]
    "Siemens/SAP": [0.9, 0.9]
    "Spreadsheets": [0.1, 0.1]
10.3 Direct Competitors (Our Target Segment)
Competitor	Headquarters	Target	Price (5 lines/year)	AI Feature	Weakness
TeepTrak	France	SMEs	€160,000	JEMBA AI	Too expensive for small SMEs
TRACTIAN	US	Mid-market	€160-200,000	Auto Diagnosis	Hardware-focused, expensive
Tulip	US	SMEs-Enterprise	€270-410,000	Factory Playback	Complex, expensive
MachineMetrics	US	CNC shops	€190-240,000	Limited	US-focused, limited scope
Evocon	Estonia	SMEs	~€10,000	None	Basic features, no AI
FP Analyzer	Sweden	SMEs	€5-10,000	Planned	Newer, less customers
10.4 Key Insights from Competitor Analysis
Insight	Implication for FP Analyzer
Competitors are expensive (€160k+/year)	FP Analyzer can win on price (€5-10k/year)
TeepTrak has strong AI (JEMBA)	Must build AI auto-grouping to compete
TRACTIAN has patented hardware	FP Analyzer can use off-the-shelf (Raspberry Pi)
SMEs are underserved	Focus on SMEs that can't afford TeepTrak
European market growing at 4.37% CAGR	Good time to enter
11. AI Features - What Competitors Are Doing
11.1 TeepTrak - JEMBA AI
What it does:

Trained on 450+ factories across 30 countries

Identifies recurring downtime patterns

Correlates losses with shifts, changeovers, machine age

Generates predictive alerts

How it works:

Establishes equipment health baseline

Identifies failure precursors (48-72 hours before failure)

Real-time monitoring and alerting

Continuous model improvement

Results:

Automotive stamping: Reduced unplanned stops from 2-3/quarter to 2/year

OEE improvement of 8%

11.2 TRACTIAN - Auto Diagnosis AI
What it does:

Trained on 3.5B+ vibration samples

Detects bearing wear, misalignment, cavitation, lubrication issues

Provides severity ratings and prescriptive repair procedures

Patented technology (USPTO patent August 2022)

Unique features:

32kHz data acquisition

Industrial GenAI copilot (query manuals, SOPs)

Named Forbes Top 50 AI Company

11.3 Tulip - Factory Playback
What it does:

Reconstructs and replays factory operations

Uses NVIDIA AI for video search and summarization

Synchronizes video with operational events

Announced: March 2026

11.4 FP Analyzer AI Roadmap
AI Feature	Status	Target Completion
Auto-grouping (same issue different names)	❌ To build	P1 (4 weeks)
Similar issue suggestion	❌ To build	P1 (3 weeks)
Anomaly detection (unusual patterns)	❌ To build	P2 (6 weeks)
Root cause recommendation	❌ To build	P2 (8 weeks)
Predictive maintenance alerts	❌ To build	P2 (12 weeks)
FP Analyzer Advantage: Offer 70-80% of AI capabilities at 10-20% of competitor price.

12. European Market Analysis
12.1 Market Size by Country
Country	Market Position	Why Important
Germany	Largest market	High density of SMEs ("Mittelstand")
UK	Fastest-growing	English-speaking, early adopters
France	Major market	Strong manufacturing base
Italy	Significant market	Automotive & machinery
Sweden	Home base	Start here, build reference cases
12.2 Target Segments
Segment	Opportunity	FP Analyzer Fit
Wood/Furniture	High	Already have one customer
Metal fabrication	High	Gnosjö region, Sweden
Automotive suppliers	Medium	Requires certifications
General manufacturing	High	Broadest segment
12.3 Go-To-Market Strategy
flowchart TD
    subgraph PHASE1["Phase 1 (Months 0-6)"]
        A1[Sweden]
        A2[Build 5-10 reference customers]
        A3[Perfect product with feedback]
    end
    
    subgraph PHASE2["Phase 2 (Months 6-12)"]
        B1[Norway, Denmark, Finland]
        B2[Local partners]
        B3[Translate to local languages]
    end
    
    subgraph PHASE3["Phase 3 (Months 12-24)"]
        C1[Germany]
        C2[UK, France, Italy]
        C3[Reseller network]
    end
    
    PHASE1 --> PHASE2 --> PHASE3
13. What We Need to Build - Complete Development List
13.1 Priority 0 (P0) - MUST HAVE for Launch (10 days)
#	Feature	Description	Time
1	Shift Logbook Database	Create shift_log_issues table	0.5 day
2	Shift Logbook API	POST /api/issues, GET /api/shift-logbook	1 day
3	Shift Logbook Frontend	Table with search, filters, pagination	1.5 days
4	Shift Logbook Export	Export to Excel/CSV	0.5 day
5	Bottleneck API	Calculate top issues by downtime	1 day
6	Bottleneck Frontend	RED card for #1, bar chart	1 day
7	Issue Grouping Tables	issue_groups, issue_group_members	0.5 day
8	Issue Grouping API	CRUD for groups	1 day
9	Issue Grouping Frontend	Admin UI to group issues	1.5 days
10	Update Bottleneck	Use groups for calculation	0.5 day
13.2 Priority 1 (P1) - SHOULD HAVE for Beta (16 days)
#	Feature	Description	Time
11	AI Auto-grouping - Embeddings	sentence-transformers integration	2 days
12	AI Auto-grouping - Similarity	Compare new issue with existing	1.5 days
13	AI Similar Issue Suggestion	Suggest while typing	1.5 days
14	Maintenance Tables	Add assigned_to, status, resolution	0.5 day
15	Maintenance API	Assign and update status	1 day
16	Maintenance Dashboard	View assigned issues	1.5 days
17	Multi-plant Tables	plants table, add plant_id	1 day
18	Plant Management API	CRUD for plants	1 day
19	Plant Management Frontend	Add/edit/delete plants	1 day
20	Company Admin Dashboard	Multi-plant overview	2 days
21	AI Anomaly Detection	Detect unusual stop patterns	2 days
22	SOP Compliance Tracking	Track who viewed/completed SOP	1.5 days
13.3 Priority 2 (P2) - NICE TO HAVE for V2 (30 days)
#	Feature	Description	Time
23	Super Admin Dashboard	All companies overview	1.5 days
24	Company Management	Add/edit/delete companies	2 days
25	AI Root Cause	Suggest probable causes	3 days
26	AI Predictive Alerts	Predict failures	4 days
27	WebSocket Updates	Real-time push notifications	2 days
28	Mobile App	React Native for operators	10 days
29	OEE Calculation	Availability × Performance × Quality	2 days
30	Shift Comparison	Compare morning vs evening	1.5 days
31	Audit Logs	Track all actions	1.5 days
32	Billing Management	Plans, invoicing	3 days
13.4 Total Development Time
Phase	Focus	Days
P0	Launch essentials	10 days
P1	Beta features	16 days
P2	V2 features	30 days
Total	Complete	~56 days
14. Hardware Options - Raspberry Pi vs Industrial Gateways
14.1 What We Currently Use
Raspberry Pi (Development and small deployments)

Pros:

Low cost (~$50-100)

Easy to prototype

Large community support

GPIO pins for sensors

Cons:

Not industrial grade

SD card failure risk

Temperature range limited (0-50°C)

No certification (CE, FCC)

14.2 Industrial Alternatives
Device	Price	Temp Range	Certifications	When to Use
PLECO E5 (Industrial Pi)	~$200-270	-20°C to +60°C	CE, FCC	5-20 customers
Robustel EG5120	~$400-500	-40°C to +70°C	CE, FCC, AT&T	Enterprise customers
InHand IG502	~$350-450	-20°C to +70°C	CE, FCC	Mid-market
Raspberry Pi (current)	~$50-100	0-50°C	None	Prototyping, small scale
14.3 Recommendation Phased Approach
Phase	Hardware	Why
Now (0-10 customers)	Raspberry Pi	Cost-effective, good enough
Growth (10-50 customers)	PLECO E5	Industrial grade, same code
Scale (50+ customers)	Robustel EG5120	Enterprise ready, certifications
14.4 Sensors to Use
Sensor	Purpose	Cost	Connection
Shelly Pro EM + CT clamp	Machine running/stopped	€80-120	WiFi/MQTT
Shelly Plus 1PM	ON/OFF detection	€25-40	WiFi/MQTT
DS18B20	Temperature monitoring	€20-30	1-Wire
ESP32 + ADXL345	Vibration monitoring	€20-40	WiFi/MQTT
15. Database Schema - Complete
15.1 Core Tables
sql
-- Companies
CREATE TABLE companies (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    contact_email VARCHAR(255),
    subscription_plan VARCHAR(50) DEFAULT 'professional',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Plants
CREATE TABLE plants (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment
CREATE TABLE equipment (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    parent_id UUID REFERENCES equipment(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'machine',
    status VARCHAR(20) DEFAULT 'offline',
    created_at TIMESTAMP DEFAULT NOW()
);
15.2 Shift Logbook (P0 - New)
sql
-- Shift Logbook Issues
CREATE TABLE shift_log_issues (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    equipment_id UUID REFERENCES equipment(id),
    user_id UUID REFERENCES users(id),
    shift VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 0,
    quantity_lost INTEGER DEFAULT 0,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'open',
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    reported_at TIMESTAMP DEFAULT NOW()
);

-- Issue Groups
CREATE TABLE issue_groups (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    group_name VARCHAR(255) NOT NULL,
    root_cause TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Issue Group Members
CREATE TABLE issue_group_members (
    id UUID PRIMARY KEY,
    group_id UUID REFERENCES issue_groups(id),
    issue_type VARCHAR(100) NOT NULL,
    equipment_id UUID REFERENCES equipment(id)
);
15.3 Production & Quality
sql
-- Production Data
CREATE TABLE production_data (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    equipment_id UUID REFERENCES equipment(id),
    user_id UUID REFERENCES users(id),
    shift VARCHAR(20),
    work_hours DECIMAL(5,2),
    good_quantity INTEGER,
    planned_quantity INTEGER,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Scrap Data
CREATE TABLE scrap_data (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    equipment_id UUID REFERENCES equipment(id),
    user_id UUID REFERENCES users(id),
    shift VARCHAR(20),
    scrap_reason_type VARCHAR(50),
    scrap_reason VARCHAR(100),
    quantity INTEGER,
    photo_url TEXT,
    recorded_at TIMESTAMP DEFAULT NOW()
);
15.4 Configuration
sql
-- Stop Reasons
CREATE TABLE stop_reasons_config (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    reason_type VARCHAR(50) NOT NULL,
    reason_name VARCHAR(100) NOT NULL,
    equipment_id UUID REFERENCES equipment(id),
    sort_order INTEGER DEFAULT 0
);

-- SOP Programmes
CREATE TABLE programmes (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    plant_id UUID REFERENCES plants(id),
    equipment_id UUID REFERENCES equipment(id),
    file_name VARCHAR(255),
    file_path TEXT,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP DEFAULT NOW()
);
15.5 System Tables (Super Admin)
sql
-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
16. API Endpoints - Complete List
16.1 Authentication
Method	Endpoint	Description
POST	/api/auth/login	User login
POST	/api/auth/logout	User logout
GET	/api/auth/me	Get current user
16.2 Shift Logbook (P0)
Method	Endpoint	Description
GET	/api/shift-logbook	Get issues with search/filter
GET	/api/shift-logbook/export	Export to Excel
POST	/api/issues	Create issue
PUT	/api/issues/:id/assign	Assign to maintenance
PUT	/api/issues/:id/status	Update status
16.3 Bottleneck (P0)
Method	Endpoint	Description
GET	/api/bottlenecks	Get top issues by downtime
16.4 Issue Grouping (P0)
Method	Endpoint	Description
GET	/api/issue-groups	Get all groups
POST	/api/issue-groups	Create group
POST	/api/issue-groups/:id/members	Add to group
16.5 Production & Quality
Method	Endpoint	Description
POST	/api/production	Record production
POST	/api/scrap	Record scrap
POST	/api/stops	Record stop
16.6 AI Features (P1-P2)
Method	Endpoint	Description
POST	/api/ai/similar-issues	Suggest similar issues
POST	/api/ai/auto-group	Auto-grouping suggestion
GET	/api/ai/anomalies	Get anomaly detection
16.7 Admin
Method	Endpoint	Description
GET	/api/equipment	Get all equipment
POST	/api/equipment	Add equipment
GET	/api/users	Get all users
POST	/api/users	Add user
16.8 Super Admin
Method	Endpoint	Description
GET	/api/admin/companies	Get all companies
POST	/api/admin/companies	Add company
GET	/api/admin/audit-logs	Get audit logs
GET	/api/admin/system-health	System health
17. Development Timeline & Priority
17.1 10-Day Sprint Plan (P0 Features)
Day	Tasks	Deliverable
1	Create shift_log_issues table, POST /api/issues	Database ready
2	GET /api/shift-logbook with search/filter	API ready
3-4	Shift logbook frontend (table, search, filters)	Page ready
4-5	Export to Excel	Export working
5-6	Bottleneck API (calculate top issues)	API ready
6-7	Bottleneck frontend (RED card, bar chart)	Dashboard ready
7-8	Issue grouping tables + API	Grouping backend ready
8-9	Issue grouping frontend	Grouping UI ready
9-10	Testing, integration, deploy	Launch ready
17.2 Complete Timeline
gantt
    title FP Analyzer Development Timeline
    dateFormat YYYY-MM-DD
    
    section P0 Features (10 days)
    Shift Logbook DB & API     :a1, 2026-07-01, 2d
    Shift Logbook Frontend     :a2, after a1, 2d
    Bottleneck API & Frontend  :a3, after a2, 2d
    Issue Grouping API & UI    :a4, after a3, 3d
    Testing & Deployment       :a5, after a4, 1d
    
    section P1 Features (16 days)
    AI Auto-grouping           :b1, after a5, 4d
    Maintenance Workflow       :b2, after b1, 3d
    Multi-plant Support        :b3, after b2, 3d
    Company Admin Dashboard    :b4, after b3, 3d
    AI Anomaly Detection       :b5, after b4, 3d
    
    section P2 Features (30 days)
    Super Admin                :c1, after b5, 4d
    AI Predictive              :c2, after c1, 4d
    Mobile App                 :c3, after c2, 10d
    WebSocket & OEE            :c4, after c3, 4d
    Audit & Billing            :c5, after c4, 4d
    Final Testing              :c6, after c5, 4d
18. Technology Stack
18.1 Current Stack
Layer	Technology	Version	Purpose
Frontend	Next.js	14+	React framework
Backend	Express.js	4.x	Node.js API
Database	PostgreSQL	15+	Primary database
Authentication	JWT + bcrypt	Latest	User auth
Real-time	Socket.io	4.x	WebSocket
MQTT	Mosquitto	Latest	Sensor data
Container	Docker	Latest	Deployment
Cloud	AWS Lightsail	-	Hosting
18.2 AI Stack
Component	Technology	Why
Text Embeddings	sentence-transformers (all-MiniLM-L6-v2)	Free, local, good accuracy
Vector DB	Chroma	Lightweight, easy
Similarity	Cosine similarity	Simple, effective
Anomaly Detection	Isolation Forest	Unsupervised, works well
Time Series (future)	Prophet	Facebook's library
18.3 Frontend Libraries
Component	Library	Purpose
Styling	Tailwind CSS	Utility-first CSS
Charts	Recharts	Simple, React-native
Tables	React Table	Powerful, flexible
Forms	React Hook Form	Performance
Date Pickers	react-datepicker	Date range selection
19. Go-To-Market Strategy
19.1 Geographic Rollout
flowchart LR
    SW[Sweden<br/>Months 0-6] --> NO[Norway, Denmark, Finland<br/>Months 6-12]
    NO --> DE[Germany<br/>Months 12-18]
    DE --> UK[UK, France, Italy<br/>Months 18-24]
19.2 Pricing Strategy
Plan	Price (€/month)	Price (€/year)	Includes
Starter	€299	€2,990	1-3 machines
Professional	€599	€5,990	4-10 machines
Business	€999	€9,990	11-20 machines
Enterprise	Custom	Custom	20+ machines
19.3 Competitive Pricing Comparison
Feature	FP Analyzer	TeepTrak	TRACTIAN
Annual price (5 lines)	€6,000-10,000	€160,000	€160-200,000
Setup time	1 day	48 hours	2-3 weeks
IT required	No	No	Yes
AI features	Planned	JEMBA AI	Auto Diagnosis
20. FAQs - All Questions Asked
20.1 What is FP Analyzer?
A: FP Analyzer is a manufacturing analytics platform that tracks machine performance, identifies production bottlenecks visually, logs all issues in a searchable shift logbook, and groups similar issues reported with different names.

20.2 What problem does it solve?
A: Factories don't know why machines stop, same issues get reported with different names, old issues can't be found, and supervisors don't know what the biggest problem is. FP Analyzer solves all of these.

20.3 Who is the target customer?
A: Small and medium manufacturing enterprises (SMEs) in Europe with 10-200 employees who cannot afford expensive solutions like TeepTrak (€160k/year).

20.4 How is it different from competitors?
A: FP Analyzer is 10-20x cheaper (€5-10k/year vs €160k+/year), sets up in 1 day (vs weeks), and requires no IT team. It focuses on visual simplicity - showing the #1 bottleneck in a big red box.

20.5 What hardware is needed?
A: Optional. Basic version uses manual entry via tablet/phone. For automatic detection, use Raspberry Pi (~$50) with Shelly current sensors (~$80) per machine.

20.6 Does it require PLC access?
A: No. FP Analyzer uses non-intrusive current sensors that clamp onto power cables. No machine modification needed.

20.7 What are the user roles?
A: 5 roles: Operator (machine only), Supervisor (plant view), Plant Admin (configure plant), Company Admin (all plants), Super Admin (all companies).

20.8 What is a shift logbook?
A: A searchable database of all issues reported by shift. Supervisors can search by keyword, date, shift, machine, or operator to find any past issue.

20.9 What is issue grouping?
A: When different operators report the same problem with different names ("belt issue", "belt slipping", "belt loose"), issue grouping connects them as ONE problem - "belt tension issue".

20.10 Does FP Analyzer have AI?
A: Planned. P1 features include AI auto-grouping (automatic connection of similar issues), anomaly detection, and similar issue suggestions. P2 includes predictive maintenance.

20.11 What is the current status?
A: Old version (Laravel) is live with 1 customer. New version (Next.js) is under development. P0 features (shift logbook, bottleneck dashboard, issue grouping) are the next priority.

20.12 When will new features be ready?
A: P0 features in 2 weeks, P1 features in 6 weeks, P2 features in 12 weeks.

20.13 What technology stack is used?
A: Next.js (frontend), Express.js (backend), PostgreSQL (database), Docker (deployment), Raspberry Pi (optional edge device).

20.14 How much does it cost?
A: €299-999 per month depending on number of machines. Significantly cheaper than competitors (€160k+/year).

20.15 How long to set up?
A: 1 day for software setup. If using sensors, add 1-2 days for installation.

20.16 Can it work for assembly lines (not just machines)?
A: Yes. SOP module provides work instructions, compliance tracking, and deviation reporting for human operators.

20.17 What is the European market size?
A: €5.64 billion in 2024, growing to €9.02 billion by 2035 (4.37% CAGR).

20.18 Who are the main competitors?
A: TeepTrak (France, €160k/year), TRACTIAN (US, €160-200k/year), Tulip (US, €270-410k/year), Evocon (Estonia, ~€10k/year).

20.19 Why should a customer choose FP Analyzer?
A: Affordable price (10-20x cheaper), simple setup (1 day), visual dashboard (RED box for #1 issue), searchable shift logbook, AI auto-grouping, and European-based support.

20.20 What is the development roadmap?
A: P0 (2 weeks): shift logbook, bottleneck dashboard, issue grouping. P1 (6 weeks): AI auto-grouping, maintenance workflow, multi-plant. P2 (12 weeks): super admin, predictive AI, mobile app.

Appendix
A. Glossary of Terms
Term	Definition
OEE	Overall Equipment Effectiveness - measures machine performance
Bottleneck	The single biggest problem limiting production
Shift Logbook	Searchable database of all issues by shift
Issue Grouping	Connecting same problems reported with different names
SOP	Standard Operating Procedure - work instructions
MQTT	Lightweight protocol for sensor data
Edge Device	Raspberry Pi or gateway that collects sensor data
Multi-tenant	Single system serving multiple companies
B. Key Acronyms
Acronym	Full Form
P0	Priority 0 - Must have
P1	Priority 1 - Should have
P2	Priority 2 - Nice to have
MVP	Minimum Viable Product
SME	Small and Medium Enterprise
OEE	Overall Equipment Effectiveness
SOP	Standard Operating Procedure
API	Application Programming Interface
UI	User Interface
AI	Artificial Intelligence
C. Document Version History
Version	Date	Changes
1.0	June 2026	Initial complete document
End of Master Document

This document contains everything discussed from first principles to final strategy. Use it as the single source of truth for FP Analyzer. 🚀

