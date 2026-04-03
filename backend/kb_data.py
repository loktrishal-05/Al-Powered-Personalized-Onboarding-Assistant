KB_DOCUMENTS = [
    {
        "title": "Day 1 Setup & Logistics Guide",
        "category": "day1_setup",
        "content": """Day 1 Setup & Logistics:
1. Laptop & Equipment: Your laptop will be shipped to your address (remote) or available at your desk (on-site) before your start date. Contact IT Help Desk at it-help@company.com if not received.
2. Badge & Building Access: On-site employees receive their badge at reception on Day 1. Remote employees receive a virtual badge via email.
3. VPN Setup: Download GlobalProtect VPN from https://vpn.company.com. Use your corporate email credentials. Guide: https://wiki.company.com/vpn-setup
4. Email & Teams: Your corporate email (firstname.lastname@company.com) is auto-provisioned. Microsoft Teams is pre-installed on your laptop. Join the #new-hires channel.
5. First Day Schedule: 9:00 AM - Welcome call with HR, 10:00 AM - Manager intro, 11:00 AM - IT setup assistance, 2:00 PM - Buddy connect.""",
        "source_url": "https://wiki.company.com/day1-setup"
    },
    {
        "title": "Access & Tools Enablement Policy",
        "category": "access_tools",
        "content": """Access & Tools Enablement:
1. Repository Access: Engineering team members get GitHub Enterprise access within 24 hours. Request via ServiceNow ticket category 'Repo Access'. Manager approval required.
2. Cloud Subscriptions: AWS/GCP access provisioned based on team. Submit cloud-access form at https://access.company.com/cloud.
3. CRM Access: Sales and Marketing teams get Salesforce access. Training module must be completed before access is granted.
4. BI Tools: Tableau/Looker access requires manager approval + data governance training completion.
5. Shared Drives: Google Drive shared folders are auto-provisioned based on department. Additional access via https://access.company.com/drives.
6. SLA: Standard access requests are fulfilled within 24 hours. Escalation after 48 hours to IT Manager.""",
        "source_url": "https://wiki.company.com/access-policy"
    },
    {
        "title": "Security Awareness & Compliance Training",
        "category": "policy_compliance",
        "content": """Security & Compliance Policy (Per Employee Handbook Section 3.2):
1. Security Awareness Training: MANDATORY for all employees. Must be completed within first 7 days. Available at https://lms.company.com/security-101.
2. Privacy & Data Protection: GDPR and data handling training required within 14 days. Covers PII handling, data classification, and breach reporting.
3. Code of Conduct: Annual acknowledgment required. Review at https://wiki.company.com/code-of-conduct. Zero tolerance for violations.
4. Travel Policy: Pre-approval required for all business travel. Submit via Concur. Per diem rates at https://wiki.company.com/travel-policy.
5. Clean Desk Policy: All sensitive documents must be locked away when not in use. Screen lock required when away from desk.
6. Incident Reporting: Report security incidents immediately to security@company.com or call the 24/7 hotline.""",
        "source_url": "https://wiki.company.com/security-compliance"
    },
    {
        "title": "Privacy & Data Protection Guidelines",
        "category": "policy_compliance",
        "content": """Privacy & Data Protection (Per Employee Handbook Section 4.1):
1. Data Classification: All company data is classified as Public, Internal, Confidential, or Restricted.
2. PII Handling: Personal Identifiable Information must be encrypted at rest and in transit. Never share PII via email without encryption.
3. Data Retention: Customer data retained for 7 years. Employee data retained for duration of employment + 3 years. Chat logs retained for 90 days.
4. GDPR Rights: Employees can request access to their personal data, correction, or deletion via privacy@company.com.
5. Data Breach: Any suspected breach must be reported within 1 hour to the DPO at dpo@company.com.
6. Third-party Sharing: No customer or employee data shared with third parties without legal review.""",
        "source_url": "https://wiki.company.com/privacy-policy"
    },
    {
        "title": "Engineering SDLC & Development Practices",
        "category": "role_enablement",
        "content": """Engineering Role Enablement - SDLC Guide:
1. Development Workflow: We follow Agile/Scrum with 2-week sprints. Sprint planning on Monday, retrospective on Friday.
2. Git Workflow: Feature branches from 'develop'. PR requires 2 approvals. CI/CD runs on every push. Merge to 'main' triggers deployment.
3. Code Review: All PRs reviewed within 24 hours. Use conventional comments. Focus on correctness, performance, and maintainability.
4. CI/CD Pipeline: GitHub Actions for CI. ArgoCD for deployment. Staging auto-deploys from develop. Production requires release tag.
5. On-Call: Engineering teams rotate on-call weekly. PagerDuty for alerting. Runbooks at https://wiki.company.com/runbooks.
6. Architecture Docs: ADRs (Architecture Decision Records) stored in /docs/adr. New services require RFC approval.
7. First Sprint: Shadow a senior engineer for sprint 1. Take on a 'good first issue' labeled ticket.""",
        "source_url": "https://wiki.company.com/engineering-sdlc"
    },
    {
        "title": "Marketing Playbook & Campaign Lifecycle",
        "category": "role_enablement",
        "content": """Marketing Role Enablement - Campaign Playbook:
1. Brand Guidelines: All marketing materials must follow brand guide at https://brand.company.com. Logos, colors, fonts, and tone of voice defined there.
2. Campaign Lifecycle: Brief > Strategy > Creative > Review > Launch > Measure > Optimize. Use Monday.com for project tracking.
3. Marketing Automation: HubSpot for email campaigns, lead scoring, and nurture sequences. Training at https://lms.company.com/hubspot-101.
4. Content Calendar: Managed in Notion. Weekly content planning meeting every Tuesday at 10 AM.
5. Analytics: Google Analytics 4 + Looker dashboards. Monthly reporting template at https://wiki.company.com/marketing-reporting.
6. Budget: Campaign budgets approved quarterly. Ad hoc requests via finance approval form.
7. First Campaign: Shadow a campaign manager for your first week. Build your first campaign brief by end of Week 2.""",
        "source_url": "https://wiki.company.com/marketing-playbook"
    },
    {
        "title": "People & Culture - Buddy Program & ERGs",
        "category": "people_culture",
        "content": """People & Culture Guide:
1. Buddy Program: Every new hire is assigned a buddy from a different team. Your buddy helps with cultural questions, lunch recommendations, and navigating the organization.
2. Team Introductions: Your manager will schedule meet-and-greets with key stakeholders in your first 2 weeks.
3. Employee Resource Groups (ERGs): Join ERGs that interest you - Women in Tech, LGBTQ+ Alliance, Parents Network, Cultural Diversity Group. Find them at https://community.company.com/ergs.
4. Social Events: Monthly team outings, quarterly all-hands, annual offsite. Check the Events calendar in Teams.
5. Mentorship: After 90 days, you can join the mentorship program. Match with a senior leader for career development.
6. Feedback Culture: We do continuous feedback. Use Lattice for 1:1 notes, goals, and performance reviews.""",
        "source_url": "https://wiki.company.com/people-culture"
    },
    {
        "title": "First Deliverables Guide",
        "category": "first_deliverables",
        "content": """First Deliverables Expectations:
1. Engineering: Complete your first 'good first issue' by end of Week 2. Participate in code review by Week 3. Own a small component by Day 45.
2. Marketing: Complete first campaign brief by end of Week 2. Run pilot campaign with analytics by Day 45. Own quarterly campaign plan by Day 75.
3. Sales: Complete CRM training and shadow 5 calls by end of Week 2. First independent pitch by Day 30. Own territory by Day 60.
4. General: All roles should have their 30-60-90 review meetings scheduled. Self-assessment at Day 30, Manager review at Day 60, Final review at Day 90.
5. Shadowing: First 2 weeks include shadowing sessions with experienced team members. Minimum 3 shadowing sessions required.
6. Documentation: Contribute to team wiki/knowledge base by Day 60. Document at least one process or runbook.""",
        "source_url": "https://wiki.company.com/first-deliverables"
    },
    {
        "title": "Benefits, Leave & Time Off Policy",
        "category": "faq",
        "content": """Benefits & Leave FAQ (Per Employee Handbook Section 6):
1. Health Insurance: Comprehensive medical, dental, and vision coverage from Day 1. Details at https://benefits.company.com.
2. Annual Leave: 25 days PTO per year. Accrue 2.08 days per month. Request via Workday.
3. Sick Leave: 10 days per year. No documentation needed for 1-2 day absences. Doctor's note required for 3+ consecutive days.
4. Parental Leave: 16 weeks paid parental leave (birth/adoption). Apply via HR portal 30 days in advance.
5. Mental Health: Free counseling sessions (EAP). 2 mental health days per quarter. Headspace subscription included.
6. Remote Work: Hybrid policy - minimum 2 days in office per week for hybrid roles. Fully remote roles have quarterly in-person meetings.
7. Equipment: $1,500 home office stipend for remote employees. Submit receipts via Expensify.""",
        "source_url": "https://wiki.company.com/benefits-leave"
    },
    {
        "title": "Payroll, Reimbursement & Internal Portals",
        "category": "faq",
        "content": """Payroll & Reimbursement FAQ:
1. Pay Schedule: Monthly payroll, processed on the 25th. First paycheck prorated based on start date.
2. Direct Deposit: Set up via Workday > Pay > Payment Elections. Allow 1 pay cycle for changes to take effect.
3. Tax Forms: W-4 (US) or P45/P46 (UK) submitted during onboarding. Access tax documents in Workday.
4. Expense Reimbursement: Submit via Expensify within 30 days of expense. Manager approval required. Reimbursed in next pay cycle.
5. Corporate Card: Available after 90 days for roles requiring frequent expenses. Apply via Finance portal.
6. Internal Portals: Workday (HR/Pay), ServiceNow (IT tickets), Confluence (Wiki), Jira (Engineering), Monday.com (Marketing).
7. IT Help Desk: Email it-help@company.com or call ext. 5555. Response SLA: 4 hours for P1, 24 hours for P2.""",
        "source_url": "https://wiki.company.com/payroll-portals"
    }
]
