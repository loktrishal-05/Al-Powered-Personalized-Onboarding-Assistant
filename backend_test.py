#!/usr/bin/env python3
"""
Backend API Testing for AI-Powered Onboarding Assistant
Tests all endpoints with proper authentication and data validation
"""

import requests
import sys
import json
from datetime import datetime

class OnboardingAPITester:
    def __init__(self, base_url="https://people-ramp.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}  # Store tokens for different users
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def test_api_call(self, method, endpoint, expected_status, data=None, token=None, description=""):
        """Make API call and validate response"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            else:
                return False, f"Unsupported method: {method}"

            success = response.status_code == expected_status
            if success:
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                return False, f"Expected {expected_status}, got {response.status_code}: {response.text[:200]}"

        except Exception as e:
            return False, f"Request failed: {str(e)}"

    def test_seed_data(self):
        """Test data seeding"""
        print("\n🌱 Testing Data Seeding...")
        success, result = self.test_api_call('POST', 'seed', 200, description="Seed demo data")
        self.log_test("Seed demo data", success, result if not success else "")
        return success

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication...")
        
        # Test login for each demo user
        test_users = [
            ("priya@example.com", "demo123", "employee"),
            ("marcus@example.com", "demo123", "employee"), 
            ("admin@example.com", "demo123", "hr_admin")
        ]
        
        for email, password, expected_role in test_users:
            success, result = self.test_api_call('POST', 'auth/login', 200, 
                                               {"email": email, "password": password})
            if success:
                self.tokens[email] = result.get('token')
                role_match = result.get('role') == expected_role
                self.log_test(f"Login {email} ({expected_role})", 
                            success and role_match, 
                            f"Role mismatch: got {result.get('role')}" if not role_match else "")
            else:
                self.log_test(f"Login {email}", False, result)

        # Test /auth/me for authenticated user
        if self.tokens.get("priya@example.com"):
            success, result = self.test_api_call('GET', 'auth/me', 200, 
                                               token=self.tokens["priya@example.com"])
            self.log_test("Get current user info", success, result if not success else "")

    def test_employee_endpoints(self):
        """Test employee-related endpoints"""
        print("\n👥 Testing Employee Endpoints...")
        
        admin_token = self.tokens.get("admin@example.com")
        priya_token = self.tokens.get("priya@example.com")
        
        if admin_token:
            # Test list employees (HR admin only)
            success, result = self.test_api_call('GET', 'employees', 200, token=admin_token)
            self.log_test("List employees (HR admin)", success, result if not success else "")
            
            # Test get specific employee
            success, result = self.test_api_call('GET', 'employees/emp_priya', 200, token=admin_token)
            self.log_test("Get employee details (HR admin)", success, result if not success else "")
        
        if priya_token:
            # Test employee accessing own data
            success, result = self.test_api_call('GET', 'employees/emp_priya', 200, token=priya_token)
            self.log_test("Employee access own data", success, result if not success else "")

    def test_plan_and_milestones(self):
        """Test onboarding plans and milestones"""
        print("\n📋 Testing Plans & Milestones...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test get plan
            success, result = self.test_api_call('GET', 'plans/emp_priya', 200, token=priya_token)
            self.log_test("Get onboarding plan", success, result if not success else "")
            
            # Test get milestones
            success, result = self.test_api_call('GET', 'milestones/emp_priya', 200, token=priya_token)
            milestones = result if success else []
            self.log_test("Get milestones", success, result if not success else "")
            
            # Test milestone toggle (if milestones exist)
            if success and milestones:
                milestone_id = milestones[0].get('milestone_id')
                if milestone_id:
                    success, result = self.test_api_call('PUT', f'milestones/{milestone_id}/toggle', 200, token=priya_token)
                    self.log_test("Toggle milestone completion", success, result if not success else "")

    def test_chat_endpoints(self):
        """Test AI chat functionality"""
        print("\n💬 Testing Chat Endpoints...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test get chat history
            success, result = self.test_api_call('GET', 'chat/emp_priya', 200, token=priya_token)
            self.log_test("Get chat history", success, result if not success else "")
            
            # Test send chat message
            success, result = self.test_api_call('POST', 'chat/emp_priya/send', 200, 
                                               {"message": "What is the leave policy?"}, token=priya_token)
            self.log_test("Send chat message", success, result if not success else "")

    def test_hr_endpoints(self):
        """Test HR dashboard endpoints"""
        print("\n🏢 Testing HR Endpoints...")
        
        admin_token = self.tokens.get("admin@example.com")
        
        if admin_token:
            # Test HR stats
            success, result = self.test_api_call('GET', 'hr/stats', 200, token=admin_token)
            self.log_test("Get HR stats", success, result if not success else "")
            
            # Test HR cohort
            success, result = self.test_api_call('GET', 'hr/cohort', 200, token=admin_token)
            self.log_test("Get HR cohort", success, result if not success else "")
            
            # Test HR override action
            override_data = {
                "employee_id": "emp_priya",
                "action": "add_note",
                "reason": "Test note from API testing",
                "note": "This is a test note added via API"
            }
            success, result = self.test_api_call('POST', 'hr/override', 200, override_data, token=admin_token)
            self.log_test("HR override action", success, result if not success else "")

    def test_lms_endpoints(self):
        """Test LMS (Learning Management System) endpoints"""
        print("\n📚 Testing LMS Endpoints...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test get LMS assignments
            success, result = self.test_api_call('GET', 'lms/emp_priya', 200, token=priya_token)
            assignments = result if success else []
            self.log_test("Get LMS assignments", success, result if not success else "")
            
            # Test complete LMS assignment (if assignments exist)
            if success and assignments:
                assignment_id = assignments[0].get('assignment_id')
                if assignment_id:
                    success, result = self.test_api_call('PUT', f'lms/{assignment_id}/complete', 200, token=priya_token)
                    self.log_test("Complete LMS assignment", success, result if not success else "")

    def test_calendar_endpoints(self):
        """Test calendar endpoints"""
        print("\n📅 Testing Calendar Endpoints...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test get calendar events
            success, result = self.test_api_call('GET', 'calendar/emp_priya', 200, token=priya_token)
            self.log_test("Get calendar events", success, result if not success else "")

    def test_nudges_endpoints(self):
        """Test nudges endpoints"""
        print("\n🔔 Testing Nudges Endpoints...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test get nudges
            success, result = self.test_api_call('GET', 'nudges/emp_priya', 200, token=priya_token)
            nudges = result if success else []
            self.log_test("Get nudges", success, result if not success else "")
            
            # Test mark nudge as read (if nudges exist)
            if success and nudges:
                nudge_id = nudges[0].get('nudge_id')
                if nudge_id:
                    success, result = self.test_api_call('PUT', f'nudges/{nudge_id}/read', 200, token=priya_token)
                    self.log_test("Mark nudge as read", success, result if not success else "")

    def test_audit_endpoints(self):
        """Test audit log endpoints"""
        print("\n📊 Testing Audit Endpoints...")
        
        admin_token = self.tokens.get("admin@example.com")
        
        if admin_token:
            # Test get audit logs (HR admin only)
            success, result = self.test_api_call('GET', 'audit', 200, token=admin_token)
            self.log_test("Get audit logs", success, result if not success else "")

    def test_kb_endpoints(self):
        """Test knowledge base endpoints"""
        print("\n📖 Testing Knowledge Base Endpoints...")
        
        priya_token = self.tokens.get("priya@example.com")
        
        if priya_token:
            # Test search KB
            success, result = self.test_api_call('GET', 'kb/search?q=security', 200, token=priya_token)
            self.log_test("Search knowledge base", success, result if not success else "")

    def test_notes_endpoints(self):
        """Test employee notes endpoints"""
        print("\n📝 Testing Notes Endpoints...")
        
        admin_token = self.tokens.get("admin@example.com")
        
        if admin_token:
            # Test get employee notes
            success, result = self.test_api_call('GET', 'notes/emp_priya', 200, token=admin_token)
            self.log_test("Get employee notes", success, result if not success else "")

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Onboarding Assistant API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test in logical order
        if not self.test_seed_data():
            print("❌ Seeding failed - stopping tests")
            return False
            
        self.test_auth_endpoints()
        
        # Only continue if we have valid tokens
        if not self.tokens:
            print("❌ No valid authentication tokens - stopping tests")
            return False
            
        self.test_employee_endpoints()
        self.test_plan_and_milestones()
        self.test_chat_endpoints()
        self.test_hr_endpoints()
        self.test_lms_endpoints()
        self.test_calendar_endpoints()
        self.test_nudges_endpoints()
        self.test_audit_endpoints()
        self.test_kb_endpoints()
        self.test_notes_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failure in self.failed_tests:
                print(f"  • {failure}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80  # Consider 80%+ as passing

def main():
    tester = OnboardingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())