"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);

    // Effect for session restoration
    useEffect(() => {
        const restore = async () => {
            try {
                const { session: restoredSession } = await ProtonWebSDK({
                    linkOptions: { endpoints: ['https://proton.greymass.com'] },
                    transportOptions: { requestStatus: false },
                    selectorOptions: {
                        appName: '11dice',
                        requestAccount: '11dice',
                    },
                    restoreSession: true, // Explicitly try to restore session
                });

                if (restoredSession) {
                    setSession(restoredSession);
                }
            } catch (e) {
                console.error("Session restore failed", e);
            }
        };
        restore();
    }, []);

    const login = async () => {
        try {
            const { session: newSession } = await ProtonWebSDK({
                linkOptions: { endpoints: ['https://proton.greymass.com'] },
                transportOptions: { requestStatus: false },
                selectorOptions: {
                    appName: '11dice',
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4', // Example logo from snippet
                    requestAccount: '11dice',
                },
            });
            setSession(newSession);
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (session && typeof session.logout === 'function') {
            try {
                await session.logout();
                setSession(null);
            } catch (e) {
                console.error("Logout failed", e);
            }
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
        <WalletContext.Provider value={{ session, login, logout, transact }}>
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