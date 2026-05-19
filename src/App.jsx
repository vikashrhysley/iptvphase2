// src/App.js
import React from 'react';
import { Provider, useSelector } from 'react-redux';
import store from './store';
import { ThemeProvider } from './context/ThemeContext';
import LoginForm from './components/Auth/LoginForm';
import AppLayout from './pages/AppLayout';
import './styles/global.css';

function AppRoot() {
  const { step } = useSelector(s => s.auth);
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