"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import WebAuth, { Session } from '@proton/web-sdk';

// Define the shape of our session context
interface WalletContextType {
    session: Session | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    transact: (actions: any[]) => Promise<any>;
}

// Create the context with a default null value
const WalletContext = createContext<WalletContextType | null>(null);

// Define the props for our provider component
interface WalletProviderProps {
    children: ReactNode;
}

// The provider component that will wrap our app
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [auth, setAuth] = useState<WebAuth | null>(null);

    useEffect(() => {
        // Initialize WebAuth
        const appName = '11dice';
        // IMPORTANT: Replace with your contract account name
        const requestAccount = '11dice'; 
        const auth = new WebAuth({ appName, requestAccount, chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace43922A9D974E' }); // Proton Mainnet
        setAuth(auth);

        // Restore session
        const restoreSession = async () => {
            try {
                const restored = await auth.restoreSession();
                if (restored) {
                    setSession(restored as Session);
                }
            } catch (e) {
                console.error("Session restore failed", e);
            }
        };
        restoreSession();
    }, []);

    const login = async () => {
        if (!auth) return;
        try {
            const newSession = await auth.login();
            setSession(newSession as Session);
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

    const transact = async (actions: any[]) => {
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
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};