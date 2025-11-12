"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context with a default shape
const WalletContext = createContext({
    session: null,
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => {}
});

// The provider component that will wrap our app
export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                // Dynamically import and extract the default export which is the WebAuth class
                const { default: WebAuth } = await import('@proton/web-sdk');
                
                const appName = '11dice';
                const requestAccount = '11dice'; 
                const newAuth = new WebAuth({ appName, requestAccount, chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace43922A9D974E' }); // Proton Mainnet
                setAuth(newAuth);

                // Restore session
                const restored = await newAuth.restoreSession();
                if (restored) {
                    setSession(restored);
                }
            } catch (e) {
                console.error("Auth initialization failed", e);
            }
        };
        
        initAuth();
    }, []);

    const login = async () => {
        if (!auth) {
            console.error("Auth not initialized yet");
            return;
        }
        try {
            const newSession = await auth.login();
            setSession(newSession);
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (!auth || !session) return;
        try {
            await auth.logout();
            setSession(null);
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const transact = async (actions) => {
        if (!session) {
            throw new Error("Cannot transact without a session");
        }
        try {
            const result = await session.transact({ actions });
            return result;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        }
    };

    return (
        <WalletContext.Provider value={{ session, login, logout, transact }}>
            {children}
        </WalletContext.Provider>
    );
};

// Custom hook to use the wallet context
export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        // This error is now unlikely to happen due to the default context value,
        // but it's good practice to keep it for cases where the provider is accidentally removed.
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
