"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    auth: null, // Keep auth for login/logout
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [auth, setAuth] = useState(null);

    // Effect for WebAuth initialization
    useEffect(() => {
        const initWebAuth = async () => {
            try {
                const WebAuthModule = await import('@proton/web-sdk');
                const WebAuth = WebAuthModule.default || WebAuthModule; 
                const appName = '11dice';
                const requestAccount = '11dice'; 
                const newAuth = new WebAuth({ appName, requestAccount, chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace43922A9D974E' });
                setAuth(newAuth);
            } catch (e) {
                console.error("WebAuth initialization failed", e);
            }
        };
        initWebAuth();
    }, []);

    // Effect for session restoration from localStorage
    useEffect(() => {
        if (auth) { // Only try to restore if WebAuth is initialized
            const savedSession = localStorage.getItem('proton-session');
            if (savedSession) {
                try {
                    const parsedSession = JSON.parse(savedSession);
                    // It's better to use auth.restoreSession() if possible, but the user's snippet
                    // directly uses the parsed session. Let's follow the snippet for now.
                    setSession(parsedSession);
                } catch (e) {
                    console.error('Could not parse saved session:', e);
                    localStorage.removeItem('proton-session');
                }
            }
        }
    }, [auth]); // Rerun when auth object is available

    const login = async () => {
        if (!auth) { console.error("Auth not initialized yet"); return; }
        try {
            const newSession = await auth.login();
            setSession(newSession);
            localStorage.setItem('proton-session', JSON.stringify(newSession)); // Persist
        } catch (e) { console.error("Login failed", e); }
    };

    const logout = async () => {
        if (auth && session) { // Use auth to logout
            try {
                await auth.logout(); // Use auth.logout()
                localStorage.removeItem('proton-session'); // Clear persistence
                setSession(null);
            } catch (e) { console.error("Logout failed", e); }
        }
    };

    const transact = async (actions) => {
        if (!session) {
            throw new Error("Cannot transact without a session");
        }
        try {
            // The session object itself has the transact method
            const result = await session.transact({ actions });
            return result;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        }
    };

    return (
        <WalletContext.Provider value={{ session, auth, login, logout, transact }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
