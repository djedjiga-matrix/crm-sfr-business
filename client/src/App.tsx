import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import { ToastProvider } from './components/Toast';
import { ConfirmDialogProvider } from './components/ConfirmDialog';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import ContactDetails from './pages/ContactDetails';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';

import AdminUsers from './pages/AdminUsers';
import AdminCampaigns from './pages/AdminCampaigns';
import Databases from './pages/Databases';
import Calls from './pages/Calls';
import PreviewMode from './pages/PreviewMode';
import Monitoring from './pages/Monitoring';
import ExportGRH from './pages/ExportGRH';
import Layout from './layouts/Layout';
import AdminChatHistory from './pages/AdminChatHistory';
import Recordings from './pages/Recordings';
import AuditLogs from './pages/AuditLogs';
import Objectives from './pages/Objectives';
import AdminSystem from './pages/AdminSystem';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmDialogProvider>
            <ChatProvider>
              <Router>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="contacts" element={<Contacts />} />
                      <Route path="contacts/:id" element={<ContactDetails />} />
                      <Route path="calendar" element={<Calendar />} />
                      <Route path="chat" element={<Chat />} />
                      <Route path="calls" element={<Calls />} />
                      <Route path="objectives" element={<Objectives />} />
                      <Route path="admin" element={<AdminUsers />} />
                      <Route path="admin/campaigns" element={<AdminCampaigns />} />
                      <Route path="preview" element={<PreviewMode />} />
                      <Route path="admin/databases" element={<Databases />} />
                      <Route path="admin/grh" element={<ExportGRH />} />
                      <Route path="admin/chat-history" element={<AdminChatHistory />} />
                      <Route path="admin/audit" element={<AuditLogs />} />
                      <Route path="admin/system" element={<AdminSystem />} />
                      <Route path="monitoring" element={<Monitoring />} />
                      <Route path="recordings" element={<Recordings />} />
                    </Route>
                  </Route>
                </Routes>
              </Router>
            </ChatProvider>
          </ConfirmDialogProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

