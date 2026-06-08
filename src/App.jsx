// src/App.js
import React, { useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store';
import { ThemeProvider } from './context/ThemeContext';
import { checkTokenStatus } from './store/slices/authSlice';
import LoginForm from './components/Auth/LoginForm';
import AppLayout from './pages/AppLayout';
import './App.css';
import './styles/global.css';

function AppRoot() {
  const dispatch = useDispatch();
  const { step, tokenChecked } = useSelector(s => s.auth);

  useEffect(() => {
    dispatch(checkTokenStatus());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!tokenChecked) {
    return (
      <div className="app-boot-screen">
        <div className="app-boot-spinner" />
      </div>
    );
  }

  return step === 4 ? <AppLayout /> : <LoginForm />;
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppRoot />
      </ThemeProvider>
    </Provider>
  );
}
