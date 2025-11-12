"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import ProtonWebSDK from '@proton/web-sdk'; // Use the default import as a function

const WalletContext = createContext({
    session: null,
    link: null, // Need to store link for logout
    login: async () => {},
    logout: async () => {},
    transact: async (actions) => { throw new Error("Wallet not connected"); }
});

export const WalletProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [link, setLink] = useState(null); // Store link for logout

    // Effect for session restoration from localStorage and then live session
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const savedSession = localStorage.getItem('proton-session');
                if (savedSession) {
                    const parsedSession = JSON.parse(savedSession);
                    // Attempt to restore a live session using the parsed data
                    // The ProtonWebSDK function itself can restore a session if restoreSession: true is passed
                    const { session: restoredSession, link: restoredLink } = await ProtonWebSDK({
                        linkOptions: { endpoints: ['https://proton.greymass.com'] },
                        transportOptions: { requestStatus: false },
                        selectorOptions: {
                                                    appName: '11dice',
                                                    requestAccount: 'inchgame',
                                                },                        restoreSession: true, // Try to restore live session
                    });

                    if (restoredSession) {
                        setSession(restoredSession);
                        setLink(restoredLink);
                        localStorage.setItem('proton-session', JSON.stringify(restoredSession)); // Update localStorage with live session
                    } else {
                        // If live session couldn't be restored, clear local storage
                        localStorage.removeItem('proton-session');
                        setSession(null);
                        setLink(null);
                    }
                }
            } catch (e) {
                console.error("Session restore failed", e);
                localStorage.removeItem('proton-session'); // Clear on error
            }
        };
        restoreSession();
    }, []); // Run once on mount

    const login = async () => {
        try {
            const { session: newSession, link: newLink } = await ProtonWebSDK({
                linkOptions: { endpoints: ['https://proton.greymass.com'] },
                transportOptions: { requestStatus: false },
                selectorOptions: {
                    appName: '11dice',
                    appLogo: 'https://avatars.githubusercontent.com/u/6749354?s=200&v=4',
                    requestAccount: 'inchgame',
                },
            });
            setSession(newSession);
            setLink(newLink);
            localStorage.setItem('proton-session', JSON.stringify(newSession)); // Persist
        } catch (e) {
            console.error("Login failed", e);
        }
    };

    const logout = async () => {
        if (link && session) {
            try {
                await link.removeSession('11dice', session.auth, session.chainId);
                localStorage.removeItem('proton-session'); // Clear persistence
                setSession(null);
                setLink(null);
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
            const result = await session.transact({ actions });
            return result;
        } catch (e) {
            console.error("Transaction failed", e);
            throw e;
        }
    };

    return (
        <WalletContext.Provider value={{ session, link, login, logout, transact }}>
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