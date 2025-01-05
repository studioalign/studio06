import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignupForm from './components/SignupForm';
import SigninForm from './components/SigninForm';
import DashboardLayout from './components/dashboard/DashboardLayout';
import Classes from './components/dashboard/Classes';
import StudioInfo from './components/dashboard/StudioInfo';
import Teachers from './components/dashboard/Teachers';
import Students from './components/dashboard/Students';
import MessagesLayout from './components/messages/MessagesLayout';
import Overview from './components/dashboard/Overview';
import MyStudents from './components/dashboard/MyStudents';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { MessagingProvider } from './contexts/MessagingContext';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MessagingProvider>
          <Routes>
            <Route
              path="/signup"
              element={
                <div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
                  <SignupForm />
                </div>
              }
            />
            <Route
              path="/"
              element={
                <div className="min-h-screen bg-gradient-to-br from-brand-secondary-400 to-brand-primary flex items-center justify-center p-4">
                  <SigninForm />
                </div>
              }
            />
            <Route element={<DataProvider><PrivateRoute requiredRole="owner,teacher,parent" /></DataProvider>}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Overview />} />
                <Route element={<PrivateRoute requiredRole="owner,teacher,parent" />}>
                  <Route path="classes" element={<Classes />} />
                  <Route path="messages" element={<MessagesLayout />} />
                </Route>
                <Route element={<PrivateRoute requiredRole="owner" />}>
                  <Route path="studio" element={<StudioInfo />} />
                  <Route path="teachers" element={<Teachers />} />
                  <Route path="students" element={<Students />} />
                </Route>
                <Route element={<PrivateRoute requiredRole="parent" />}>
                  <Route path="my-students" element={<MyStudents />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </MessagingProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;