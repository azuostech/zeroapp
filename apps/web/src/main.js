import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './styles/variables.css';
import './styles/app.css';
registerSW({
    onNeedRefresh() {
        console.info('Nova versão disponível');
    }
});
const client = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: client, children: _jsx(AuthProvider, { children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }) }) }));
