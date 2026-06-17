import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { store } from './store/store';
import { connectAuthToHttp } from './store/auth-bridge';
import { installGlobalErrorHandlers } from './services/error-reporter';

// Wire Redux auth state into the axios token seam (token sync + 401 -> logout).
connectAuthToHttp();

// Capture uncaught errors + unhandled promise rejections (testing build only).
installGlobalErrorHandlers();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
