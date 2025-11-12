"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const WalletContext = createContext({
    session: null,
    auth: null, // Add auth to context for consistency, though not directly used by consumers
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const WebAuthModule = await import('@proton/web-sdk');
                // Try to get the constructor. It could be default, or default.default, or directly on the module.
                const WebAuth = WebAuthModule.default || WebAuthModule; 
                
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
            return await session.transact({ actions });
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
