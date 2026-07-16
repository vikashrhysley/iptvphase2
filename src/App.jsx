import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import 'bootstrap/dist/css/bootstrap.min.css';
import store from './store';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { checkTokenStatus } from './store/slices/authSlice';
import LoginForm from './components/Auth/LoginForm';
import AppLayout from './pages/AppLayout';
import './App.css';
import './styles/global.css';
import { Toaster } from "react-hot-toast";


function AppRoot() {
  const dispatch = useDispatch();
  const { step, tokenChecked } = useSelector(s => s.auth);
  useEffect(() => {
    dispatch(checkTokenStatus());
  }, []);
  if (!tokenChecked) {
    return (
      <div className="app-boot-screen">
        <div className="app-boot-spinner" />
      </div>
    );
  }
  return step === 4 ? <AppLayout /> : <LoginForm />;
}



function AppContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";


  return (
    <>
      <AppRoot />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: isDark ? "#1f2937" : "#ffffff",
            color: isDark ? "#ffffff" : "#111827",
            border: isDark
              ? "1px solid #374151"
              : "1px solid #e5e7eb",
          },
          success: {
            iconTheme: {
              primary: isDark ? "#22c55e" : "#16a34a",
              secondary: isDark ? "#1f2937" : "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: isDark ? "#1f2937" : "#ffffff",
            },
          },

        }}
      />

    </>
  );
}



export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Provider>
  );
}