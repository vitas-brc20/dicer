"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    link: null, // Add link to context
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [link, setLink] = useState(null); // Add link to state

    // Effect for session restoration
    useEffect(() => {
        const restore = async () => {
            try {
                const { session: restoredSession, link: restoredLink } = await ProtonWebSDK({ // Destructure link
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
                    setLink(restoredLink); // Set link
                    console.log("Restored session:", restoredSession); // Debug log
                }
            } catch (e) {
                console.error("Session restore failed", e);
            }
        };
        restore();
    }, []);

    const login = async () => {
        try {
            const { session: newSession, link: newLink } = await ProtonWebSDK({ // Destructure link
                linkOptions: { endpoints: ['https://proton.greymass.com'] },
                transportOptions: { requestStatus: false },
                selectorOptions: {
                    appName: '11dice',
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4', // Example logo from snippet
                    requestAccount: '11dice',
                },
            });
            setSession(newSession);
            setLink(newLink); // Set link
            console.log("New session after login:", newSession); // Debug log
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) { // Check for link
            try {
                await link.removeSession('11dice', session.auth, session.chainId); // Use link.removeSession
                setSession(null);
                setLink(null); // Clear link
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
        <WalletContext.Provider value={{ session, link, login, logout, transact }}> {/* Include link in provider value */}
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