import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

const root=document.getElementById('root')!;
const app=<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>;
if(root.dataset.ssr==='true')ReactDOM.hydrateRoot(root,app);else ReactDOM.createRoot(root).render(app);
