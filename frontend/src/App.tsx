import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import SchoolRegister from './pages/SchoolRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Schedules from './pages/Schedules';
import ScheduleView from './pages/ScheduleView';
import Timetables from './pages/Timetables';
import TimetableGenerator from './pages/TimetableGenerator';
import Grades from './pages/Grades';
import Classes from './pages/Classes';
import ClassSubjects from './pages/ClassSubjects';
import TeacherSubjectAssociation from './pages/TeacherSubjectAssociation';
import TimeSlots from './pages/TimeSlots';
import SchoolCalendar from './pages/SchoolCalendar';
import SchoolSettings from './pages/SchoolSettings';
import NotificationSettings from './pages/NotificationSettings';
import WhatsAppSettings from './pages/WhatsAppSettings';
import DisplayPanel from './pages/DisplayPanel';
import LiveMessaging from './pages/LiveMessaging';
import EmergencySchedule from './pages/EmergencySchedule';
import MakeupSaturdays from './pages/MakeupSaturdays';
import Licenses from './pages/Licenses';
import SalesDashboard from './pages/SalesDashboard';
import PlansManagement from './pages/PlansManagement';
import LeadsManagement from './pages/LeadsManagement';
import SalesManagement from './pages/SalesManagement';
import UsersManagement from './pages/UsersManagement';
import SchoolsManagement from './pages/SchoolsManagement';
import AdminDashboard from './pages/AdminDashboard';
import BackupManagement from './pages/BackupManagement';
import PaymentCheckout from './pages/PaymentCheckout';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentsManagement from './pages/PaymentsManagement';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" />;
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user?.role !== 'admin' ? <>{children}</> : <Navigate to="/admin-dashboard" />;
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-school" element={<SchoolRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Payment Routes */}
        <Route path="/payment-checkout" element={<PrivateRoute><PaymentCheckout /></PrivateRoute>} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/payment-pending" element={<PaymentCheckout />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="teachers" element={<ClientRoute><Teachers /></ClientRoute>} />
          <Route path="subjects" element={<ClientRoute><Subjects /></ClientRoute>} />
          <Route path="teacher-subjects" element={<ClientRoute><TeacherSubjectAssociation /></ClientRoute>} />
          <Route path="grades" element={<ClientRoute><Grades /></ClientRoute>} />
          <Route path="classes" element={<ClientRoute><Classes /></ClientRoute>} />
          <Route path="class-subjects" element={<ClientRoute><ClassSubjects /></ClientRoute>} />
          <Route path="schedules" element={<ClientRoute><Schedules /></ClientRoute>} />
          <Route path="schedules/:id" element={<ClientRoute><ScheduleView /></ClientRoute>} />
          <Route path="timeslots" element={<ClientRoute><TimeSlots /></ClientRoute>} />
          <Route path="timetable-generator" element={<ClientRoute><TimetableGenerator /></ClientRoute>} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="whatsapp-settings" element={<ClientRoute><WhatsAppSettings /></ClientRoute>} />
          <Route path="live-messaging" element={<LiveMessaging />} />
          <Route path="emergency-schedule" element={<ClientRoute><EmergencySchedule /></ClientRoute>} />
          <Route path="makeup-saturdays" element={<ClientRoute><MakeupSaturdays /></ClientRoute>} />
          <Route path="calendar" element={<ClientRoute><SchoolCalendar /></ClientRoute>} />
          <Route path="settings" element={<ClientRoute><SchoolSettings /></ClientRoute>} />
          <Route path="timetables" element={<ClientRoute><Timetables /></ClientRoute>} />
          
          {/* Admin Routes */}
          <Route path="admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="backup-management" element={<AdminRoute><BackupManagement /></AdminRoute>} />
          <Route path="sales-dashboard" element={<AdminRoute><SalesDashboard /></AdminRoute>} />
          <Route path="plans-management" element={<AdminRoute><PlansManagement /></AdminRoute>} />
          <Route path="leads-management" element={<AdminRoute><LeadsManagement /></AdminRoute>} />
          <Route path="sales-management" element={<AdminRoute><SalesManagement /></AdminRoute>} />
          <Route path="users-management" element={<AdminRoute><UsersManagement /></AdminRoute>} />
          <Route path="license-management" element={<AdminRoute><Licenses /></AdminRoute>} />
          <Route path="schools-management" element={<AdminRoute><SchoolsManagement /></AdminRoute>} />
          <Route path="payments-management" element={<AdminRoute><PaymentsManagement /></AdminRoute>} />
        </Route>
        
        {/* Rota pública para o painel de avisos (TV) */}
        <Route path="/display-panel" element={<DisplayPanel />} />
        <Route path="/display-panel/:scheduleId" element={<DisplayPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
