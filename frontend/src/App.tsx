import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import DisplayPanel from './pages/DisplayPanel';
import DisplayPanelConfig from './pages/DisplayPanelConfig';
import EmergencySchedule from './pages/EmergencySchedule';
import MakeupSaturdays from './pages/MakeupSaturdays';
import ClassPayments from './pages/ClassPayments';
import Employees from './pages/Employees';
import EmployeeAttendance from './pages/EmployeeAttendance';
import EPIControl from './pages/EPIControl';
import SubstitutePublic from './pages/SubstitutePublic';
import EmployeePublicForm from './pages/EmployeePublicForm';
import TeacherAttendance from './pages/TeacherAttendance';
import TeacherFrequencyReport from './pages/TeacherFrequencyReport';
import AnoLetivo from './pages/AnoLetivo';
import SchoolUserLogin from './pages/SchoolUserLogin';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import SalesDashboard from './pages/SalesDashboard';
import PlansManagement from './pages/PlansManagement';
import LeadsManagement from './pages/LeadsManagement';
import SalesManagement from './pages/SalesManagement';
import SchoolsManagement from './pages/SchoolsManagement';
import AdminDashboard from './pages/AdminDashboard';
import BackupManagement from './pages/BackupManagement';
import PaymentCheckout from './pages/PaymentCheckout';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import PaymentsManagement from './pages/PaymentsManagement';
import MessagesManagement from './pages/MessagesManagement';
import InvoiceManagement from './pages/InvoiceManagement';
import SaleContract from './pages/SaleContract';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, user, isHydrated } = useAuthStore();
  
  // Aguardar rehydratação do Zustand persist
  if (!isHydrated) {
    console.log('⏳ Aguardando rehydratação do Zustand...');
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Carregando...
    </div>;
  }
  
  console.log('🔒 PrivateRoute - Token:', token ? 'EXISTS' : 'NULL');
  console.log('👤 PrivateRoute - User:', user ? user.email : 'NULL');
  
  if (!token || !user) {
    console.log('❌ Sem autenticação, redirecionando para /login');
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  
  if (!isHydrated) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Carregando...
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (user.role === 'admin' || user.role === 'super-admin') 
    ? <>{children}</> 
    : <Navigate to="/dashboard" replace />;
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { user, isHydrated } = useAuthStore();
  
  if (!isHydrated) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Carregando...
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (user.role !== 'admin' && user.role !== 'super-admin') 
    ? <>{children}</> 
    : <Navigate to="/admin-dashboard" replace />;
}

function App() {
  console.log('🎨 App component carregado!');
  console.log('🌍 Mode:', import.meta.env.MODE);
  console.log('🔗 Usando HashRouter para GitHub Pages');
  
  return (
    <ErrorBoundary>
      <HashRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/school-user-login" element={<SchoolUserLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-school" element={<SchoolRegister />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        
        {/* Payment Routes - Checkout é público para permitir pagamento antes de aprovação */}
        <Route path="/payment-checkout" element={<PaymentCheckout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/payment-pending" element={<PaymentCheckout />} />
        {/* Link público de substituto — sem auth */}
        <Route path="/substitute/:token" element={<SubstitutePublic />} />
        {/* Link público de cadastro/atualização de funcionário — sem auth */}
        <Route path="/employee-form/:token" element={<EmployeePublicForm />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ClientRoute><Dashboard /></ClientRoute>} />
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

          <Route path="emergency-schedule" element={<ClientRoute><EmergencySchedule /></ClientRoute>} />
          <Route path="makeup-saturdays" element={<ClientRoute><MakeupSaturdays /></ClientRoute>} />
          <Route path="class-payments" element={<ClientRoute><ClassPayments /></ClientRoute>} />
          <Route path="teacher-attendance" element={<ClientRoute><TeacherAttendance /></ClientRoute>} />
          <Route path="teacher-frequency-report" element={<ClientRoute><TeacherFrequencyReport /></ClientRoute>} />
          <Route path="ano-letivo" element={<ClientRoute><AnoLetivo /></ClientRoute>} />
          <Route path="display-panel-config" element={<ClientRoute><DisplayPanelConfig /></ClientRoute>} />
          <Route path="calendar" element={<ClientRoute><SchoolCalendar /></ClientRoute>} />
          <Route path="employees" element={<ClientRoute><Employees /></ClientRoute>} />
          <Route path="employee-attendance" element={<ClientRoute><EmployeeAttendance /></ClientRoute>} />
          <Route path="epi-control" element={<ClientRoute><EPIControl /></ClientRoute>} />
          <Route path="settings" element={<ClientRoute><Settings /></ClientRoute>} />
          <Route path="audit-logs" element={<ClientRoute><AuditLogs /></ClientRoute>} />
          <Route path="timetables" element={<ClientRoute><Timetables /></ClientRoute>} />
          <Route path="sale-contract" element={<ClientRoute><SaleContract /></ClientRoute>} />
          
          {/* Admin Routes */}
          <Route path="admin-dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="backup-management" element={<AdminRoute><BackupManagement /></AdminRoute>} />
          <Route path="messages" element={<AdminRoute><MessagesManagement /></AdminRoute>} />
          <Route path="sales-dashboard" element={<AdminRoute><SalesDashboard /></AdminRoute>} />
          <Route path="plans-management" element={<AdminRoute><PlansManagement /></AdminRoute>} />
          <Route path="leads-management" element={<AdminRoute><LeadsManagement /></AdminRoute>} />
          <Route path="sales-management" element={<AdminRoute><SalesManagement /></AdminRoute>} />
          <Route path="schools-management" element={<AdminRoute><SchoolsManagement /></AdminRoute>} />
          <Route path="payments-management" element={<AdminRoute><PaymentsManagement /></AdminRoute>} />
          <Route path="invoices" element={<AdminRoute><InvoiceManagement /></AdminRoute>} />
        </Route>
        
        {/* Rota pública para o painel de avisos (TV) */}
        <Route path="/display-panel" element={<DisplayPanel />} />
        <Route path="/display-panel/:scheduleId" element={<DisplayPanel />} />
      </Routes>
    </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
